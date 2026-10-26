import fs from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { updateSettings } from "@/lib/settings";
import { applyOne } from "@/core/apply/service";
import { prepareDocuments, resolveManual } from "@/core/pipeline";
import { createApplication } from "@/core/state";
import { resetDb, seedApprovedProfile } from "../helpers/db";
import { startMockAts, type MockAts } from "../helpers/mockAts";
import { sampleProfile } from "../fixtures/sampleCv";

let ats: MockAts;
let browser: Browser;

beforeAll(async () => {
  process.env.AUTHORIZE_REAL_SUBMISSIONS = "true";
  ats = await startMockAts();
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
  process.env.AUTHORIZE_REAL_SUBMISSIONS = "false";
  await browser?.close();
  await ats?.close();
});
beforeEach(async () => {
  await resetDb();
  await seedApprovedProfile(sampleProfile());
  await updateSettings({ autoSubmit: true, discoveryOnly: false, acceptPrivacyNotices: true });
  for (const k of Object.keys(ats.submissions)) delete ats.submissions[k];
});

async function readyApp(scenario: string, title = "Frontend Developer") {
  const job = await prisma.job.create({
    data: {
      sourceId: "mock",
      externalId: scenario + Math.random(),
      canonicalUrl: `${ats.url}/${scenario}/job-${Math.random()}`,
      applyUrl: `${ats.url}/${scenario}/apply`,
      fingerprint: `fp-${scenario}-${Math.random()}`,
      company: "Acme",
      title,
      country: "DE",
      city: "Berlin",
      descriptionText: "React, TypeScript and Jest. Accessibility matters.",
      descriptionLang: "en",
      status: "ELIGIBLE",
    },
  });
  const { app } = await createApplication(job.id, 80, "test");
  await prepareDocuments(app.id, "test");
  return app.id;
}

describe("automatic submission against mock ATS", () => {
  it("submits a single-step form and stores verified evidence", async () => {
    const id = await readyApp("simple");
    expect(await applyOne(id, "w1", browser)).toBe("SUBMITTED");
    const app = await prisma.application.findUniqueOrThrow({ where: { id }, include: { attempts: true, transitions: true } });
    expect(app.state).toBe("SUBMITTED_VERIFIED");
    expect(app.confirmationRef).toBe("APP-1001");
    expect(ats.submissions.simple).toBe(1);
    const attempt = app.attempts[0];
    expect(attempt.submitClickedAt).not.toBeNull();
    expect((attempt.evidence as { confirmationText: string }).confirmationText).toMatch(/Application received|Thank you for applying/i);
    await expect(fs.stat(attempt.screenshotPath!)).resolves.toBeTruthy();
    expect(app.transitions.map((t) => t.toState)).toEqual(["QUEUED", "DOCUMENTS_READY", "APPLYING", "SUBMITTED_VERIFIED"]);
    for (const t of app.transitions) expect(t.workerId).toBeTruthy();
  });

  it("navigates multi-step forms with screening questions, dropdowns and radios", async () => {
    const id = await readyApp("multi", "React Engineer");
    expect(await applyOne(id, "w1", browser)).toBe("SUBMITTED");
    const attempt = await prisma.applicationAttempt.findFirstOrThrow({ where: { applicationId: id } });
    const log = attempt.log as { step: number; action: string; fields: { label: string; filled: boolean; source?: string }[] }[];
    expect(log.map((s) => s.action)).toEqual(["next step", "next step", "submit clicked"]);
    const step2 = log[1].fields;
    expect(step2.find((f) => /authorized/i.test(f.label))).toMatchObject({ filled: true, source: "profile.workAuthorization" });
    expect(step2.find((f) => /gender/i.test(f.label))).toMatchObject({ source: "voluntary self-identification declined" });
    expect(ats.submissions.multi).toBe(1);
  });

  it("never applies twice to the same position", async () => {
    const id = await readyApp("simple");
    await applyOne(id, "w1", browser);
    expect(await applyOne(id, "w2", browser)).toBe("SKIPPED_LOCK");
    await prisma.application.update({ where: { id }, data: { state: "RETRY_PENDING" } });
    expect(await applyOne(id, "w3", browser)).toBe("SKIPPED_LOCK");
    expect(ats.submissions.simple).toBe(1);
  });

  it("does not submit when automatic submission is not authorized, but prepares everything", async () => {
    await updateSettings({ autoSubmit: false });
    const id = await readyApp("simple");
    expect(await applyOne(id, "w1", browser)).toBe("READY_NOT_SUBMITTED");
    const app = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(app).toMatchObject({ state: "NEEDS_ACTION", manualReason: "AUTO_SUBMIT_DISABLED" });
    expect(app.resumePdfPath && app.coverPdfPath).toBeTruthy();
    expect(ats.submissions.simple ?? 0).toBe(0);
  });
});

describe("manual fallback", () => {
  it.each([
    ["captcha", "CAPTCHA"],
    ["login", "LOGIN_REQUIRED"],
    ["unknown", "UNKNOWN_SCREENING_QUESTION"],
  ])("%s → NEEDS_ACTION (%s) with direct link and documents", async (scenario, reason) => {
    const id = await readyApp(scenario);
    expect(await applyOne(id, "w1", browser)).toBe("BLOCKED");
    const app = await prisma.application.findUniqueOrThrow({ where: { id }, include: { job: true } });
    expect(app.state).toBe("NEEDS_ACTION");
    expect(app.manualReason).toBe(reason);
    expect(app.job.applyUrl).toBe(`${ats.url}/${scenario}/apply`);
    await expect(fs.stat(app.resumePdfPath!)).resolves.toBeTruthy();
    await expect(fs.stat(app.coverPdfPath!)).resolves.toBeTruthy();
    expect(ats.submissions[scenario] ?? 0).toBe(0);
  });

  it("saves unknown questions so a verified answer can be reused on retry", async () => {
    const id = await readyApp("unknown");
    await applyOne(id, "w1", browser);
    const q = await prisma.screeningAnswer.findFirstOrThrow({ where: { question: { contains: "design pattern" } } });
    expect(q.answer).toBeNull();
    await prisma.screeningAnswer.update({ where: { id: q.id }, data: { answer: "Composition over inheritance", verified: true } });
    await resolveManual(id, "RETRY");
    expect(await applyOne(id, "w1", browser)).toBe("SUBMITTED");
    expect(ats.submissions.unknown).toBe(1);
  });

  it("marks an unconfirmed submit as SUBMISSION_UNCERTAIN and refuses automatic retry", async () => {
    const id = await readyApp("silent");
    expect(await applyOne(id, "w1", browser)).toBe("UNCERTAIN");
    const app = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(app.state).toBe("SUBMISSION_UNCERTAIN");
    await expect(resolveManual(id, "RETRY")).rejects.toThrow(/duplicate/);
    await resolveManual(id, "APPLIED_MANUALLY");
    expect((await prisma.application.findUniqueOrThrow({ where: { id } })).state).toBe("APPLIED_MANUALLY");
    expect(ats.submissions.silent).toBe(1);
  });

  it("emergency stop prevents submission", async () => {
    const id = await readyApp("simple");
    await updateSettings({ emergencyStop: true });
    const outcome = await applyOne(id, "w1", browser);
    expect(outcome).not.toBe("SUBMITTED");
    expect(ats.submissions.simple ?? 0).toBe(0);
  });
});
