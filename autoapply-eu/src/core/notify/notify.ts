import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSecret, getSettings } from "@/lib/settings";
import { buildDailyReport, renderReportHtml, renderReportText } from "./report";

async function secretOrEnv(key: string) {
  return process.env[key] || (await getSecret(key).catch(() => undefined)) || "";
}

export async function getTransport() {
  const gmailRefresh = await secretOrEnv("GMAIL_REFRESH_TOKEN");
  const from = process.env.NOTIFY_FROM || (await secretOrEnv("SMTP_USER"));
  if (gmailRefresh) {
    return {
      from,
      transport: nodemailer.createTransport({
        service: "gmail",
        auth: { type: "OAuth2", user: from, clientId: await secretOrEnv("GMAIL_CLIENT_ID"), clientSecret: await secretOrEnv("GMAIL_CLIENT_SECRET"), refreshToken: gmailRefresh },
      }),
    };
  }
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: await secretOrEnv("SMTP_USER"), pass: await secretOrEnv("SMTP_PASS") },
    }),
  };
}

/** Sends at most once per dedupeKey. Recipient is always the candidate, never an employer. */
export async function sendOnce(dedupeKey: string, subject: string, text: string, html?: string): Promise<"SENT" | "DUPLICATE" | "DISABLED" | "ERROR"> {
  const settings = await getSettings();
  const to = settings.notifyEmail || process.env.NOTIFY_TO;
  if (!settings.notificationsEnabled || !to) return "DISABLED";
  try {
    await prisma.notificationLog.create({ data: { dedupeKey, channel: "email", subject, status: "PENDING" } });
  } catch {
    return "DUPLICATE";
  }
  const t = await getTransport();
  if (!t) {
    await prisma.notificationLog.update({ where: { dedupeKey }, data: { status: "ERROR", error: "No email transport configured" } });
    return "ERROR";
  }
  try {
    await t.transport.sendMail({ from: t.from, to, subject, text, html });
    await prisma.notificationLog.update({ where: { dedupeKey }, data: { status: "SENT" } });
    return "SENT";
  } catch (e) {
    await prisma.notificationLog.update({ where: { dedupeKey }, data: { status: "ERROR", error: e instanceof Error ? e.message : String(e) } });
    return "ERROR";
  }
}

export async function notifyManualAction(applicationId: string) {
  const app = await prisma.application.findUnique({ where: { id: applicationId }, include: { job: true } });
  if (!app || !app.manualReason) return "DISABLED";
  const j = app.job;
  const link = j.applyUrl ?? j.canonicalUrl;
  const text = [
    `Action needed: ${j.title} — ${j.company}`,
    `Location: ${[j.city, j.country].filter(Boolean).join(", ") || j.locationRaw}`,
    `Apply here: ${link}${j.applyUrl ? "" : " (original job URL; direct application URL unavailable)"}`,
    `Why: ${app.manualReason} — ${app.manualDetail ?? ""}`,
    `Prepared CV and cover letter: ${env.dashboardUrl}/manual#${app.id}`,
  ].join("\n");
  return sendOnce(`manual:${app.id}:${app.manualReason}:${app.attemptCount}`, `[AutoApply EU] Manual action: ${j.title} @ ${j.company}`, text);
}

export async function sendDailyReport(day = new Date()) {
  const report = await buildDailyReport(day);
  const key = `daily:${report.date}`;
  return { status: await sendOnce(key, `[AutoApply EU] Daily report ${report.date}`, renderReportText(report), renderReportHtml(report)), report };
}
