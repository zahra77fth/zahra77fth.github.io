import { CheckCircle2, Circle } from "lucide-react";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings, hasSecret } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditor } from "@/components/profile-editor";
import { RunControls } from "@/components/controls";
import { AuthorizationForm, CvPicker, NotificationForm, PreferencesForm, SecretForm } from "@/components/settings-forms";
import { ProfileSchema, type ExtractionResult } from "@/core/profile/schema";
import { profileVerificationIssues } from "@/core/profile/service";

export const dynamic = "force-dynamic";

function Step({ n, title, done, optional, children }: { n: number; title: string; done: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        <CardTitle className="text-base">{n}. {title} {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SetupPage() {
  const [profile, s, llm, runs, issues] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { id: "singleton" } }),
    getSettings(),
    hasSecret("LLM_API_KEY"),
    prisma.pipelineRun.count(),
    profileVerificationIssues(),
  ]);
  const extracted = (profile?.extracted ?? {}) as Partial<ExtractionResult>;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup wizard</h1>
        <p className="text-sm text-muted-foreground">Nothing is submitted until you finish steps 1–4 and explicitly authorize submission in step 8. Start with a discovery-only run.</p>
      </div>
      <Step n={1} title="Locate your master CV on the Desktop and confirm the file" done={!!profile?.sourceFile}>
        <CvPicker current={profile?.sourceFile ?? null} />
      </Step>
      <Step n={2} title="Review the extracted information, fill in missing facts, and approve" done={!!profile?.approvedAt}>
        {profile ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Extraction method: {extracted.method ?? "manual"}. Fields outlined amber are missing; blue were inferred from layout and need a check.{(extracted.droppedLlmFacts?.length ?? 0) > 0 && ` ${extracted.droppedLlmFacts!.length} LLM-suggested facts were discarded because they are not in your CV.`}</p>
            <ProfileEditor initial={ProfileSchema.parse(profile.data)} approved={!!profile.approvedAt} uncertain={extracted.uncertain ?? []} missing={extracted.missing ?? []} issues={issues} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Complete step 1 first.</p>
        )}
      </Step>
      <Step n={3} title="Target countries, roles and preferences (Germany and the Netherlands by default)" done={s.targetCountries.length > 0 && s.targetRoles.length > 0}>
        <PreferencesForm s={s} />
      </Step>
      <Step n={4} title="LLM API (stored encrypted)" done={llm || !!process.env.LLM_API_KEY} optional>
        <p className="mb-2 text-sm text-muted-foreground">Without a key, extraction and documents use deterministic, rule-based generation. With a key, any LLM output that mentions technologies or figures not in your profile is rejected.</p>
        <SecretForm name="LLM_API_KEY" label="API key" present={llm || !!process.env.LLM_API_KEY} />
      </Step>
      <Step n={5} title="Email notifications" done={s.notificationsEnabled} optional>
        <NotificationForm s={s} transport={process.env.GMAIL_REFRESH_TOKEN ? "Gmail OAuth2" : process.env.SMTP_HOST ? `SMTP ${process.env.SMTP_HOST}` : "configure SMTP_* or GMAIL_* in .env"} />
      </Step>
      <Step n={6} title="Run discovery only (no applications)" done={runs > 0}>
        <p className="mb-2 text-sm text-muted-foreground">Requires the worker (<code>npm run worker</code>). Results appear under Job discovery.</p>
        <RunControls paused={s.paused} emergency={s.emergencyStop} />
      </Step>
      <Step n={7} title="Authorize automatic submission" done={s.autoSubmit && !s.discoveryOnly && env.authorizeRealSubmissions}>
        <AuthorizationForm s={s} envAuthorized={env.authorizeRealSubmissions} />
      </Step>
    </div>
  );
}
