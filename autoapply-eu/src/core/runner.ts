import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { runDiscovery } from "./discovery/run";
import { matchJobs, pendingDocuments, dueForApply } from "./pipeline";
import { enqueueApply, enqueueDocuments, queue, QUEUE_NAMES } from "./queue";
import { recordEvent } from "./events";
import { recoverStaleLocks } from "./state";
import { sendDailyReport } from "./notify/notify";

/** DISCOVER → NORMALIZE → DEDUPLICATE → MATCH → (documents & apply via queues) → VERIFY → REPORT */
export async function runPipeline(trigger: string, workerId: string, opts: { waitForQueuesMs?: number } = {}) {
  const settings = await getSettings();
  if (settings.emergencyStop) {
    await recordEvent("pipeline.skipped", `Run (${trigger}) skipped: emergency stop engaged`);
    return null;
  }
  if (settings.paused && trigger === "schedule") {
    await recordEvent("pipeline.skipped", "Scheduled run skipped: processing is paused");
    return null;
  }
  const run = await prisma.pipelineRun.create({ data: { trigger } });
  await recordEvent("pipeline.started", `Pipeline run started (${trigger})`, undefined, { runId: run.id });
  try {
    const discovery = await runDiscovery({ runId: run.id });
    const matching = await matchJobs({ runId: run.id });
    let docsQueued = 0;
    let applyQueued = 0;
    if (trigger !== "discovery-only" && !settings.discoveryOnly) {
      for (const a of await pendingDocuments()) {
        await enqueueDocuments(a.id);
        docsQueued++;
      }
      for (const a of await dueForApply(settings.maxApplicationsPerRun)) {
        await enqueueApply(a.id, a.attemptCount);
        applyQueued++;
      }
    } else {
      // Discovery-only mode still prepares documents so the manual queue has them ready.
      for (const a of await pendingDocuments()) {
        await enqueueDocuments(a.id);
        docsQueued++;
      }
    }
    const waitUntil = Date.now() + (opts.waitForQueuesMs ?? 2 * 3600_000);
    while (Date.now() < waitUntil) {
      const [d, a] = await Promise.all([queue(QUEUE_NAMES.documents).getJobCounts("waiting", "active", "prioritized"), queue(QUEUE_NAMES.apply).getJobCounts("waiting", "active", "prioritized")]);
      if (!d.waiting && !d.active && !d.prioritized && !a.waiting && !a.active && !a.prioritized) break;
      if ((await getSettings()).emergencyStop) break;
      await new Promise((r) => setTimeout(r, 5000));
    }
    const stats = { discovery, matching, docsQueued, applyQueued };
    const report = await sendDailyReport();
    await prisma.pipelineRun.update({ where: { id: run.id }, data: { status: "COMPLETED", finishedAt: new Date(), stats: JSON.parse(JSON.stringify({ ...stats, report: report.status })) } });
    await recordEvent("pipeline.completed", `Run complete: ${discovery.ingest.created} new jobs, ${matching.queued} newly queued, ${applyQueued} sent to apply`, undefined, { runId: run.id });
    return stats;
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e) }, "pipeline failed");
    await prisma.pipelineRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: e instanceof Error ? e.message : String(e) } });
    await recordEvent("pipeline.failed", `Run failed: ${e instanceof Error ? e.message : String(e)}`, undefined, { runId: run.id });
    throw e;
  }
}

/** Periodic safety net: recovers crashed attempts and re-dispatches the durable backlog from the database. */
export async function sweep(workerId: string) {
  const settings = await getSettings();
  const recovered = await recoverStaleLocks(15 * 60_000, workerId);
  if (settings.emergencyStop || settings.paused) return { recovered, docs: 0, apply: 0 };
  let docs = 0;
  let apply = 0;
  for (const a of await pendingDocuments(200)) {
    await enqueueDocuments(a.id);
    docs++;
  }
  if (!settings.discoveryOnly) {
    for (const a of await dueForApply(settings.maxApplicationsPerRun)) {
      await enqueueApply(a.id, a.attemptCount);
      apply++;
    }
  }
  return { recovered, docs, apply };
}
