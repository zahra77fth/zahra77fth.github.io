import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status";

export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const app = sp.job ? await prisma.application.findUnique({ where: { jobId: sp.job } }) : null;
  const [events, transitions] = await Promise.all([
    prisma.event.findMany({ where: sp.job ? { jobId: sp.job } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.stateTransition.findMany({ where: sp.job ? { applicationId: app?.id ?? "-" } : {}, orderBy: { createdAt: "desc" }, take: 300, include: { application: { include: { job: { select: { id: true, title: true, company: true } } } } } }),
  ]);
  const items = [
    ...events.map((e) => ({ at: e.createdAt, kind: "event" as const, e })),
    ...transitions.map((t) => ({ at: t.createdAt, kind: "transition" as const, t })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 400);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity timeline</h1>
        <p className="text-sm text-muted-foreground">Recorded events and every application state transition, newest first.{sp.job && <> Filtered to one job — <Link className="text-primary underline" href="/timeline">show all</Link>.</>}</p>
      </div>
      <Card className="divide-y">
        {items.length === 0 && <p className="p-6 text-center text-muted-foreground">No activity yet.</p>}
        {items.map((it, i) =>
          it.kind === "event" ? (
            <div key={`e${i}`} className="flex gap-3 p-3 text-sm">
              <div className="w-40 shrink-0 text-xs text-muted-foreground">{fmtDate(it.at)}</div>
              <div className="w-44 shrink-0 font-mono text-xs">{it.e.type}</div>
              <div className="flex-1">
                {it.e.message}
                {it.e.jobId && <Link href={`/timeline?job=${it.e.jobId}`} className="ml-2 text-xs text-primary underline">trace</Link>}
              </div>
            </div>
          ) : (
            <div key={`t${i}`} className="flex gap-3 p-3 text-sm">
              <div className="w-40 shrink-0 text-xs text-muted-foreground">{fmtDate(it.at)}</div>
              <div className="flex w-44 shrink-0 items-center gap-1">
                <StatusBadge value={it.t.fromState ?? "—"} />→<StatusBadge value={it.t.toState} />
              </div>
              <div className="flex-1">
                <Link href={`/timeline?job=${it.t.application.job.id}`} className="font-medium hover:underline">{it.t.application.job.title} — {it.t.application.job.company}</Link>
                <div className="text-xs text-muted-foreground">{it.t.reason} · attempt {it.t.attemptNumber} · worker {it.t.workerId}{it.t.error && <span className="text-destructive"> · {it.t.error}</span>}</div>
              </div>
            </div>
          ),
        )}
      </Card>
    </div>
  );
}
