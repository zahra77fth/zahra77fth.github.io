import Link from "next/link";
import type { ApplicationState } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { DocLinks } from "@/components/doc-links";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const apps = await prisma.application.findMany({
    where: sp.state ? { state: sp.state as ApplicationState } : {},
    include: { job: true, attempts: { orderBy: { attemptNumber: "desc" } }, transitions: { orderBy: { createdAt: "desc" }, take: 6 } },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatic applications</h1>
          <p className="text-sm text-muted-foreground">An application is only “submitted &amp; verified” when a confirmation page or message was captured.</p>
        </div>
        <form className="flex gap-2">
          <Select name="state" defaultValue={sp.state ?? ""} className="w-56">
            <option value="">All states</option>
            {["QUEUED", "DOCUMENTS_READY", "APPLYING", "RETRY_PENDING", "SUBMITTED_VERIFIED", "SUBMISSION_UNCERTAIN", "NEEDS_ACTION", "FAILED", "APPLIED_MANUALLY", "NOT_INTERESTED", "EXPIRED", "DUPLICATE", "SKIPPED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Filter</Button>
        </form>
      </div>
      {apps.length === 0 && <p className="py-10 text-center text-muted-foreground">No applications yet.</p>}
      {apps.map((a) => {
        const last = a.attempts[0];
        const ev = last?.evidence as { confirmationText?: string; url?: string; reference?: string } | null;
        return (
          <Card key={a.id} id={a.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{a.job.title} — {a.job.company}</div>
                  <div className="text-xs text-muted-foreground">{[a.job.city, a.job.country].filter(Boolean).join(", ")} · priority {a.priority} · {a.attemptCount} attempt(s) · updated {fmtDate(a.updatedAt)}</div>
                </div>
                <StatusBadge value={a.state} />
              </div>
              <DocLinks app={a} />
              {a.state === "SUBMITTED_VERIFIED" && (
                <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                  Confirmation: “{ev?.confirmationText ?? "confirmation URL"}” at {ev?.url} {a.confirmationRef && <>· reference <b>{a.confirmationRef}</b></>} · {fmtDate(a.submittedAt)}
                </div>
              )}
              {a.manualDetail && <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">{a.manualReason}: {a.manualDetail} — <Link className="underline" href={`/manual#${a.id}`}>manual queue</Link></div>}
              {a.attempts.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Attempts, evidence and logs</summary>
                  <div className="mt-2 space-y-2">
                    {a.attempts.map((t) => (
                      <div key={t.id} className="rounded-md border p-2">
                        <div>#{t.attemptNumber} · {t.outcome ?? "running"} · worker {t.workerId} · {fmtDate(t.startedAt)}{t.submitClickedAt && ` · submit clicked ${fmtDate(t.submitClickedAt)}`}</div>
                        {t.error && <div className="text-destructive">{t.error}</div>}
                        <div className="mt-1 space-x-3">
                          {t.screenshotPath && <a className="text-primary underline" href={`/api/evidence/${t.id}/screenshot`} target="_blank">Screenshot</a>}
                          {t.submitClickedAt && <a className="text-primary underline" href={`/api/evidence/${t.id}/before-submit`} target="_blank">Filled form</a>}
                          {t.htmlPath && <a className="text-primary underline" href={`/api/evidence/${t.id}/html`} target="_blank">Page HTML</a>}
                        </div>
                        {Array.isArray(t.log) && (
                          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{(t.log as { step: number; action: string; fields: { label: string; filled: boolean; source?: string; reason?: string }[] }[]).map((s) => `Step ${s.step}: ${s.action}\n${s.fields.map((f) => `  ${f.filled ? "✓" : "·"} ${f.label}${f.source ? ` ← ${f.source}` : ""}${f.reason ? ` (${f.reason})` : ""}`).join("\n")}`).join("\n")}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
