import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getSecret, getSettings, setSecret, SettingsSchema, updateSettings } from "@/lib/settings";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { sign, unsign } from "@/lib/auth";
import { ingestJobs, expireUnseen } from "@/core/discovery/ingest";
import { runDiscovery } from "@/core/discovery/run";
import type { RawJob, SourceAdapter } from "@/core/discovery/types";
import { matchJobs, prepareDocuments, dueForApply, resolveManual, approveClarification } from "@/core/pipeline";
import { acquireApplyLock, createApplication, recoverStaleLocks, transition, TransitionError } from "@/core/state";
import { backoffMs, applyOne } from "@/core/apply/service";
import { approveProfile, getApprovedProfile, importCv, saveProfile } from "@/core/profile/service";
import { closeQueues, emergencyStop, enqueueRun, nextScheduledRun, queue, QUEUE_NAMES, redis, syncSchedule } from "@/core/queue";
import { runPipeline, sweep } from "@/core/runner";
import { notifyManualAction, sendDailyReport } from "@/core/notify/notify";
import { buildDailyReport, renderReportText } from "@/core/notify/report";
import { resetDb, seedApprovedProfile } from "../helpers/db";
import { sampleCvDocx, sampleProfile } from "../fixtures/sampleCv";

const raw = (over: Partial<RawJob> = {}): RawJob => ({
  sourceId: "greenhouse:acme",
  externalId: "1",
  url: "https://job-boards.greenhouse.io/acme/jobs/1?gh_src=x",
  applyUrl: "https://job-boards.greenhouse.io/acme/jobs/1",
  company: "Acme",
  title: "Frontend Developer",
  locationRaw: "Berlin, Germany",
  descriptionText: "We build with React and TypeScript.",
  postedAt: new Date(),
  atsKind: "greenhouse",
  ...over,
});

beforeEach(async () => {
  await resetDb();
  await redis().flushdb();
});
afterAll(async () => {
  await closeQueues();
});

describe("ingestion, dedup and expiry", () => {
  it("stores in-scope jobs, ignores out-of-country ones, and updates on re-discovery", async () => {
    const s = await getSettings();
    const st = await ingestJobs([raw(), raw({ externalId: "2", url: "https://job-boards.greenhouse.io/acme/jobs/2", locationRaw: "New York, USA" })], s);
    expect(st).toMatchObject({ inScope: 1, outOfScope: 1, created: 1 });
    const again = await ingestJobs([raw({ descriptionText: "Now with Next.js" })], s);
    expect(again).toMatchObject({ created: 0, updated: 1 });
    const job = await prisma.job.findFirstOrThrow();
    expect(job).toMatchObject({ country: "DE", city: "Berlin", canonicalUrl: "https://job-boards.greenhouse.io/acme/jobs/1" });
    expect(job.techStack).toContain("Next.js");
  });

  it("detects the same position across sources and prefers the employer ATS record", async () => {
    const s = await getSettings();
    await ingestJobs([raw({ sourceId: "arbeitnow", externalId: "a1", url: "https://www.arbeitnow.com/jobs/acme/frontend", applyUrl: "https://www.arbeitnow.com/jobs/acme/frontend", atsKind: null, company: "Acme GmbH", title: "Frontend Developer (m/w/d)" })], s);
    await ingestJobs([raw()], s);
    const jobs = await prisma.job.findMany({ orderBy: { firstSeenAt: "asc" } });
    expect(jobs.map((j) => j.status)).toEqual(["DUPLICATE", "DISCOVERED"]);
    expect(jobs[0].duplicateOfId).toBe(jobs[1].id);
  });

  it("expires jobs a complete source no longer lists, and their queued applications", async () => {
    const s = await getSettings();
    await ingestJobs([raw()], s);
    const job = await prisma.job.findFirstOrThrow();
    await createApplication(job.id, 50, "t");
    expect(await expireUnseen("greenhouse:acme", new Date(Date.now() + 1000))).toBe(1);
    expect((await prisma.job.findFirstOrThrow()).status).toBe("EXPIRED");
    expect((await prisma.application.findFirstOrThrow()).state).toBe("EXPIRED");
  });

  it("records real source coverage, including blocked sources", async () => {
    const ok: SourceAdapter = { id: "fake:ok", kind: "greenhouse", name: "OK", discover: async () => ({ jobs: [raw()], fetched: 10, coverage: "OK" }) };
    const blocked: SourceAdapter = { id: "fake:blocked", kind: "board", name: "Blocked", discover: async () => ({ jobs: [], fetched: 0, coverage: "BLOCKED", notes: "HTTP 403" }) };
    const boom: SourceAdapter = { id: "fake:boom", kind: "board", name: "Boom", discover: async () => { throw new Error("network down"); } };
    const st = await runDiscovery({ sources: [ok, blocked, boom] });
    expect(st).toMatchObject({ sources: 3, sourcesOk: 1, sourcesBlocked: 1, sourcesError: 1, fetched: 10 });
    const rows = Object.fromEntries((await prisma.source.findMany()).map((r) => [r.id, r]));
    expect(rows["fake:blocked"]).toMatchObject({ coverage: "BLOCKED", lastError: "HTTP 403" });
    expect(rows["fake:boom"]).toMatchObject({ coverage: "ERROR", lastError: "network down" });
    expect(await prisma.event.count({ where: { type: "source.problem" } })).toBe(2);
  });
});

describe("profile verification flow", () => {
  it("imports a CV, requires approval, and resets approval on edit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cv-"));
    const file = path.join(dir, "Alex_CV.docx");
    const bytes = await sampleCvDocx();
    await fs.writeFile(file, bytes);
    const { result } = await importCv(file);
    expect(result.profile.fullName).toBe("Alex Example");
    expect(await getApprovedProfile()).toBeNull();
    await approveProfile();
    expect((await getApprovedProfile())?.email).toBe("alex.example@example.com");
    await saveProfile({ ...result.profile, phone: "+49 30 1234567" });
    expect(await getApprovedProfile()).toBeNull();
    expect(Buffer.compare(await fs.readFile(file), bytes)).toBe(0);
  });
});

describe("matching and queueing", () => {
  it("queues every eligible job with score-based priority, and keeps clarifications visible", async () => {
    await seedApprovedProfile(sampleProfile());
    const s = await getSettings();
    await ingestJobs(
      [
        raw(),
        raw({ externalId: "2", url: "https://job-boards.greenhouse.io/acme/jobs/2", title: "Angular Developer", descriptionText: "Angular, RxJS, Kotlin" }),
        raw({ externalId: "3", url: "https://job-boards.greenhouse.io/acme/jobs/3", title: "Frontend Ontwikkelaar", locationRaw: "Utrecht", descriptionText: "Wij zoeken een developer voor ons team die met React werkt en van het bouwen houdt bij onze klanten" }),
        raw({ externalId: "4", url: "https://job-boards.greenhouse.io/acme/jobs/4", title: "Backend Engineer", descriptionText: "Java" }),
      ],
      s,
    );
    const st = await matchJobs();
    expect(st).toMatchObject({ evaluated: 4, eligible: 2, clarification: 1, excluded: 1, queued: 2 });
    const apps = await prisma.application.findMany({ include: { job: true }, orderBy: { priority: "desc" } });
    expect(apps.map((a) => a.job.title)).toEqual(["Frontend Developer", "Angular Developer"]);
    const clar = await prisma.job.findFirstOrThrow({ where: { status: "NEEDS_CLARIFICATION" } });
    await approveClarification(clar.id);
    expect(await prisma.application.count()).toBe(3);
    expect((await matchJobs()).queued).toBe(0);
  });

  it("does nothing without an approved profile", async () => {
    await ingestJobs([raw()], await getSettings());
    expect((await matchJobs()).skippedNoProfile).toBe(true);
  });
});

describe("state machine, idempotency and recovery", () => {
  async function readyApp() {
    await seedApprovedProfile(sampleProfile());
    await ingestJobs([raw()], await getSettings());
    const job = await prisma.job.findFirstOrThrow();
    const { app } = await createApplication(job.id, 70, "t");
    await prepareDocuments(app.id, "t");
    return app.id;
  }

  it("records every transition with timestamp, states, attempt and worker", async () => {
    const id = await readyApp();
    const tr = await prisma.stateTransition.findMany({ where: { applicationId: id }, orderBy: { createdAt: "asc" } });
    expect(tr.map((t) => [t.fromState, t.toState])).toEqual([[null, "QUEUED"], ["QUEUED", "DOCUMENTS_READY"]]);
    expect(tr[1]).toMatchObject({ workerId: "t", attemptNumber: 0 });
    expect(tr[1].reason).toMatch(/cover letter/);
    await expect(transition(id, { to: "SUBMITTED_VERIFIED", reason: "x", workerId: "t" })).rejects.toBeInstanceOf(TransitionError);
  });

  it("grants the submission lock to exactly one of many concurrent workers", async () => {
    const id = await readyApp();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => acquireApplyLock(id, `w${i}`).catch(() => null)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const app = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(app).toMatchObject({ state: "APPLYING", attemptCount: 1 });
    expect(await prisma.applicationAttempt.count({ where: { applicationId: id } })).toBe(1);
  });

  it("recovers a crash before submit as RETRY_PENDING and after submit click as SUBMISSION_UNCERTAIN", async () => {
    const id = await readyApp();
    const a1 = await acquireApplyLock(id, "crashy");
    expect(a1).not.toBeNull();
    expect(await recoverStaleLocks(0, "recovery")).toEqual({ retried: 1, uncertain: 0 });
    expect((await prisma.application.findUniqueOrThrow({ where: { id } })).state).toBe("RETRY_PENDING");
    const a2 = await acquireApplyLock(id, "crashy");
    await prisma.applicationAttempt.update({ where: { id: a2!.id }, data: { submitClickedAt: new Date() } });
    expect(await recoverStaleLocks(0, "recovery")).toEqual({ retried: 0, uncertain: 1 });
    const app = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(app).toMatchObject({ state: "SUBMISSION_UNCERTAIN", manualReason: "SUBMISSION_UNCERTAIN" });
    expect(await acquireApplyLock(id, "again")).toBeNull();
  });

  it("schedules retries with exponential backoff and respects nextAttemptAt", async () => {
    expect(backoffMs(1)).toBe(5 * 60_000);
    expect(backoffMs(2)).toBe(10 * 60_000);
    expect(backoffMs(10)).toBe(6 * 3600_000);
    const id = await readyApp();
    await acquireApplyLock(id, "w");
    await transition(id, { to: "RETRY_PENDING", reason: "err", workerId: "w", data: { nextAttemptAt: new Date(Date.now() + 60_000) } });
    expect(await dueForApply(10)).toHaveLength(0);
    await prisma.application.update({ where: { id }, data: { nextAttemptAt: new Date(Date.now() - 1) } });
    expect(await dueForApply(10)).toHaveLength(1);
  });

  it("refuses to submit a position already submitted through another listing", async () => {
    const id = await readyApp();
    const job = await prisma.job.findFirstOrThrow();
    const twinJob = await prisma.job.create({ data: { ...job, id: undefined, matchExplanation: undefined, rawData: undefined, sourceId: "other", externalId: "x", canonicalUrl: "https://other/x", createdAt: undefined, updatedAt: undefined } });
    const { app: twin } = await createApplication(twinJob.id, 50, "t");
    await prisma.application.update({ where: { id: twin.id }, data: { state: "SUBMITTED_VERIFIED" } });
    expect(await acquireApplyLock(id, "w")).toBeNull();
    expect((await prisma.application.findUniqueOrThrow({ where: { id } })).state).toBe("DUPLICATE");
  });

  it("manual queue actions are persisted and terminal", async () => {
    const id = await readyApp();
    await transition(id, { to: "NEEDS_ACTION", reason: "captcha", workerId: "w", manualReason: "CAPTCHA", manualDetail: "x" });
    await resolveManual(id, "NOT_INTERESTED");
    expect((await prisma.application.findUniqueOrThrow({ where: { id } })).state).toBe("NOT_INTERESTED");
  });

  it("does not apply without an approved profile", async () => {
    const id = await readyApp();
    await prisma.candidateProfile.update({ where: { id: "singleton" }, data: { approvedAt: null } });
    expect(await applyOne(id, "w")).toBe("NO_PROFILE");
  });
});

describe("scheduling, controls and notifications", () => {
  it("registers the configurable daily schedule in Redis", async () => {
    await updateSettings({ schedule: "15 6 * * *", timezone: "Europe/Amsterdam" });
    await syncSchedule();
    const sched = await queue(QUEUE_NAMES.pipeline).getJobScheduler("daily-run");
    expect(sched?.pattern).toBe("15 6 * * *");
    const next = await nextScheduledRun();
    expect(next).toBeInstanceOf(Date);
    expect(next!.getTime()).toBeGreaterThan(Date.now());
    expect(next!.getTime() - Date.now()).toBeLessThanOrEqual(86400_000 + 3600_000);
  });

  it("dedupes Run Now clicks", async () => {
    const a = await enqueueRun("manual");
    const b = await enqueueRun("manual");
    expect(a.id).toBe(b.id);
  });

  it("emergency stop pauses all queues and skips runs and sweeps", async () => {
    await emergencyStop(true);
    expect(await queue(QUEUE_NAMES.apply).isPaused()).toBe(true);
    expect((await getSettings()).emergencyStop).toBe(true);
    expect(await runPipeline("manual", "t")).toBeNull();
    expect(await sweep("t")).toMatchObject({ docs: 0, apply: 0 });
    await emergencyStop(false);
    expect(await queue(QUEUE_NAMES.apply).isPaused()).toBe(false);
  });

  it("sends manual-action and daily emails once, from real data", async () => {
    await updateSettings({ notificationsEnabled: true, notifyEmail: "me@example.com" });
    await seedApprovedProfile(sampleProfile());
    await ingestJobs([raw()], await getSettings());
    const job = await prisma.job.findFirstOrThrow();
    const { app } = await createApplication(job.id, 70, "t");
    await transition(app.id, { to: "NEEDS_ACTION", reason: "x", workerId: "t", manualReason: "CAPTCHA", manualDetail: "captcha shown" });
    expect(await notifyManualAction(app.id)).toBe("SENT");
    expect(await notifyManualAction(app.id)).toBe("DUPLICATE");
    const r = await buildDailyReport();
    expect(r.newJobs).toBe(1);
    expect(r.manual[0]).toMatchObject({ company: "Acme", link: "https://job-boards.greenhouse.io/acme/jobs/1", directLink: true, reason: "CAPTCHA" });
    expect(renderReportText(r)).toContain("Apply: https://job-boards.greenhouse.io/acme/jobs/1");
    expect((await sendDailyReport()).status).toBe("SENT");
    expect((await sendDailyReport()).status).toBe("DUPLICATE");
  });
});

describe("security primitives", () => {
  it("encrypts secrets at rest and hashes passwords", async () => {
    await setSecret("LLM_API_KEY", "sk-test-123");
    const row = await prisma.secret.findUniqueOrThrow({ where: { key: "LLM_API_KEY" } });
    expect(row.ciphertext).not.toContain("sk-test");
    expect(await getSecret("LLM_API_KEY")).toBe("sk-test-123");
    const h = hashPassword("correct horse battery");
    expect(h).not.toContain("correct");
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(unsign(sign("abc"))).toBe("abc");
    expect(unsign(sign("abc") + "x")).toBeNull();
    expect(SettingsSchema.parse({}).autoSubmit).toBe(false);
  });
});
