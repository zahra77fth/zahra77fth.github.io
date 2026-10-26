import type { Job } from "@prisma/client";
import type { Settings } from "@/lib/settings";
import { buildTitleFilter } from "../discovery/types";
import { languageLevel, type Profile } from "../profile/schema";
import { findSkills, skillDef } from "../skills";

export type Eligibility = "ELIGIBLE" | "NEEDS_CLARIFICATION" | "EXCLUDED";

export interface MatchResult {
  status: Eligibility;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  flags: string[];
  exclusion?: string;
}

const UNRELATED_TITLE = /\b(backend|back-end|ios|android|embedded|firmware|data engineer|machine learning|ml engineer|devops|sre|site reliability|security engineer|qa engineer|test engineer|sap|salesforce|network|hardware|mechanical|electrical)\b/i;
const FRONTEND_TITLE = /front[\s-]?end|react|next\.?js|vue|angular|svelte|typescript|javascript|\bui\b|\bweb\b|webentwickler|webontwikkelaar|full[\s-]?stack/i;

export function candidateYears(p: Profile, now = new Date()): number {
  let months = 0;
  for (const e of p.experience) {
    const s = parseLooseDate(e.start);
    const end = e.current ? now : parseLooseDate(e.end) ?? (/(present|heute|heden|current|now)/i.test(e.end) ? now : null);
    if (s && end && end > s) months += (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth();
  }
  return Math.round((months / 12) * 10) / 10;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, mär: 2, apr: 3, may: 4, mai: 4, mei: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, dez: 11 };

export function parseLooseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  let m = t.match(/^(\d{1,2})[/.](\d{4})$/);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = t.match(/^([a-zä]{3})[a-zä]*\.?\s+(\d{4})$/);
  if (m && m[1] in MONTHS) return new Date(Number(m[2]), MONTHS[m[1]], 1);
  m = t.match(/^(\d{4})(?:-(\d{2}))?/);
  if (m) return new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1);
  return null;
}

function languageRequirement(text: string, lang: "german" | "dutch"): "required" | "plus" | null {
  const names = lang === "german" ? "(german|deutsch(?:kenntnisse)?|deutsche[mn]?)" : "(dutch|nederlands|niederländisch)";
  const req = new RegExp(
    `(fluent|fluency|native|proficient|excellent|strong|business[- ]level|professional|verhandlungssicher|fließend|fliessend|sehr gute?|vloeiend|uitstekende?|goede?|c1|c2)[^.\\n]{0,40}${names}|${names}[^.\\n]{0,40}(required|is a must|mandatory|c1|c2|fluent|fließend|verhandlungssicher|vloeiend|vereist|erforderlich|voraussetzung)`,
    "i",
  );
  if (req.test(text)) {
    const plus = new RegExp(`${names}[^.\\n]{0,50}(is a plus|nice to have|bonus|von vorteil|wünschenswert|pre)|((plus|nice to have|bonus)[^.\\n]{0,30}${names})`, "i");
    return plus.test(text) ? "plus" : "required";
  }
  return null;
}

export function parseSalaryRange(text: string): { min: number; max: number } | null {
  const m = text.match(/(?:€|eur)\s?(\d{2,3})[.,]?(\d{3}|k)\s?(?:-|–|to|bis|tot)\s?(?:€|eur)?\s?(\d{2,3})[.,]?(\d{3}|k)|(\d{2,3})[.,]?(\d{3}|k)\s?(?:€|eur)?\s?(?:-|–|to|bis|tot)\s?(\d{2,3})[.,]?(\d{3}|k)\s?(?:€|eur)/i);
  if (!m) return null;
  const num = (a?: string, b?: string) => (!a || !b ? NaN : b.toLowerCase() === "k" ? Number(a) * 1000 : Number(a) * 1000 + Number(b));
  const min = m[1] ? num(m[1], m[2]) : num(m[5], m[6]);
  const max = m[3] ? num(m[3], m[4]) : num(m[7], m[8]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || max < 10_000) return null;
  return { min, max };
}

type JobLike = Pick<Job, "title" | "company" | "descriptionText" | "descriptionLang" | "remotePolicy" | "country" | "techStack">;

export function evaluateJob(job: JobLike, profile: Profile, settings: Settings): MatchResult {
  const reasons: string[] = [];
  const flags: string[] = [];
  const text = `${job.title}\n${job.descriptionText}`;
  const jobSkills = job.techStack.length ? job.techStack : findSkills(text);
  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const matchedSkills = jobSkills.filter((s) => mine.has(s.toLowerCase()));
  const missingSkills = jobSkills.filter((s) => !mine.has(s.toLowerCase()));
  const exclude = (why: string): MatchResult => ({ status: "EXCLUDED", score: 0, matchedSkills, missingSkills, reasons: [...reasons, why], flags, exclusion: why });

  const relevant = buildTitleFilter(settings.targetRoles);
  if (!relevant(job.title)) return exclude("Title is not a target frontend role");
  if (UNRELATED_TITLE.test(job.title) && !FRONTEND_TITLE.test(job.title.replace(UNRELATED_TITLE, ""))) return exclude("Role is not frontend-focused");
  if (/full[\s-]?stack/i.test(job.title)) {
    const fe = jobSkills.filter((s) => (skillDef(s)?.frontendWeight ?? 0) >= 2).length;
    if (fe < 2) flags.push("Full-stack role with limited frontend emphasis");
  }
  const seniorityHit = settings.excludeSeniority.find((w) => new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(job.title));
  if (seniorityHit) return exclude(`Seniority "${seniorityHit}" excluded in settings`);
  if (settings.excludeCompanies.some((c) => c && job.company.toLowerCase().includes(c.toLowerCase()))) return exclude("Company excluded in settings");
  if (job.remotePolicy !== "UNKNOWN" && !settings.remotePreferences.includes(job.remotePolicy as "ONSITE" | "HYBRID" | "REMOTE")) return exclude(`Workplace type ${job.remotePolicy} not in preferences`);

  let status: Eligibility = "ELIGIBLE";
  for (const lang of ["german", "dutch"] as const) {
    const req = languageRequirement(job.descriptionText, lang);
    const lvl = languageLevel(profile, lang);
    const postingInLang = job.descriptionLang === (lang === "german" ? "de" : "nl");
    if (req === "required") {
      if (lvl >= 3) reasons.push(`Requires ${lang}; profile level OK`);
      else if (lvl < 0 && !profile.languages.length) {
        status = "NEEDS_CLARIFICATION";
        flags.push(`Requires ${lang}; your language levels are not in the profile`);
      } else return exclude(`Requires fluent ${lang}; profile does not list it at B2 or above`);
    } else if (req === "plus") {
      if (lvl < 3) flags.push(`${lang} is a plus`);
    } else if (postingInLang && lvl < 3) {
      status = "NEEDS_CLARIFICATION";
      flags.push(`Posting is written in ${lang}; ${lang} proficiency may be expected`);
    }
  }

  if (/(no|not able to|unable to|cannot|can't|do not) (offer |provide )?(visa )?sponsor/i.test(job.descriptionText) || /(must|need to) (already )?(have|hold) (the )?(right|permit|authori[sz]ation) to work/i.test(job.descriptionText)) {
    if (profile.workAuthorization.requiresSponsorship === true) return exclude("Posting offers no visa sponsorship; profile requires sponsorship");
    if (profile.workAuthorization.requiresSponsorship === null) {
      status = "NEEDS_CLARIFICATION";
      flags.push("Posting requires existing work authorization; yours is not confirmed in the profile");
    }
  }

  const salary = parseSalaryRange(job.descriptionText);
  if (salary && settings.minSalaryEur && salary.max < settings.minSalaryEur) return exclude(`Salary range up to €${salary.max} is below your minimum €${settings.minSalaryEur}`);

  if (job.country === "EU_REMOTE") flags.push("EU-wide remote: confirm your country of residence is accepted");

  // Score: skills 60, title 20, seniority 10, preferences 10.
  const w = (s: string) => skillDef(s)?.frontendWeight ?? 1;
  const total = jobSkills.reduce((n, s) => n + w(s), 0);
  const got = matchedSkills.reduce((n, s) => n + w(s), 0);
  let score = total ? (got / total) * 60 : 25;
  score += /front[\s-]?end|react|next\.?js|ui engineer|ui developer/i.test(job.title) ? 20 : 10;
  const years = candidateYears(profile);
  const senior = /\b(senior|sr\.?|lead|staff)\b/i.test(job.title);
  const junior = /\b(junior|jr\.?|entry|graduate|trainee)\b/i.test(job.title);
  if (senior && years < 4) {
    score += 2;
    flags.push(`Senior-level title; profile shows ~${years} years`);
  } else if (junior && years > 6) score += 5;
  else score += 10;
  score += job.remotePolicy === "UNKNOWN" ? 5 : 10;
  if (matchedSkills.length) reasons.push(`Matches ${matchedSkills.length}/${jobSkills.length} listed technologies: ${matchedSkills.slice(0, 8).join(", ")}`);
  if (missingSkills.length) reasons.push(`Not in your profile: ${missingSkills.slice(0, 8).join(", ")}`);
  return { status, score: Math.max(1, Math.min(100, Math.round(score))), matchedSkills, missingSkills, reasons, flags };
}
