import os from "node:os";
import { DelayedError, Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { QUEUE_NAMES, closeQueues, redis, reserveApplyDomain, syncSchedule } from "@/core/queue";
import { runPipeline, sweep } from "@/core/runner";
import { prepareDocuments } from "@/core/pipeline";
import { applyOne, closeBrowser } from "@/core/apply/service";
import { recoverStaleLocks, transition } from "@/core/state";

const workerId = `${os.hostname()}:${process.pid}`;

async function main() {
  await prisma.$connect();
  // Threshold equals the apply lockDuration so a second live worker's attempt is never taken over.
  const recovered = await recoverStaleLocks(10 * 60_000, workerId);
  logger.info({ workerId, recovered }, "worker starting");
  await syncSchedule();

  const pipeline = new Worker(
    QUEUE_NAMES.pipeline,
    async (job: Job) => {
      if (job.name === "sweep") return sweep(workerId);
      return runPipeline(job.data.trigger, workerId);
    },
    { connection: redis(), concurrency: 1, lockDuration: 5 * 60_000 },
  );

  const documents = new Worker(
    QUEUE_NAMES.documents,
    async (job: Job) => {
      try {
        return await prepareDocuments(job.data.applicationId, workerId);
      } catch (e) {
        if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
          await transition(job.data.applicationId, { to: "NEEDS_ACTION", reason: "Document generation failed", workerId, error: e instanceof Error ? e.message : String(e), manualReason: "AUTOMATION_FAILURE", manualDetail: "Tailored documents could not be generated; apply with your master CV." }).catch(() => undefined);
        }
        throw e;
      }
    },
    { connection: redis(), concurrency: env.processConcurrency },
  );

  const apply = new Worker(
    QUEUE_NAMES.apply,
    async (job: Job, token?: string) => {
      const settings = await getSettings();
      if (settings.emergencyStop) return "EMERGENCY_STOP";
      const app = await prisma.application.findUnique({ where: { id: job.data.applicationId }, include: { job: true } });
      if (!app) return "MISSING";
      const host = new URL(app.job.applyUrl ?? app.job.canonicalUrl).hostname;
      const wait = await reserveApplyDomain(host, settings.applyDomainMinIntervalMs);
      if (wait > 0 && token) {
        await job.moveToDelayed(Date.now() + wait, token);
        throw new DelayedError();
      }
      return applyOne(app.id, workerId);
    },
    { connection: redis(), concurrency: env.applyConcurrency, lockDuration: 10 * 60_000 },
  );

  for (const w of [pipeline, documents, apply]) {
    w.on("failed", (job, err) => logger.warn({ queue: w.name, jobId: job?.id, err: err.message }, "job failed"));
  }

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "graceful shutdown: finishing active jobs");
    await Promise.all([pipeline.close(), documents.close(), apply.close()]);
    await closeBrowser();
    await closeQueues();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  logger.fatal({ err: e instanceof Error ? e.message : String(e) }, "worker crashed");
  process.exit(1);
});
