import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ACTIVE_STATES, MANUAL_STATES } from "../state";

export interface DailyReport {
  date: string;
  newJobs: number;
  eligibleNew: number;
  submittedVerified: number;
  awaitingVerification: number;
  manual: { id: string; company: string; title: string; location: string; link: string; directLink: boolean; reason: string; detail: string }[];
  failed: number;
  backlog: number;
  sourceProblems: { name: string; coverage: string; error: string | null }[];
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function buildDailyReport(day = new Date()): Promise<DailyReport> {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const end = new Date(start.getTime() + 86400_000);
  const [newJobs, eligibleNew, submittedVerified, awaitingVerification, manualApps, failed, backlog, sources] = await Promise.all([
    prisma.job.count({ where: { firstSeenAt: { gte: start, lt: end } } }),
    prisma.job.count({ where: { firstSeenAt: { gte: start, lt: end }, status: "ELIGIBLE" } }),
    prisma.application.count({ where: { state: "SUBMITTED_VERIFIED", submittedAt: { gte: start, lt: end } } }),
    prisma.application.count({ where: { state: "SUBMISSION_UNCERTAIN" } }),
    prisma.application.findMany({ where: { state: { in: MANUAL_STATES } }, include: { job: true }, orderBy: { priority: "desc" }, take: 500 }),
    prisma.application.count({ where: { state: "FAILED" } }),
    prisma.application.count({ where: { state: { in: ACTIVE_STATES } } }),
    prisma.source.findMany({ where: { coverage: { in: ["ERROR", "BLOCKED"] }, kind: { not: "restricted" } } }),
  ]);
  return {
    date: start.toISOString().slice(0, 10),
    newJobs,
    eligibleNew,
    submittedVerified,
    awaitingVerification,
    manual: manualApps.map((a) => ({
      id: a.id,
      company: a.job.company,
      title: a.job.title,
      location: [a.job.city, a.job.country].filter(Boolean).join(", ") || a.job.locationRaw || "",
      link: a.job.applyUrl ?? a.job.canonicalUrl,
      directLink: !!a.job.applyUrl,
      reason: a.manualReason ?? a.state,
      detail: a.manualDetail ?? "",
    })),
    failed,
    backlog,
    sourceProblems: sources.map((s) => ({ name: s.name, coverage: s.coverage, error: s.lastError })),
  };
}

export function renderReportText(r: DailyReport): string {
  return [
    `AutoApply EU — ${r.date}`,
    `New jobs discovered: ${r.newJobs}`,
    `New eligible jobs: ${r.eligibleNew}`,
    `Submitted & verified today: ${r.submittedVerified}`,
    `Awaiting verification (uncertain outcome): ${r.awaitingVerification}`,
    `Needs manual action: ${r.manual.length}`,
    `Failed: ${r.failed}`,
    `Pending backlog: ${r.backlog}`,
    "",
    "MANUAL APPLICATIONS",
    ...r.manual.map((m) => `- ${m.title} — ${m.company} (${m.location})\n  Apply: ${m.link}${m.directLink ? "" : " [original job URL]"}\n  Reason: ${m.reason} ${m.detail}\n  Documents: ${env.dashboardUrl}/manual#${m.id}`),
    "",
    "SOURCE COVERAGE PROBLEMS",
    ...(r.sourceProblems.length ? r.sourceProblems.map((s) => `- ${s.name}: ${s.coverage} ${s.error ?? ""}`) : ["none"]),
  ].join("\n");
}

export function renderReportHtml(r: DailyReport): string {
  const rows = r.manual
    .map((m) => `<tr><td>${esc(m.company)}</td><td>${esc(m.title)}</td><td>${esc(m.location)}</td><td><a href="${esc(m.link)}">${m.directLink ? "Apply" : "Job page"}</a></td><td>${esc(m.reason)}</td><td><a href="${esc(env.dashboardUrl)}/manual#${m.id}">Documents</a></td></tr>`)
    .join("");
  return `<h2>AutoApply EU — ${r.date}</h2>
<ul><li>New jobs: ${r.newJobs}</li><li>New eligible: ${r.eligibleNew}</li><li>Submitted &amp; verified today: ${r.submittedVerified}</li><li>Awaiting verification: ${r.awaitingVerification}</li><li>Needs manual action: ${r.manual.length}</li><li>Failed: ${r.failed}</li><li>Backlog: ${r.backlog}</li></ul>
<h3>Manual applications</h3><table border="1" cellpadding="4" cellspacing="0"><tr><th>Company</th><th>Title</th><th>Location</th><th>Link</th><th>Reason</th><th>Docs</th></tr>${rows}</table>
<h3>Source coverage problems</h3><ul>${r.sourceProblems.map((s) => `<li>${esc(s.name)}: ${esc(s.coverage)} ${esc(s.error ?? "")}</li>`).join("") || "<li>none</li>"}</ul>`;
}
