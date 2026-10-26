import type { ManualReason, Prisma } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { MANUAL_STATES } from "@/core/state";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { DocLinks } from "@/components/doc-links";
import { ManualButtons } from "@/components/controls";

export const dynamic = "force-dynamic";

const REASONS: ManualReason[] = ["CAPTCHA", "MFA", "LOGIN_REQUIRED", "UNSUPPORTED_ATS", "SITE_RESTRICTION", "AUTOMATION_FAILURE", "UNKNOWN_SCREENING_QUESTION", "HUMAN_VERIFICATION", "SUBMISSION_UNCERTAIN", "MISSING_CANDIDATE_INFO", "AUTO_SUBMIT_DISABLED", "NO_APPLICATION_URL"];

export default async function ManualPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.ApplicationWhereInput = {
    state: { in: MANUAL_STATES },
    ...(sp.reason ? { manualReason: sp.reason as ManualReason } : {}),
    job: {
      ...(sp.country ? { country: sp.country } : {}),
      ...(sp.company ? { company: { contains: sp.company, mode: "insensitive" } } : {}),
      ...(sp.role ? { title: { contains: sp.role, mode: "insensitive" } } : {}),
      ...(sp.from ? { firstSeenAt: { gte: new Date(sp.from) } } : {}),
    },
  };
  const apps = await prisma.application.findMany({ where, include: { job: true }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 500 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manual applications</h1>
        <p className="text-sm text-muted-foreground">
          {apps.length} job(s) need you. Each one has the employer&apos;s application link and your tailored documents. Records stay here until you resolve them.
        </p>
      </div>
      <form className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_220px_160px_auto]">
        <Select name="country" defaultValue={sp.country ?? ""}>
          <option value="">All countries</option>
          <option value="DE">Germany</option>
          <option value="NL">Netherlands</option>
          <option value="EU_REMOTE">EU remote</option>
        </Select>
        <Input name="company" placeholder="Company" defaultValue={sp.company} />
        <Input name="role" placeholder="Role" defaultValue={sp.role} />
        <Select name="reason" defaultValue={sp.reason ?? ""}>
          <option value="">All reasons</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ").toLowerCase()}</option>
          ))}
        </Select>
        <Input name="from" type="date" defaultValue={sp.from} title="Discovered since" />
        <Button type="submit">Filter</Button>
      </form>
      {apps.length === 0 && <p className="py-10 text-center text-muted-foreground">Nothing needs your attention.</p>}
      {apps.map((a) => {
        const direct = a.job.applyUrl;
        return (
          <Card key={a.id} id={a.id} className="border-l-4 border-l-amber-400">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-base font-semibold">{a.job.title}</div>
                  <div className="text-sm">{a.job.company} · {[a.job.city, a.job.country].filter(Boolean).join(", ") || a.job.locationRaw}</div>
                  <div className="text-xs text-muted-foreground">Discovered {fmtDate(a.job.firstSeenAt)} · score {a.job.matchScore ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={a.manualReason ?? a.state} />
                  {a.state !== "NEEDS_ACTION" && <StatusBadge value={a.state} />}
                </div>
              </div>
              <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-950">{a.manualDetail ?? "Automatic application was not completed."}</div>
              <div className="flex flex-wrap items-center gap-3">
                <a href={direct ?? a.job.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <ExternalLink className="h-4 w-4" /> Open application website
                </a>
                {!direct && <span className="text-xs text-amber-800">Direct application URL unavailable — this is the verified original job URL.</span>}
                {direct && direct !== a.job.canonicalUrl && <a href={a.job.canonicalUrl} className="text-xs text-primary underline" target="_blank" rel="noreferrer">Original job posting</a>}
              </div>
              <DocLinks app={a} />
              <ManualButtons id={a.id} canRetry={a.state !== "SUBMISSION_UNCERTAIN"} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
