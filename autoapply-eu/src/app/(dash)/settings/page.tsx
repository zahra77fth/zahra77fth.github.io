import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings, hasSecret } from "@/lib/settings";
import { fmtDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/status";
import { ProfileEditor } from "@/components/profile-editor";
import { AuthorizationForm, CvPicker, DangerZone, NotificationForm, PreferencesForm, ScheduleForm, ScreeningAnswers, SecretForm, SourcesForm, SourceToggle } from "@/components/settings-forms";
import { ProfileSchema, type ExtractionResult } from "@/core/profile/schema";
import { profileVerificationIssues } from "@/core/profile/service";
import { buildSources } from "@/core/discovery/registry";

export const dynamic = "force-dynamic";

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  const [s, profile, sources, answers, issues, llm, smtpPass, gmail] = await Promise.all([
    getSettings(),
    prisma.candidateProfile.findUnique({ where: { id: "singleton" } }),
    prisma.source.findMany(),
    prisma.screeningAnswer.findMany({ orderBy: [{ answer: { sort: "asc", nulls: "first" } }, { lastSeenAt: "desc" }] }),
    profileVerificationIssues(),
    hasSecret("LLM_API_KEY"),
    hasSecret("SMTP_PASS"),
    hasSecret("GMAIL_REFRESH_TOKEN"),
  ]);
  const extracted = (profile?.extracted ?? {}) as Partial<ExtractionResult>;
  const configured = buildSources({ ...s, enabledSources: {} });
  const byId = new Map(sources.map((x) => [x.id, x]));
  const transport = process.env.EMAIL_TRANSPORT === "json" ? "log only (EMAIL_TRANSPORT=json)" : process.env.GMAIL_REFRESH_TOKEN || gmail ? "Gmail OAuth2" : process.env.SMTP_HOST ? `SMTP ${process.env.SMTP_HOST}` : "not configured (set SMTP_* or GMAIL_* in .env)";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <nav className="flex flex-wrap gap-3 text-sm text-primary">
        {["profile", "cv", "preferences", "authorization", "schedule", "notifications", "sources", "answers", "secrets", "data"].map((a) => <a key={a} href={`#${a}`} className="capitalize hover:underline">{a}</a>)}
      </nav>
      <Section id="profile" title="Candidate profile" desc="The single source of truth for every CV, cover letter and form answer.">
        {profile ? <ProfileEditor initial={ProfileSchema.parse(profile.data)} approved={!!profile.approvedAt} uncertain={extracted.uncertain ?? []} missing={extracted.missing ?? []} issues={issues} /> : <p className="text-sm text-muted-foreground">No profile yet — import your CV below or use the setup wizard.</p>}
      </Section>
      <Section id="cv" title="CV source"><CvPicker current={profile?.sourceFile ?? null} /></Section>
      <Section id="preferences" title="Targets and preferences"><PreferencesForm s={s} /></Section>
      <Section id="authorization" title="Automatic submission" desc="Real submissions need your authorization here AND the server flag."><AuthorizationForm s={s} envAuthorized={env.authorizeRealSubmissions} /></Section>
      <Section id="schedule" title="Schedule and rate limits"><ScheduleForm s={s} /></Section>
      <Section id="notifications" title="Notifications"><NotificationForm s={s} transport={transport} /></Section>
      <Section id="sources" title="Source coverage" desc="Actual status of each source from its last run. Blocked sources are never scraped.">
        <Table>
          <THead><TR><TH>On</TH><TH>Source</TH><TH>Coverage</TH><TH>Listings scanned</TH><TH>In scope</TH><TH>Last run</TH><TH>Notes</TH></TR></THead>
          <TBody>
            {configured.map((c) => {
              const r = byId.get(c.id);
              return (
                <TR key={c.id}>
                  <TD><SourceToggle id={c.id} enabled={s.enabledSources[c.id] !== false} all={s.enabledSources} /></TD>
                  <TD className="font-medium">{c.name}</TD>
                  <TD><StatusBadge value={r?.coverage ?? "UNKNOWN"} /></TD>
                  <TD className="tabular-nums">{r?.lastJobCount ?? "—"}</TD>
                  <TD className="tabular-nums">{r?.lastMatchCount ?? "—"}</TD>
                  <TD className="text-xs">{fmtDate(r?.lastRunAt)}</TD>
                  <TD className="max-w-md text-xs text-muted-foreground">{r?.lastError ?? r?.notes ?? ""}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <div className="mt-4"><SourcesForm s={s} /></div>
      </Section>
      <Section id="answers" title="Screening answers" desc="Verified answers are reused on future forms. Nothing is guessed."><ScreeningAnswers items={answers} /></Section>
      <Section id="secrets" title="LLM and email credentials" desc="Stored AES-256-GCM encrypted. Environment variables take precedence.">
        <div className="space-y-3">
          <SecretForm name="LLM_API_KEY" label="OpenAI-compatible API key (optional; improves extraction and wording, output is fact-checked)" present={llm || !!process.env.LLM_API_KEY} />
          <SecretForm name="SMTP_USER" label="SMTP username" present={!!process.env.SMTP_USER} />
          <SecretForm name="SMTP_PASS" label="SMTP password / app password" present={smtpPass || !!process.env.SMTP_PASS} />
          <SecretForm name="GMAIL_REFRESH_TOKEN" label="Gmail OAuth2 refresh token" present={gmail || !!process.env.GMAIL_REFRESH_TOKEN} />
        </div>
      </Section>
      <Section id="data" title="Your data"><DangerZone /></Section>
    </div>
  );
}
