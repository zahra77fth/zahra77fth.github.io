"use server";

import fs from "node:fs/promises";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUser, hasAnyUser, login, logout, requireSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings, setSecret, updateSettings, type Settings } from "@/lib/settings";
import { emergencyStop, enqueueApply, enqueueRun, setPaused, syncSchedule } from "@/core/queue";
import { approveClarification, matchJobs, resolveManual } from "@/core/pipeline";
import { approveProfile, importCv, saveProfile } from "@/core/profile/service";
import { desktopDirectories, findCvFiles } from "@/core/cv/locate";
import { recordEvent } from "@/core/events";
import { questionKey } from "@/core/apply/fields";

export type ActionResult = { ok: boolean; message: string };

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!(await hasAnyUser())) {
    try {
      await createUser(username, password);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not create user" };
    }
  }
  const token = await login(username, password);
  if (!token) return { ok: false, message: "Invalid username or password" };
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect((await prisma.candidateProfile.count()) ? "/" : "/setup");
}

export async function logoutAction() {
  const jar = await cookies();
  await logout(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function runNowAction(mode: "manual" | "discovery-only" = "manual"): Promise<ActionResult> {
  await requireSession();
  const s = await getSettings();
  if (s.emergencyStop) return { ok: false, message: "Emergency stop is engaged" };
  await enqueueRun(mode);
  await recordEvent("control.run_now", mode === "discovery-only" ? "Discovery-only run requested" : "Run Now requested");
  revalidatePath("/");
  return { ok: true, message: mode === "discovery-only" ? "Discovery-only run queued. The worker will pick it up shortly." : "Run queued. The worker will pick it up shortly." };
}

export async function pauseAction(paused: boolean) {
  await requireSession();
  await setPaused(paused);
  revalidatePath("/", "layout");
}

export async function emergencyStopAction(engaged: boolean) {
  await requireSession();
  await emergencyStop(engaged);
  revalidatePath("/", "layout");
}

export async function manualAction(applicationId: string, action: "APPLIED_MANUALLY" | "NOT_INTERESTED" | "RETRY"): Promise<ActionResult> {
  await requireSession();
  try {
    await resolveManual(applicationId, action);
    if (action === "RETRY") {
      const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
      if (app.resumePdfPath) await enqueueApply(app.id, app.attemptCount, app.priority);
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/manual");
  revalidatePath("/applications");
  return { ok: true, message: "Updated" };
}

export async function approveClarificationAction(jobId: string) {
  await requireSession();
  await approveClarification(jobId);
  revalidatePath("/jobs");
}

export async function scanDesktopAction(): Promise<{ os: string; dirs: string[]; files: Awaited<ReturnType<typeof findCvFiles>> }> {
  await requireSession();
  const { os, dirs } = await desktopDirectories(env.desktopDir);
  return { os, dirs, files: await findCvFiles(dirs) };
}

export async function importCvAction(filePath: string): Promise<ActionResult> {
  await requireSession();
  const { dirs } = await desktopDirectories(env.desktopDir);
  const allowed = (await findCvFiles(dirs)).some((f) => f.path === filePath);
  if (!allowed) return { ok: false, message: "File is not one of the CVs found on your Desktop" };
  try {
    const { result } = await importCv(filePath);
    revalidatePath("/setup");
    return { ok: true, message: `Extracted profile (${result.method}). Missing: ${result.missing.join(", ") || "none"}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function uploadCvAction(form: FormData): Promise<ActionResult> {
  await requireSession();
  const file = form.get("cv");
  if (!(file instanceof File) || !/\.(pdf|docx)$/i.test(file.name)) return { ok: false, message: "Choose a PDF or DOCX file" };
  const dir = `${env.storageDir}/master-cv`;
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const dest = `${dir}/${file.name.replace(/[^\w.-]+/g, "_")}`;
  await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
  try {
    const { result } = await importCv(dest);
    revalidatePath("/setup");
    return { ok: true, message: `Extracted profile (${result.method}). Missing: ${result.missing.join(", ") || "none"}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveProfileAction(json: string): Promise<ActionResult> {
  await requireSession();
  try {
    await saveProfile(JSON.parse(json));
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/settings");
  revalidatePath("/setup");
  return { ok: true, message: "Saved. Review and approve the profile to use it." };
}

export async function approveProfileAction(): Promise<ActionResult> {
  await requireSession();
  try {
    await approveProfile();
    await matchJobs({ reevaluate: true });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile approved. Jobs were re-evaluated against it." };
}

export async function updateSettingsAction(patch: Partial<Settings>): Promise<ActionResult> {
  await requireSession();
  try {
    const before = await getSettings();
    const next = await updateSettings(patch);
    if (before.schedule !== next.schedule || before.timezone !== next.timezone) await syncSchedule();
    if (patch.autoSubmit !== undefined || patch.discoveryOnly !== undefined || patch.acceptPrivacyNotices !== undefined) {
      await recordEvent("settings.authorization", `Automatic submission ${next.autoSubmit && !next.discoveryOnly ? "ENABLED" : "disabled"}; privacy-notice consent ${next.acceptPrivacyNotices ? "authorized" : "not authorized"}`);
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved" };
}

export async function saveSecretAction(key: "LLM_API_KEY" | "SMTP_PASS" | "SMTP_USER" | "GMAIL_CLIENT_ID" | "GMAIL_CLIENT_SECRET" | "GMAIL_REFRESH_TOKEN", value: string): Promise<ActionResult> {
  await requireSession();
  if (!value.trim()) return { ok: false, message: "Value is empty" };
  await setSecret(key, value.trim());
  return { ok: true, message: `${key} stored encrypted` };
}

export async function answerQuestionAction(id: string, answer: string): Promise<ActionResult> {
  await requireSession();
  await prisma.screeningAnswer.update({ where: { id }, data: { answer: answer.trim() || null, verified: !!answer.trim() } });
  revalidatePath("/settings");
  return { ok: true, message: "Answer saved and marked verified" };
}

export async function addQuestionAction(question: string, answer: string): Promise<ActionResult> {
  await requireSession();
  const key = questionKey(question);
  await prisma.screeningAnswer.upsert({ where: { questionKey: key }, create: { questionKey: key, question, answer, verified: true }, update: { answer, verified: true } });
  revalidatePath("/settings");
  return { ok: true, message: "Saved" };
}

export async function deleteAllDataAction(confirm: string): Promise<ActionResult> {
  await requireSession();
  if (confirm !== "DELETE") return { ok: false, message: 'Type "DELETE" to confirm' };
  await emergencyStop(true);
  await prisma.$transaction([
    prisma.stateTransition.deleteMany(),
    prisma.applicationAttempt.deleteMany(),
    prisma.application.deleteMany(),
    prisma.job.deleteMany(),
    prisma.event.deleteMany(),
    prisma.pipelineRun.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.screeningAnswer.deleteMany(),
    prisma.candidateProfile.deleteMany(),
    prisma.secret.deleteMany(),
    prisma.source.deleteMany(),
  ]);
  await fs.rm(`${env.storageDir}/applications`, { recursive: true, force: true });
  await fs.rm(`${env.storageDir}/master-cv`, { recursive: true, force: true });
  return { ok: true, message: "All candidate data, jobs, applications, documents and secrets were deleted. Emergency stop engaged." };
}
