import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/status";
import { ApproveClarification } from "@/components/controls";

export const dynamic = "force-dynamic";
const PAGE = 50;

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const where: Prisma.JobWhereInput = {
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { company: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }, { techStack: { has: sp.q } }] } : {}),
    ...(sp.country ? { country: sp.country } : {}),
    ...(sp.status ? { status: sp.status as Prisma.EnumJobStatusFilter["equals"] } : {}),
    ...(sp.source ? { sourceId: { startsWith: sp.source } } : {}),
  };
  const [jobs, count] = await Promise.all([
    prisma.job.findMany({ where, orderBy: [{ matchScore: { sort: "desc", nulls: "last" } }, { firstSeenAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE, include: { application: { select: { state: true } } } }),
    prisma.job.count({ where }),
  ]);
  const qs = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), page: String(p) })}`;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Job discovery</h1>
        <p className="text-sm text-muted-foreground">{count} jobs match. Scores set processing order; only explicit rules exclude a job.</p>
      </div>
      <form className="grid gap-2 sm:grid-cols-[1fr_140px_200px_160px_auto]">
        <Input name="q" placeholder="Search title, company, city, technology…" defaultValue={sp.q} />
        <Select name="country" defaultValue={sp.country ?? ""}>
          <option value="">All countries</option>
          <option value="DE">Germany</option>
          <option value="NL">Netherlands</option>
          <option value="EU_REMOTE">EU remote</option>
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""}>
          <option value="">All statuses</option>
          {["DISCOVERED", "ELIGIBLE", "NEEDS_CLARIFICATION", "EXCLUDED", "EXPIRED", "DUPLICATE"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>
          ))}
        </Select>
        <Input name="source" placeholder="Source (e.g. greenhouse)" defaultValue={sp.source} />
        <Button type="submit">Filter</Button>
      </form>
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Company</TH>
              <TH>Job title</TH>
              <TH>Location</TH>
              <TH>Remote</TH>
              <TH>Tech stack</TH>
              <TH>Score</TH>
              <TH>Links</TH>
              <TH>Discovered</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {jobs.map((j) => {
              const ex = j.matchExplanation as { reasons?: string[]; flags?: string[] } | null;
              return (
                <TR key={j.id}>
                  <TD className="font-medium">{j.company}</TD>
                  <TD className="max-w-[280px]">
                    <div>{j.title}</div>
                    {(j.eligibilityNote || ex?.reasons?.[0]) && <div className="mt-0.5 text-xs text-muted-foreground">{j.eligibilityNote ?? ex?.reasons?.[0]}</div>}
                  </TD>
                  <TD>{[j.city, j.country].filter(Boolean).join(", ") || j.locationRaw}</TD>
                  <TD className="text-xs">{j.remotePolicy.toLowerCase()}</TD>
                  <TD className="max-w-[200px] text-xs text-muted-foreground">{j.techStack.slice(0, 6).join(", ")}</TD>
                  <TD className="tabular-nums">{j.matchScore ?? "—"}</TD>
                  <TD className="space-x-2 text-xs">
                    <a className="text-primary underline" href={j.canonicalUrl} target="_blank" rel="noreferrer">Job</a>
                    {j.applyUrl && <a className="text-primary underline" href={j.applyUrl} target="_blank" rel="noreferrer">Apply</a>}
                  </TD>
                  <TD className="text-xs">{fmtDate(j.firstSeenAt)}</TD>
                  <TD className="space-y-1">
                    <StatusBadge value={j.application?.state ?? j.status} />
                    {j.status === "NEEDS_CLARIFICATION" && !j.application && <ApproveClarification jobId={j.id} />}
                  </TD>
                </TR>
              );
            })}
            {jobs.length === 0 && (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-muted-foreground">No jobs yet. Run discovery from the Overview page.</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
      <div className="flex justify-between text-sm">
        {page > 1 ? <Link href={qs(page - 1)} className="text-primary">← Previous</Link> : <span />}
        {page * PAGE < count ? <Link href={qs(page + 1)} className="text-primary">Next →</Link> : <span />}
      </div>
    </div>
  );
}
