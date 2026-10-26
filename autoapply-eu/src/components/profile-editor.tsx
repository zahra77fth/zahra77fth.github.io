"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveProfileAction, saveProfileAction } from "@/app/actions";
import type { Profile } from "@/core/profile/schema";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProfileEditor({ initial, approved, uncertain, missing, issues }: { initial: Profile; approved: boolean; uncertain: string[]; missing: string[]; issues: string[] }) {
  const [p, setP] = useState<Profile>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP({ ...p, [k]: v });
    setDirty(true);
  };
  const flag = (k: string) => (missing.includes(k) ? "border-amber-400 bg-amber-50" : uncertain.includes(k) ? "border-sky-300" : "");
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      {(missing.length > 0 || issues.length > 0) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          {missing.length > 0 && <p><b>Missing facts:</b> {missing.join(", ")}. Add them only if true; unknown questions will be sent to the manual queue.</p>}
          {issues.length > 0 && <p className="mt-1"><b>Not found verbatim in your CV:</b> {issues.slice(0, 8).join("; ")}{issues.length > 8 ? "…" : ""}. Edit or confirm these.</p>}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Full name"><Input className={flag("fullName")} value={p.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
        <Field label="Email"><Input className={flag("email")} value={p.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input className={flag("phone")} value={p.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Current location"><Input className={flag("location")} value={p.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Headline"><Input value={p.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
        <Field label="LinkedIn"><Input value={p.links.linkedin} onChange={(e) => set("links", { ...p.links, linkedin: e.target.value })} /></Field>
        <Field label="GitHub"><Input value={p.links.github} onChange={(e) => set("links", { ...p.links, github: e.target.value })} /></Field>
        <Field label="Portfolio"><Input value={p.links.portfolio} onChange={(e) => set("links", { ...p.links, portfolio: e.target.value })} /></Field>
      </div>
      <Field label="Summary"><Textarea value={p.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
      <Field label="Skills (comma-separated)" hint="Only list technologies you have actually used."><Textarea className={flag("skills")} value={p.skills.join(", ")} onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Work experience</Label><Button size="sm" variant="outline" onClick={() => set("experience", [...p.experience, { title: "", company: "", location: "", start: "", end: "", current: false, bullets: [], technologies: [] }])}>Add role</Button></div>
        {p.experience.map((e, i) => {
          const up = (patch: Partial<typeof e>) => set("experience", p.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-6">
              <Input className="sm:col-span-2" placeholder="Title" value={e.title} onChange={(ev) => up({ title: ev.target.value })} />
              <Input className="sm:col-span-2" placeholder="Company" value={e.company} onChange={(ev) => up({ company: ev.target.value })} />
              <Input placeholder="Start (MM/YYYY)" value={e.start} onChange={(ev) => up({ start: ev.target.value })} />
              <Input placeholder="End / Present" value={e.end} onChange={(ev) => up({ end: ev.target.value, current: /present|heute|heden/i.test(ev.target.value) })} />
              <Textarea className="sm:col-span-6" placeholder="One achievement per line" value={e.bullets.join("\n")} onChange={(ev) => up({ bullets: lines(ev.target.value) })} />
              <div className="sm:col-span-6"><Button size="sm" variant="ghost" onClick={() => set("experience", p.experience.filter((_, j) => j !== i))}>Remove role</Button></div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Education</Label><Button size="sm" variant="outline" onClick={() => set("education", [...p.education, { degree: "", institution: "", start: "", end: "", details: "" }])}>Add</Button></div>
        {p.education.map((e, i) => {
          const up = (patch: Partial<typeof e>) => set("education", p.education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-5">
              <Input className="sm:col-span-2" placeholder="Degree" value={e.degree} onChange={(ev) => up({ degree: ev.target.value })} />
              <Input className="sm:col-span-2" placeholder="Institution" value={e.institution} onChange={(ev) => up({ institution: ev.target.value })} />
              <Input placeholder="End" value={e.end} onChange={(ev) => up({ end: ev.target.value })} />
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Projects (one per line: Name – description)"><Textarea value={p.projects.map((x) => [x.name, x.description].filter(Boolean).join(" – ")).join("\n")} onChange={(e) => set("projects", lines(e.target.value).map((l) => { const [name, ...rest] = l.split(" – "); return { name, description: rest.join(" – "), technologies: [], url: "" }; }))} /></Field>
        <Field label="Certifications (one per line)"><Textarea value={p.certifications.join("\n")} onChange={(e) => set("certifications", lines(e.target.value))} /></Field>
        <Field label="Languages (one per line: Language – level, e.g. German – B2)"><Textarea className={flag("languages")} value={p.languages.map((l) => `${l.language} – ${l.level}`).join("\n")} onChange={(e) => set("languages", lines(e.target.value).map((l) => { const [language, level = ""] = l.split(/\s*[–-]\s*/); return { language, level }; }))} /></Field>
        <Field label="Achievements (one per line)"><Textarea value={p.achievements.join("\n")} onChange={(e) => set("achievements", lines(e.target.value))} /></Field>
      </div>

      <div className={`grid gap-3 rounded-md border p-3 sm:grid-cols-4 ${flag("workAuthorization")}`}>
        <div className="sm:col-span-4 text-sm font-medium">Work authorization — never inferred. Answer only if you know it.</div>
        <Field label="Germany" hint='e.g. "Yes - EU citizen", "Yes - Blue Card", "No"'><Input value={p.workAuthorization.DE} onChange={(e) => set("workAuthorization", { ...p.workAuthorization, DE: e.target.value, source: "user" })} /></Field>
        <Field label="Netherlands"><Input value={p.workAuthorization.NL} onChange={(e) => set("workAuthorization", { ...p.workAuthorization, NL: e.target.value, source: "user" })} /></Field>
        <Field label="Requires visa sponsorship?">
          <Select value={p.workAuthorization.requiresSponsorship === null ? "" : String(p.workAuthorization.requiresSponsorship)} onChange={(e) => set("workAuthorization", { ...p.workAuthorization, requiresSponsorship: e.target.value === "" ? null : e.target.value === "true", source: "user" })}>
            <option value="">Unknown</option><option value="false">No</option><option value="true">Yes</option>
          </Select>
        </Field>
        <Field label="Willing to relocate?">
          <Select value={p.willingToRelocate === null ? "" : String(p.willingToRelocate)} onChange={(e) => set("willingToRelocate", e.target.value === "" ? null : e.target.value === "true")}>
            <option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option>
          </Select>
        </Field>
        <Field label="Salary expectation (EUR/year)"><Input type="number" value={p.salaryExpectationEur ?? ""} onChange={(e) => set("salaryExpectationEur", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Notice period"><Input value={p.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} /></Field>
        <Field label="Earliest start date"><Input value={p.earliestStart} onChange={(e) => set("earliestStart", e.target.value)} /></Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={pending || !dirty} onClick={() => start(async () => { const r = await saveProfileAction(JSON.stringify(p)); setMsg(r); if (r.ok) setDirty(false); router.refresh(); })}>Save changes</Button>
        <Button variant={approved && !dirty ? "outline" : "default"} disabled={pending || dirty} onClick={() => start(async () => { setMsg(await approveProfileAction()); router.refresh(); })}>
          {approved ? "Re-approve profile" : "I verified this — approve profile"}
        </Button>
        <span className="text-sm text-muted-foreground">{approved && !dirty ? "Approved: this profile is the source of truth for every application." : "Not approved: nothing will be applied until you approve."}</span>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.message}</span>}
      </div>
    </div>
  );
}
