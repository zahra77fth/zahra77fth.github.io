"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/settings";
import { addQuestionAction, answerQuestionAction, deleteAllDataAction, importCvAction, saveSecretAction, scanDesktopAction, updateSettingsAction, uploadCvAction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

function useAction() {
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setMsg(await fn());
      router.refresh();
    });
  const view = msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.message}</span>;
  return { pending, run, view };
}

const list = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function PreferencesForm({ s }: { s: Settings }) {
  const [v, setV] = useState(s);
  const { pending, run, view } = useAction();
  const toggle = <T extends string>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((a) => a !== x) : [...arr, x]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1.5">
          <Label>Target countries</Label>
          <Check label="Germany" checked={v.targetCountries.includes("DE")} onChange={() => setV({ ...v, targetCountries: toggle(v.targetCountries, "DE") })} />
          <Check label="Netherlands" checked={v.targetCountries.includes("NL")} onChange={() => setV({ ...v, targetCountries: toggle(v.targetCountries, "NL") })} />
        </div>
        <div className="space-y-1.5">
          <Label>Workplace</Label>
          {(["ONSITE", "HYBRID", "REMOTE"] as const).map((r) => <Check key={r} label={r.toLowerCase()} checked={v.remotePreferences.includes(r)} onChange={() => setV({ ...v, remotePreferences: toggle(v.remotePreferences, r) })} />)}
        </div>
        <div className="space-y-1.5">
          <Label>Cover letter languages</Label>
          {(["en", "de", "nl"] as const).map((l) => <Check key={l} label={l.toUpperCase()} hint={l !== "en" ? "only used if your verified level is B2+" : undefined} checked={v.coverLetterLanguages.includes(l)} onChange={() => setV({ ...v, coverLetterLanguages: toggle(v.coverLetterLanguages, l) })} />)}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sal">Minimum salary (EUR/year)</Label>
          <Input id="sal" type="number" className="w-40" value={v.minSalaryEur ?? ""} onChange={(e) => setV({ ...v, minSalaryEur: e.target.value ? Number(e.target.value) : null })} />
          <p className="text-xs text-muted-foreground">Only excludes jobs that publish a lower range.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Target roles (one per line)</Label><Textarea rows={8} value={v.targetRoles.join("\n")} onChange={(e) => setV({ ...v, targetRoles: list(e.target.value) })} /></div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Excluded seniority words</Label><Textarea value={v.excludeSeniority.join(", ")} onChange={(e) => setV({ ...v, excludeSeniority: list(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Excluded companies</Label><Textarea value={v.excludeCompanies.join(", ")} onChange={(e) => setV({ ...v, excludeCompanies: list(e.target.value) })} /></div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => updateSettingsAction({ targetCountries: v.targetCountries, remotePreferences: v.remotePreferences, coverLetterLanguages: v.coverLetterLanguages, minSalaryEur: v.minSalaryEur, targetRoles: v.targetRoles, excludeSeniority: v.excludeSeniority, excludeCompanies: v.excludeCompanies }))}>Save preferences</Button>
        {view}
      </div>
    </div>
  );
}

export function AuthorizationForm({ s, envAuthorized }: { s: Settings; envAuthorized: boolean }) {
  const [v, setV] = useState({ autoSubmit: s.autoSubmit, discoveryOnly: s.discoveryOnly, acceptPrivacyNotices: s.acceptPrivacyNotices });
  const { pending, run, view } = useAction();
  const effective = v.autoSubmit && !v.discoveryOnly && envAuthorized;
  return (
    <div className="space-y-3">
      <Check label="Discovery-only mode" hint="Discover, match and prepare documents, but never open application forms." checked={v.discoveryOnly} onChange={(x) => setV({ ...v, discoveryOnly: x })} />
      <Check label="I authorize AutoApply EU to submit applications on my behalf" hint="Only fully verified forms with a matching confirmation are counted as submitted." checked={v.autoSubmit} onChange={(x) => setV({ ...v, autoSubmit: x })} />
      <Check label="I authorize accepting employers' applicant privacy notices for me" hint="Required by most EU application forms. Marketing / talent-pool opt-ins are never ticked." checked={v.acceptPrivacyNotices} onChange={(x) => setV({ ...v, acceptPrivacyNotices: x })} />
      <p className="text-sm">
        Server flag <code>AUTHORIZE_REAL_SUBMISSIONS</code>: <b>{envAuthorized ? "true" : "false"}</b>. Effective mode: <b>{effective ? "automatic submission ON" : "no automatic submission"}</b>
      </p>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => updateSettingsAction(v))}>Save authorization</Button>
        {view}
      </div>
    </div>
  );
}

export function ScheduleForm({ s }: { s: Settings }) {
  const [v, setV] = useState({ schedule: s.schedule, timezone: s.timezone, maxApplicationsPerRun: s.maxApplicationsPerRun, domainMinIntervalMs: s.domainMinIntervalMs, applyDomainMinIntervalMs: s.applyDomainMinIntervalMs });
  const { pending, run, view } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="space-y-1.5"><Label>Cron schedule</Label><Input value={v.schedule} onChange={(e) => setV({ ...v, schedule: e.target.value })} /><p className="text-xs text-muted-foreground">e.g. 0 7 * * * = daily 07:00</p></div>
        <div className="space-y-1.5"><Label>Timezone</Label><Input value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Max applications per run</Label><Input type="number" value={v.maxApplicationsPerRun} onChange={(e) => setV({ ...v, maxApplicationsPerRun: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label>Discovery delay per domain (ms)</Label><Input type="number" value={v.domainMinIntervalMs} onChange={(e) => setV({ ...v, domainMinIntervalMs: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label>Submission gap per domain (ms)</Label><Input type="number" value={v.applyDomainMinIntervalMs} onChange={(e) => setV({ ...v, applyDomainMinIntervalMs: Number(e.target.value) })} /></div>
      </div>
      <div className="flex items-center gap-3"><Button disabled={pending} onClick={() => run(() => updateSettingsAction(v))}>Save schedule &amp; limits</Button>{view}</div>
    </div>
  );
}

export function NotificationForm({ s, transport }: { s: Settings; transport: string }) {
  const [v, setV] = useState({ notificationsEnabled: s.notificationsEnabled, notifyEmail: s.notifyEmail ?? "" });
  const { pending, run, view } = useAction();
  return (
    <div className="space-y-3">
      <Check label="Email me the daily report and manual-action alerts" checked={v.notificationsEnabled} onChange={(x) => setV({ ...v, notificationsEnabled: x })} />
      <div className="max-w-sm space-y-1.5"><Label>Your email</Label><Input type="email" value={v.notifyEmail} onChange={(e) => setV({ ...v, notifyEmail: e.target.value })} /></div>
      <p className="text-xs text-muted-foreground">Transport: {transport}. Emails only ever go to you — never to employers.</p>
      <div className="flex items-center gap-3"><Button disabled={pending} onClick={() => run(() => updateSettingsAction({ notificationsEnabled: v.notificationsEnabled, notifyEmail: v.notifyEmail || null }))}>Save notifications</Button>{view}</div>
    </div>
  );
}

export function SourcesForm({ s }: { s: Settings }) {
  const [boards, setBoards] = useState(s.companyBoards);
  const [sites, setSites] = useState(s.careerSites.join("\n"));
  const { pending, run, view } = useAction();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Additional company boards (verified defaults are always included). Boards referenced by discovered jobs are learned automatically.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(boards) as (keyof typeof boards)[]).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label className="capitalize">{k} {k === "workday" && <span className="text-xs font-normal text-muted-foreground">(host|tenant|site)</span>}</Label>
            <Textarea value={boards[k].join("\n")} onChange={(e) => setBoards({ ...boards, [k]: list(e.target.value) })} />
          </div>
        ))}
        <div className="space-y-1.5"><Label>Company career sites (URLs)</Label><Textarea value={sites} onChange={(e) => setSites(e.target.value)} placeholder="https://careers.example.nl/jobs" /></div>
      </div>
      <div className="flex items-center gap-3"><Button disabled={pending} onClick={() => run(() => updateSettingsAction({ companyBoards: boards, careerSites: list(sites) }))}>Save sources</Button>{view}</div>
    </div>
  );
}

export function SourceToggle({ id, enabled, all }: { id: string; enabled: boolean; all: Record<string, boolean> }) {
  const { pending, run } = useAction();
  return <input type="checkbox" aria-label={`Enable ${id}`} disabled={pending} checked={enabled} onChange={(e) => run(() => updateSettingsAction({ enabledSources: { ...all, [id]: e.target.checked } }))} />;
}

export function SecretForm({ name, label, present }: { name: Parameters<typeof saveSecretAction>[0]; label: string; present: boolean }) {
  const [v, setV] = useState("");
  const { pending, run, view } = useAction();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5"><Label>{label} {present && <span className="text-xs text-emerald-700">(stored, encrypted)</span>}</Label><Input type="password" autoComplete="off" className="w-80" value={v} onChange={(e) => setV(e.target.value)} /></div>
      <Button variant="outline" disabled={pending || !v} onClick={() => run(async () => { const r = await saveSecretAction(name, v); setV(""); return r; })}>Save</Button>
      {view}
    </div>
  );
}

export function ScreeningAnswers({ items }: { items: { id: string; question: string; answer: string | null; verified: boolean }[] }) {
  const { pending, run, view } = useAction();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-muted-foreground">No screening questions recorded yet. Unknown required questions from application forms appear here.</p>}
      {items.map((it) => (
        <form key={it.id} className="flex flex-wrap items-center gap-2" action={(fd) => run(() => answerQuestionAction(it.id, String(fd.get("answer") ?? "")))}>
          <div className="min-w-[280px] flex-1 text-sm">{it.question} {!it.answer && <span className="text-xs text-amber-700">(unanswered)</span>}</div>
          <Input name="answer" defaultValue={it.answer ?? ""} className="w-72" placeholder="Your truthful answer" />
          <Button size="sm" variant="outline" disabled={pending}>Save</Button>
        </form>
      ))}
      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <Input className="w-96" placeholder="Add a question (as worded on forms)" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input className="w-72" placeholder="Answer" value={a} onChange={(e) => setA(e.target.value)} />
        <Button size="sm" disabled={pending || !q || !a} onClick={() => run(async () => { const r = await addQuestionAction(q, a); setQ(""); setA(""); return r; })}>Add</Button>
      </div>
      {view}
    </div>
  );
}

export function DangerZone() {
  const [c, setC] = useState("");
  const { pending, run, view } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="/api/export" className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Export all data (JSON)</a>
      <Input className="w-40" placeholder='Type "DELETE"' value={c} onChange={(e) => setC(e.target.value)} />
      <Button variant="destructive" disabled={pending || c !== "DELETE"} onClick={() => run(() => deleteAllDataAction(c))}>Delete all data</Button>
      {view}
    </div>
  );
}

export function CvPicker({ current }: { current: string | null }) {
  const [scan, setScan] = useState<Awaited<ReturnType<typeof scanDesktopAction>> | null>(null);
  const [choice, setChoice] = useState<string>("");
  const { pending, run, view } = useAction();
  const [scanning, startScan] = useTransition();
  return (
    <div className="space-y-3">
      {current && <p className="text-sm">Current master CV: <code className="rounded bg-muted px-1">{current}</code> (read-only; never modified)</p>}
      <Button variant="outline" disabled={scanning} onClick={() => startScan(async () => { const r = await scanDesktopAction(); setScan(r); setChoice(r.files.find((f) => f.likelyCv)?.path ?? r.files[0]?.path ?? ""); })}>
        {scanning ? "Scanning…" : "Scan my Desktop for CVs"}
      </Button>
      {scan && (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">OS: {scan.os}. Desktop folders: {scan.dirs.length ? scan.dirs.join(", ") : "none found — set DESKTOP_DIR or upload below"}.</p>
          {scan.files.length > 1 && <p className="font-medium">Several files found — choose your master CV:</p>}
          {scan.files.map((f) => (
            <label key={f.path} className="flex items-center gap-2">
              <input type="radio" name="cv" checked={choice === f.path} onChange={() => setChoice(f.path)} />
              <span>{f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.sizeBytes / 1024).toFixed(0)} KB · {new Date(f.modifiedAt).toLocaleDateString()} {f.likelyCv && "· looks like a CV"}</span>
            </label>
          ))}
          {scan.files.length > 0 && <Button disabled={pending || !choice} onClick={() => run(() => importCvAction(choice))}>Use this file and extract my profile</Button>}
        </div>
      )}
      <form className="flex flex-wrap items-center gap-2" action={(fd) => run(() => uploadCvAction(fd))}>
        <span className="text-sm text-muted-foreground">Or upload:</span>
        <input type="file" name="cv" accept=".pdf,.docx" className="text-sm" />
        <Button size="sm" variant="outline" disabled={pending}>Upload &amp; extract</Button>
      </form>
      {view}
    </div>
  );
}
