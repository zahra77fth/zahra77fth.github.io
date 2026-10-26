import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunControls } from "@/components/controls";
import { StatusBadge } from "@/components/status";
import { nextScheduledRun, queueCounts } from "@/core/queue";
import { getProfileRow } from "@/core/profile/service";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function Overview() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [settings, profile, total, today, jobStatus, appState, runs, sources, next, queues] = await Promise.all([
    getSettings(),
    getProfileRow(),
    prisma.job.count(),
    prisma.job.count({ where: { firstSeenAt: { gte: startOfDay } } }),
    prisma.job.groupBy({ by: ["status"], _count: true }),
    prisma.application.groupBy({ by: ["state"], _count: true }),
    prisma.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.source.findMany({ orderBy: { id: "asc" } }),
    safe(nextScheduledRun, null),
    safe(queueCounts, null),
  ]);
  const js = Object.fromEntries(jobStatus.map((g) => [g.status, g._count])) as Record<string, number>;
  const as = Object.fromEntries(appState.map((g) => [g.state, g._count])) as Record<string, number>;
  const stats: [string, number, string?][] = [
    ["Total jobs discovered", total, "/jobs"],
    ["New today", today, "/jobs"],
    ["Eligible", js.ELIGIBLE ?? 0, "/jobs?status=ELIGIBLE"],
    ["Queued", (as.QUEUED ?? 0) + (as.DOCUMENTS_READY ?? 0) + (as.RETRY_PENDING ?? 0), "/applications"],
    ["In progress", as.APPLYING ?? 0, "/applications?state=APPLYING"],
    ["Submitted & verified", as.SUBMITTED_VERIFIED ?? 0, "/applications?state=SUBMITTED_VERIFIED"],
    ["Needs manual action", (as.NEEDS_ACTION ?? 0) + (as.SUBMISSION_UNCERTAIN ?? 0), "/manual"],
    ["Failed", as.FAILED ?? 0, "/applications?state=FAILED"],
    ["Expired", js.EXPIRED ?? 0, "/jobs?status=EXPIRED"],
    ["Duplicates", js.DUPLICATE ?? 0, "/jobs?status=DUPLICATE"],
  ];
  const sourceSummary = sources.reduce<Record<string, number>>((m, s) => ((m[s.coverage] = (m[s.coverage] ?? 0) + 1), m), {});
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Next scheduled run: {next ? fmtDate(next) : "worker not connected"} · Mode: {settings.discoveryOnly ? "discovery only" : settings.autoSubmit ? "automatic submission" : "prepare documents, manual submission"}
          </p>
        </div>
        <RunControls paused={settings.paused} emergency={settings.emergencyStop} />
      </div>

      {!profile?.approvedAt && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm">
            Your candidate profile is not approved yet, so jobs are discovered but not matched or applied to. <Link href="/setup" className="font-medium text-primary underline">Open the setup wizard</Link>.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href ?? "#"}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Each run discovers, deduplicates, matches, prepares documents and dispatches applications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {runs.length === 0 && <p className="text-muted-foreground">No runs yet. Click Run Now or wait for the schedule ({settings.schedule}, {settings.timezone}).</p>}
            {runs.map((r) => {
              const st = r.stats as { discovery?: { fetched: number; ingest: { created: number } }; matching?: { queued: number }; applyQueued?: number } | null;
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{fmtDate(r.startedAt)} · {r.trigger}</div>
                    <div className="text-xs text-muted-foreground">
                      {st?.discovery ? `${st.discovery.fetched} listings scanned · ${st.discovery.ingest.created} new · ${st.matching?.queued ?? 0} queued · ${st.applyQueued ?? 0} dispatched` : r.error ?? "running…"}
                    </div>
                  </div>
                  <StatusBadge value={r.status === "COMPLETED" ? "OK" : r.status === "FAILED" ? "ERROR" : "PARTIAL"} />
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Source coverage</CardTitle>
            <CardDescription>
              {Object.entries(sourceSummary).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(" · ") || "No sources run yet"} — <Link className="text-primary underline" href="/settings#sources">details</Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {queues && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(queues).map(([q, c]) => (
                  <div key={q} className="rounded-md bg-muted p-2">
                    <div className="font-medium capitalize">{q} queue</div>
                    <div className="text-muted-foreground">{c.waiting + (c.prioritized ?? 0)} waiting · {c.active} active · {c.delayed} delayed · {c.failed} failed</div>
                  </div>
                ))}
              </div>
            )}
            {sources
              .filter((s) => s.coverage === "ERROR" || (s.coverage === "BLOCKED" && s.kind !== "restricted"))
              .map((s) => (
                <div key={s.id} className="flex justify-between gap-2 pt-1">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.lastError}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
