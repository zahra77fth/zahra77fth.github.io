import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { evaluateJob } from "./matching/match";
import { getApprovedProfile } from "./profile/service";
import { createApplication, transition } from "./state";
import { generateDocuments } from "./documents/service";
import { recordEvent } from "./events";

export async function matchJobs(opts: { runId?: string; reevaluate?: boolean } = {}) {
  const profile = await getApprovedProfile();
  if (!profile) return { evaluated: 0, eligible: 0, clarification: 0, excluded: 0, queued: 0, skippedNoProfile: true };
  const settings = await getSettings();
  const where = opts.reevaluate ? { status: { in: ["DISCOVERED", "NEEDS_CLARIFICATION", "EXCLUDED", "ELIGIBLE"] as ("DISCOVERED" | "NEEDS_CLARIFICATION" | "EXCLUDED" | "ELIGIBLE")[] } } : { status: "DISCOVERED" as const };
  const stats = { evaluated: 0, eligible: 0, clarification: 0, excluded: 0, queued: 0, skippedNoProfile: false };
  for (let cursor: string | undefined; ; ) {
    const batch = await prisma.job.findMany({ where, take: 200, orderBy: { id: "asc" }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!batch.length) break;
    cursor = batch[batch.length - 1].id;
    for (const job of batch) {
      const r = evaluateJob(job, profile, settings);
      stats.evaluated++;
      await prisma.job.update({
        where: { id: job.id },
        data: { status: r.status, matchScore: r.score, matchExplanation: JSON.parse(JSON.stringify(r)), eligibilityNote: r.exclusion ?? (r.flags.join("; ") || null) },
      });
      if (r.status === "ELIGIBLE") {
        stats.eligible++;
        const { created } = await createApplication(job.id, r.score, "matcher");
        if (created) stats.queued++;
        else await prisma.application.updateMany({ where: { jobId: job.id, state: "QUEUED" }, data: { priority: r.score } });
      } else if (r.status === "NEEDS_CLARIFICATION") stats.clarification++;
      else stats.excluded++;
    }
  }
  await recordEvent("pipeline.matched", `Evaluated ${stats.evaluated} jobs: ${stats.eligible} eligible, ${stats.clarification} need clarification, ${stats.excluded} excluded`, stats, { runId: opts.runId });
  return stats;
}

/** Candidate approves a "needs clarification" job: it joins the normal queue. */
export async function approveClarification(jobId: string) {
  const job = await prisma.job.update({ where: { id: jobId }, data: { status: "ELIGIBLE", eligibilityNote: "Approved by you after review" } });
  await createApplication(job.id, job.matchScore ?? 50, "user");
}

export async function prepareDocuments(applicationId: string, workerId: string) {
  const profile = await getApprovedProfile();
  if (!profile) throw new Error("Profile not approved");
  const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (app.state !== "QUEUED" && !(app.state === "RETRY_PENDING" && !app.resumePdfPath)) return false;
  const settings = await getSettings();
  const docs = await generateDocuments(applicationId, profile, settings);
  await transition(applicationId, {
    to: "DOCUMENTS_READY",
    from: app.state,
    reason: `Tailored CV and ${docs.coverLanguage.toUpperCase()} cover letter generated`,
    workerId,
    data: {
      resumePdfPath: docs.resumePdfPath,
      resumeDocxPath: docs.resumeDocxPath,
      coverPdfPath: docs.coverPdfPath,
      coverDocxPath: docs.coverDocxPath,
      coverTxtPath: docs.coverTxtPath,
      coverLanguage: docs.coverLanguage,
    },
  });
  return true;
}

export async function dueForApply(limit: number) {
  return prisma.application.findMany({
    where: {
      OR: [{ state: "DOCUMENTS_READY" }, { state: "RETRY_PENDING", resumePdfPath: { not: null }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }],
      job: { status: { notIn: ["EXPIRED", "DUPLICATE"] } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, attemptCount: true },
  });
}

export async function pendingDocuments(limit = 1000) {
  return prisma.application.findMany({ where: { OR: [{ state: "QUEUED" }, { state: "RETRY_PENDING", resumePdfPath: null }] }, orderBy: { priority: "desc" }, take: limit, select: { id: true } });
}

export async function resolveManual(applicationId: string, action: "APPLIED_MANUALLY" | "NOT_INTERESTED" | "RETRY", workerId = "user") {
  const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (action === "RETRY") {
    if (app.state === "SUBMISSION_UNCERTAIN") throw new Error("This application may already have been submitted; automatic retry is disabled to avoid a duplicate.");
    await transition(applicationId, { to: "RETRY_PENDING", reason: "Retry requested by you", workerId, data: { nextAttemptAt: new Date() }, manualReason: null, manualDetail: null });
    logger.info({ applicationId }, "manual retry requested");
    return;
  }
  await transition(applicationId, { to: action, reason: action === "APPLIED_MANUALLY" ? "You marked this as applied manually" : "You marked this as not interested", workerId, data: action === "APPLIED_MANUALLY" ? { submittedAt: new Date() } : {} });
}
