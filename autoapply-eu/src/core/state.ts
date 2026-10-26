import type { ApplicationState, ManualReason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ALLOWED: Record<ApplicationState, ApplicationState[]> = {
  QUEUED: ["DOCUMENTS_READY", "NEEDS_ACTION", "FAILED", "EXPIRED", "SKIPPED", "DUPLICATE", "RETRY_PENDING", "NOT_INTERESTED", "APPLIED_MANUALLY"],
  DOCUMENTS_READY: ["APPLYING", "NEEDS_ACTION", "EXPIRED", "SKIPPED", "DUPLICATE", "NOT_INTERESTED", "APPLIED_MANUALLY", "QUEUED"],
  APPLYING: ["SUBMITTED_VERIFIED", "SUBMISSION_UNCERTAIN", "NEEDS_ACTION", "RETRY_PENDING", "FAILED"],
  RETRY_PENDING: ["APPLYING", "QUEUED", "DOCUMENTS_READY", "NEEDS_ACTION", "FAILED", "EXPIRED", "NOT_INTERESTED", "APPLIED_MANUALLY"],
  SUBMISSION_UNCERTAIN: ["SUBMITTED_VERIFIED", "APPLIED_MANUALLY", "NEEDS_ACTION", "NOT_INTERESTED"],
  NEEDS_ACTION: ["APPLIED_MANUALLY", "NOT_INTERESTED", "RETRY_PENDING", "QUEUED"],
  FAILED: ["RETRY_PENDING", "QUEUED", "APPLIED_MANUALLY", "NOT_INTERESTED", "NEEDS_ACTION"],
  EXPIRED: ["QUEUED", "NOT_INTERESTED"],
  SKIPPED: ["QUEUED"],
  DUPLICATE: [],
  SUBMITTED_VERIFIED: [],
  APPLIED_MANUALLY: [],
  NOT_INTERESTED: ["QUEUED"],
};

export const ACTIVE_STATES: ApplicationState[] = ["QUEUED", "DOCUMENTS_READY", "APPLYING", "RETRY_PENDING"];
export const MANUAL_STATES: ApplicationState[] = ["NEEDS_ACTION", "SUBMISSION_UNCERTAIN", "FAILED"];
export const SUBMITTED_STATES: ApplicationState[] = ["SUBMITTED_VERIFIED", "APPLIED_MANUALLY", "SUBMISSION_UNCERTAIN"];

export class TransitionError extends Error {}

export interface TransitionInput {
  to: ApplicationState;
  reason: string;
  workerId: string;
  from?: ApplicationState | ApplicationState[];
  error?: string;
  evidence?: Prisma.InputJsonValue;
  manualReason?: ManualReason | null;
  manualDetail?: string | null;
  data?: Prisma.ApplicationUpdateManyMutationInput;
}

/** Atomically moves an application between states; fails if another worker changed it first. */
export async function transition(applicationId: string, input: TransitionInput, tx: Prisma.TransactionClient = prisma) {
  const run = async (t: Prisma.TransactionClient) => {
    const app = await t.application.findUniqueOrThrow({ where: { id: applicationId } });
    const expected = input.from ? (Array.isArray(input.from) ? input.from : [input.from]) : [app.state];
    if (!expected.includes(app.state)) throw new TransitionError(`Application ${applicationId} is ${app.state}, expected ${expected.join("|")}`);
    if (app.state !== input.to && !ALLOWED[app.state].includes(input.to)) throw new TransitionError(`Illegal transition ${app.state} → ${input.to}`);
    const res = await t.application.updateMany({
      where: { id: applicationId, state: app.state, updatedAt: app.updatedAt },
      data: {
        ...input.data,
        state: input.to,
        ...(input.manualReason !== undefined ? { manualReason: input.manualReason } : {}),
        ...(input.manualDetail !== undefined ? { manualDetail: input.manualDetail } : {}),
        ...(["APPLYING"].includes(input.to) ? {} : { lockedBy: null, lockedAt: null }),
      },
    });
    if (res.count !== 1) throw new TransitionError(`Concurrent update on application ${applicationId}`);
    await t.stateTransition.create({
      data: {
        applicationId,
        fromState: app.state,
        toState: input.to,
        attemptNumber: app.attemptCount,
        reason: input.reason,
        error: input.error,
        evidence: input.evidence,
        workerId: input.workerId,
      },
    });
    return app.state;
  };
  return tx === prisma ? prisma.$transaction(run) : run(tx);
}

export async function createApplication(jobId: string, priority: number, workerId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.application.findUnique({ where: { jobId } });
    if (existing) return { app: existing, created: false };
    const app = await tx.application.create({ data: { jobId, priority, state: "QUEUED" } });
    await tx.stateTransition.create({ data: { applicationId: app.id, fromState: null, toState: "QUEUED", reason: "Eligible job queued", workerId } });
    return { app, created: true };
  });
}

/**
 * Takes the per-application submission lock. Returns the attempt record, or null when another
 * worker holds it, the state is not submittable, or this position was already submitted elsewhere.
 */
export async function acquireApplyLock(applicationId: string, workerId: string) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUniqueOrThrow({ where: { id: applicationId }, include: { job: true } });
    if (!["DOCUMENTS_READY", "RETRY_PENDING"].includes(app.state)) return null;
    const prior = await tx.applicationAttempt.findFirst({ where: { applicationId, OR: [{ submitClickedAt: { not: null } }, { outcome: "SUBMITTED" }] } });
    if (prior) return null;
    const twin = await tx.application.findFirst({
      where: { id: { not: app.id }, state: { in: SUBMITTED_STATES }, job: { fingerprint: app.job.fingerprint } },
    });
    if (twin) {
      await transition(app.id, { to: app.state === "DOCUMENTS_READY" ? "DUPLICATE" : "NEEDS_ACTION", reason: `Same position already submitted via application ${twin.id}`, workerId, manualReason: "SUBMISSION_UNCERTAIN" }, tx).catch(() => undefined);
      return null;
    }
    const attemptNumber = app.attemptCount + 1;
    const res = await tx.application.updateMany({
      where: { id: app.id, state: app.state, updatedAt: app.updatedAt },
      data: { state: "APPLYING", lockedBy: workerId, lockedAt: new Date(), attemptCount: attemptNumber },
    });
    if (res.count !== 1) return null;
    await tx.stateTransition.create({ data: { applicationId: app.id, fromState: app.state, toState: "APPLYING", attemptNumber, reason: "Submission lock acquired", workerId } });
    return tx.applicationAttempt.create({ data: { applicationId: app.id, attemptNumber, idempotencyKey: `${app.id}:${attemptNumber}`, workerId } });
  });
}

/** Resolves applications left in APPLYING by a crashed worker without risking a double submission. */
export async function recoverStaleLocks(staleMs: number, workerId: string): Promise<{ retried: number; uncertain: number }> {
  const stale = await prisma.application.findMany({ where: { state: "APPLYING", OR: [{ lockedAt: { lt: new Date(Date.now() - staleMs) } }, { lockedAt: null }] } });
  let retried = 0;
  let uncertain = 0;
  for (const app of stale) {
    const attempt = await prisma.applicationAttempt.findFirst({ where: { applicationId: app.id }, orderBy: { attemptNumber: "desc" } });
    if (attempt && !attempt.finishedAt) await prisma.applicationAttempt.update({ where: { id: attempt.id }, data: { finishedAt: new Date(), outcome: "CRASHED" } });
    if (attempt?.submitClickedAt) {
      await transition(app.id, { to: "SUBMISSION_UNCERTAIN", from: "APPLYING", reason: "Worker stopped after the submit click; outcome unknown — not retried automatically", workerId, manualReason: "SUBMISSION_UNCERTAIN", manualDetail: "Check your inbox or the employer portal before re-applying." }).catch(() => undefined);
      uncertain++;
    } else {
      await transition(app.id, { to: "RETRY_PENDING", from: "APPLYING", reason: "Worker stopped before submitting; safe to retry", workerId, data: { nextAttemptAt: new Date() } }).catch(() => undefined);
      retried++;
    }
  }
  return { retried, uncertain };
}
