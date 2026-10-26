import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { getSettings, updateSettings } from "@/lib/settings";
import { recordEvent } from "./events";

export const QUEUE_NAMES = { pipeline: "aa-pipeline", documents: "aa-documents", apply: "aa-apply" } as const;

let conn: IORedis | null = null;
export function redis(): IORedis {
  if (!conn) conn = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  return conn;
}

const queues = new Map<string, Queue>();
export function queue(name: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redis(), defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 5000 } });
    queues.set(name, q);
  }
  return q;
}

export async function closeQueues() {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
  await conn?.quit().catch(() => undefined);
  conn = null;
}

export async function enqueueRun(trigger: "manual" | "schedule" | "discovery-only") {
  // One manual run per minute even if the button is clicked repeatedly.
  const slot = Math.floor(Date.now() / 60_000);
  return queue(QUEUE_NAMES.pipeline).add("run", { trigger }, { jobId: `run-${trigger}-${slot}`, attempts: 1 });
}

export async function enqueueDocuments(applicationId: string) {
  return queue(QUEUE_NAMES.documents).add("documents", { applicationId }, { jobId: `docs-${applicationId}`, attempts: 3, backoff: { type: "exponential", delay: 30_000 } });
}

export async function enqueueApply(applicationId: string, attemptCount: number, priority = 0) {
  // jobId includes the attempt number so a given attempt can only be queued once.
  return queue(QUEUE_NAMES.apply).add("apply", { applicationId }, { jobId: `apply-${applicationId}-${attemptCount}`, attempts: 1, priority: Math.max(1, 101 - priority) });
}

export async function syncSchedule() {
  const s = await getSettings();
  const q = queue(QUEUE_NAMES.pipeline);
  await q.upsertJobScheduler("daily-run", { pattern: s.schedule, tz: s.timezone }, { name: "run", data: { trigger: "schedule" } });
  await q.upsertJobScheduler("sweep", { every: 5 * 60_000 }, { name: "sweep", data: {} });
}

export async function nextScheduledRun(): Promise<Date | null> {
  const sched = await queue(QUEUE_NAMES.pipeline).getJobScheduler("daily-run").catch(() => null);
  return sched?.next ? new Date(sched.next) : null;
}

export async function setPaused(paused: boolean) {
  await updateSettings({ paused });
  for (const name of [QUEUE_NAMES.documents, QUEUE_NAMES.apply]) await (paused ? queue(name).pause() : queue(name).resume());
  await recordEvent(paused ? "control.paused" : "control.resumed", paused ? "Processing paused" : "Processing resumed");
}

export async function emergencyStop(engaged: boolean) {
  await updateSettings({ emergencyStop: engaged, ...(engaged ? { paused: true } : {}) });
  for (const q of Object.values(QUEUE_NAMES)) await (engaged ? queue(q).pause() : queue(q).resume());
  await recordEvent(engaged ? "control.emergency_stop" : "control.emergency_cleared", engaged ? "EMERGENCY STOP: all queues paused, no submissions will be made" : "Emergency stop cleared");
}

export async function queueCounts() {
  const out: Record<string, Record<string, number>> = {};
  for (const [k, n] of Object.entries(QUEUE_NAMES)) out[k] = await queue(n).getJobCounts("waiting", "active", "delayed", "failed", "prioritized");
  return out;
}

/** Atomically reserves the next submission slot for a domain. Returns ms to wait, or 0 if reserved now. */
export async function reserveApplyDomain(host: string, minIntervalMs: number): Promise<number> {
  const ok = await redis().set(`aa:apply-domain:${host}`, "1", "PX", Math.max(1, minIntervalMs), "NX");
  if (ok) return 0;
  const ttl = await redis().pttl(`aa:apply-domain:${host}`);
  return Math.max(1000, ttl);
}
