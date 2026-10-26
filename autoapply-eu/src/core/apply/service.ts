import path from "node:path";
import fs from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import type { ManualReason } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings, type Settings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { acquireApplyLock, transition } from "../state";
import { applicationDir } from "../documents/service";
import { getApprovedProfile } from "../profile/service";
import { recordEvent } from "../events";
import { notifyManualAction } from "../notify/notify";
import { runApplication, type EngineOutcome } from "./engine";
import { questionKey } from "./fields";

export const MAX_ATTEMPTS = 3;

export function isLocalUrl(url: string) {
  const h = new URL(url).hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function submissionAuthorized(settings: Settings, url: string): boolean {
  if (process.env.NODE_ENV === "test" && !isLocalUrl(url)) return false;
  return settings.autoSubmit && !settings.discoveryOnly && env.authorizeRealSubmissions && !settings.emergencyStop;
}

export function backoffMs(attempt: number) {
  return Math.min(6 * 3600_000, 5 * 60_000 * 2 ** Math.max(0, attempt - 1));
}

let sharedBrowser: Browser | null = null;
export async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) sharedBrowser = await chromium.launch({ headless: env.headless });
  return sharedBrowser;
}
export async function closeBrowser() {
  await sharedBrowser?.close().catch(() => undefined);
  sharedBrowser = null;
}

async function needsAction(appId: string, workerId: string, reason: ManualReason, detail: string, evidence?: Record<string, unknown>) {
  await transition(appId, { to: "NEEDS_ACTION", reason: `Manual action: ${reason}`, workerId, manualReason: reason, manualDetail: detail, evidence: evidence ? JSON.parse(JSON.stringify(evidence)) : undefined });
  await notifyManualAction(appId).catch((e) => logger.warn({ err: String(e) }, "manual-action notification failed"));
}

export async function applyOne(applicationId: string, workerId: string, browser?: Browser): Promise<EngineOutcome["outcome"] | "SKIPPED_LOCK" | "NO_PROFILE"> {
  const settings = await getSettings();
  const profile = await getApprovedProfile();
  if (!profile) return "NO_PROFILE";
  const attempt = await acquireApplyLock(applicationId, workerId);
  if (!attempt) return "SKIPPED_LOCK";
  const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { job: true } });
  const applyUrl = app.job.applyUrl ?? app.job.canonicalUrl;
  const dir = applicationDir(app.id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const shot = (name: string) => path.join(dir, `attempt-${attempt.attemptNumber}-${name}`);
  const saved = await prisma.screeningAnswer.findMany({ where: { verified: true, answer: { not: null } } });
  const coverText = app.coverTxtPath ? await fs.readFile(app.coverTxtPath, "utf8").catch(() => null) : null;

  const b = browser ?? (await getBrowser());
  const context = await b.newContext({ locale: "en-GB", acceptDownloads: false, viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  let result: EngineOutcome;
  try {
    result = await runApplication({
      page,
      applyUrl,
      autoSubmit: submissionAuthorized(settings, applyUrl),
      shouldStop: async () => (await getSettings()).emergencyStop,
      ctx: {
        profile,
        job: { company: app.job.company, title: app.job.title, country: app.job.country },
        resumePath: app.resumePdfPath!,
        coverPath: app.coverPdfPath,
        coverText: coverText?.split("\n").slice(2).join("\n") ?? null,
        savedAnswers: new Map(saved.map((s) => [s.questionKey, s.answer!])),
        acceptPrivacyNotices: settings.acceptPrivacyNotices,
      },
      beforeSubmitClick: async () => {
        await page.screenshot({ path: shot("before-submit.png"), fullPage: true }).catch(() => undefined);
        await prisma.applicationAttempt.update({ where: { id: attempt.id }, data: { submitClickedAt: new Date() } });
      },
    });
  } finally {
    await page.screenshot({ path: shot("final.png"), fullPage: true }).catch(() => undefined);
    await fs.writeFile(shot("final.html"), await page.content().catch(() => ""), { mode: 0o600 }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }

  const evidence = "evidence" in result ? result.evidence : undefined;
  await prisma.applicationAttempt.update({
    where: { id: attempt.id },
    data: {
      finishedAt: new Date(),
      outcome: result.outcome,
      adapter: new URL(applyUrl).hostname,
      error: "detail" in result ? result.detail : null,
      screenshotPath: shot("final.png"),
      htmlPath: shot("final.html"),
      evidence: evidence ? JSON.parse(JSON.stringify(evidence)) : undefined,
      log: JSON.parse(JSON.stringify(result.log)),
    },
  });

  const ev = { attempt: attempt.attemptNumber, screenshot: shot("final.png"), ...(evidence ?? {}) };
  switch (result.outcome) {
    case "SUBMITTED":
      await transition(app.id, {
        to: "SUBMITTED_VERIFIED",
        reason: `Confirmation detected: ${result.evidence.confirmationText ?? result.evidence.url}`,
        workerId,
        evidence: JSON.parse(JSON.stringify(ev)),
        manualReason: null,
        manualDetail: null,
        data: { submittedAt: new Date(), confirmationRef: result.evidence.reference },
      });
      await recordEvent("application.submitted", `Submitted ${app.job.title} @ ${app.job.company}`, { ref: result.evidence.reference }, { jobId: app.jobId });
      break;
    case "UNCERTAIN":
      await transition(app.id, { to: "SUBMISSION_UNCERTAIN", reason: result.detail, workerId, evidence: JSON.parse(JSON.stringify(ev)), manualReason: "SUBMISSION_UNCERTAIN", manualDetail: `${result.detail} Not retried automatically to avoid a duplicate application.` });
      await notifyManualAction(app.id).catch(() => undefined);
      break;
    case "READY_NOT_SUBMITTED":
      await needsAction(app.id, workerId, "AUTO_SUBMIT_DISABLED", "Form was filled and validated, but automatic submission is not authorized. Apply with the prepared documents.", ev);
      break;
    case "BLOCKED":
      for (const q of result.unknownQuestions ?? []) {
        await prisma.screeningAnswer.upsert({ where: { questionKey: questionKey(q.label) }, create: { questionKey: questionKey(q.label), question: q.label }, update: { lastSeenAt: new Date() } });
      }
      if (result.submitAttempted) await transition(app.id, { to: "SUBMISSION_UNCERTAIN", reason: result.detail, workerId, evidence: JSON.parse(JSON.stringify(ev)), manualReason: result.reason, manualDetail: result.detail });
      else await needsAction(app.id, workerId, result.reason, result.detail, ev);
      break;
    case "ERROR":
      if (result.submitAttempted) {
        await transition(app.id, { to: "SUBMISSION_UNCERTAIN", reason: `Error after submit click: ${result.detail}`, workerId, error: result.detail, manualReason: "SUBMISSION_UNCERTAIN", manualDetail: "An error occurred after the submit click. Verify before re-applying." });
      } else if (attempt.attemptNumber < MAX_ATTEMPTS) {
        await transition(app.id, { to: "RETRY_PENDING", reason: "Automation error before submit; will retry", workerId, error: result.detail, data: { nextAttemptAt: new Date(Date.now() + backoffMs(attempt.attemptNumber)) } });
      } else {
        await needsAction(app.id, workerId, "AUTOMATION_FAILURE", `Automation failed ${attempt.attemptNumber} times: ${result.detail}`, ev);
      }
      break;
  }
  return result.outcome;
}
