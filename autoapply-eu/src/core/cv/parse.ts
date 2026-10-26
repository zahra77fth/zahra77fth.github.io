import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { canonicalSkill, findSkills } from "../skills";
import { ExtractionResult, Profile, ProfileSchema } from "../profile/schema";
import { chatJson, getLlmConfig } from "../llm";

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buf = await fs.readFile(filePath);
  if (ext === ".pdf") return normalizeText(await pdfText(buf));
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return normalizeText(value);
  }
  throw new Error(`Unsupported CV format: ${ext}`);
}

async function pdfText(buf: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const fontDir = path.join(path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")), "standard_fonts") + path.sep;
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, standardFontDataUrl: fontDir });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let line = "";
    const lines: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = "";
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
        lastY = null;
        continue;
      }
      lastY = y;
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  await task.destroy();
  return pages.join("\n");
}

export function normalizeText(t: string): string {
  return t
    .replace(/\r/g, "")
    .replace(/[\u2022\u25CF\u25AA\u2023\u2043\u25E6]/g, "•")
    .replace(/[ \t\u00A0]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SECTION_HEADINGS: Record<string, RegExp> = {
  summary: /^(summary|profile|professional summary|about( me)?|profil|kurzprofil|over mij|profiel|objective)$/i,
  experience: /^(experience|work experience|professional experience|employment( history)?|work history|career|berufserfahrung|beruflicher werdegang|werdegang|werkervaring|ervaring)$/i,
  education: /^(education|academic background|ausbildung|bildung|studium|opleiding(en)?)$/i,
  skills: /^(skills|technical skills|core skills|tech stack|technologies|competencies|kenntnisse|fähigkeiten|it-kenntnisse|vaardigheden)$/i,
  projects: /^(projects|personal projects|selected projects|projekte|projecten)$/i,
  certifications: /^(certifications?|certificates|licenses|zertifikate|zertifizierungen|certificaten)$/i,
  languages: /^(languages|language skills|sprachen|sprachkenntnisse|talen|talenkennis)$/i,
  achievements: /^(achievements|awards|accomplishments|erfolge|auszeichnungen|prestaties)$/i,
};

export function splitSections(text: string): Record<string, string[]> {
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const line of text.split("\n")) {
    const clean = line.replace(/[:•\-–|]+$/g, "").trim();
    const heading = Object.entries(SECTION_HEADINGS).find(([, re]) => clean.length < 40 && re.test(clean));
    if (heading) {
      current = heading[0];
      sections[current] ??= [];
      continue;
    }
    if (line) (sections[current] ??= []).push(line);
  }
  return sections;
}

const MONTH = "(?:jan|feb|m[aä]r|apr|ma[iy]|mei|jun|jul|aug|sep|sept|okt|oct|nov|de[cz])[a-zä]*\\.?";
const DATE = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})`;
const PRESENT = "(?:present|current|now|today|heute|aktuell|bis heute|heden|nu)";
export const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|bis|tot)\\s*(${DATE}|${PRESENT})`, "i");

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+|00)\d{1,3}[\s\-/.]?(?:\(0\)\s?)?\d{1,4}(?:[\s\-/.]?\d{2,4}){2,4}|\b0\d{2,4}[\s\-/]?\d{3,4}[\s\-/]?\d{2,5}\b/;
const URL = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,;)]*)?/gi;

const LANGS = ["english", "german", "dutch", "french", "spanish", "italian", "persian", "farsi", "turkish", "arabic", "russian", "polish", "portuguese", "chinese", "hindi", "deutsch", "englisch", "niederländisch", "nederlands", "engels", "duits"];
const LANG_LEVEL = /\b(native|mother tongue|bilingual|fluent|proficient|professional( working)?|advanced|upper[- ]intermediate|intermediate|conversational|basic|elementary|beginner|muttersprache|fließend|verhandlungssicher|gut|grundkenntnisse|moedertaal|vloeiend|goed|[abc][12])\b/i;

function looksLikeName(line: string) {
  return /^[\p{L}'’.-]+(?: [\p{L}'’.-]+){1,3}$/u.test(line) && !EMAIL.test(line) && line.length < 50 && !/\d/.test(line);
}

function parseExperience(lines: string[]): Profile["experience"] {
  const entries: Profile["experience"] = [];
  const idx = lines.map((l, i) => (DATE_RANGE.test(l) ? i : -1)).filter((i) => i >= 0);
  idx.forEach((di, k) => {
    const line = lines[di];
    const m = line.match(DATE_RANGE)!;
    const rest = line.replace(m[0], "").replace(/^[\s|,–-]+|[\s|,–-]+$/g, "");
    const prevStart = k === 0 ? 0 : idx[k - 1] + 1;
    const headerLines: string[] = [];
    if (rest) headerLines.push(rest);
    // Header lines are the non-bullet lines directly above the date that don't belong to the previous entry's bullets.
    for (let j = di - 1; j >= prevStart && headerLines.length < 2; j--) {
      if (lines[j].startsWith("•") || lines[j].length > 90) break;
      headerLines.unshift(lines[j]);
    }
    const next = k + 1 < idx.length ? idx[k + 1] : lines.length;
    const body: string[] = [];
    for (let j = di + 1; j < next; j++) body.push(lines[j]);
    // Drop trailing header lines that belong to the next entry.
    if (k + 1 < idx.length) {
      let trailing = 0;
      for (let j = body.length - 1; j >= 0 && trailing < 2 && !body[j].startsWith("•") && body[j].length <= 90; j--) trailing++;
      body.splice(body.length - trailing, trailing);
    }
    const [first = "", second = ""] = headerLines;
    const split = first.split(/\s+(?:at|@|bei|bij)\s+|\s*[|,–—]\s*/i);
    const title = split.length > 1 ? split[0] : first;
    const company = split.length > 1 ? split.slice(1).join(", ") : second;
    const bullets = body.map((b) => b.replace(/^•\s*/, "")).filter(Boolean);
    const end = m[2];
    entries.push({
      title: title.trim(),
      company: company.trim(),
      location: "",
      start: m[1],
      end,
      current: new RegExp(PRESENT, "i").test(end),
      bullets,
      technologies: findSkills([first, second, ...bullets].join("\n")),
    });
  });
  return entries;
}

function parseEducation(lines: string[]): Profile["education"] {
  const out: Profile["education"] = [];
  const degreeRe = /(bachelor|master|b\.?sc|m\.?sc|b\.?a\.?|m\.?a\.?|ph\.?d|diplom|degree|abitur|bsc|msc|hbo|mbo|wo\b|associate)/i;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!degreeRe.test(l)) continue;
    const dates = l.match(DATE_RANGE) ?? lines[i + 1]?.match(DATE_RANGE) ?? lines[i - 1]?.match(DATE_RANGE);
    const year = !dates ? (l.match(/\b(19|20)\d{2}\b/) ?? lines[i + 1]?.match(/\b(19|20)\d{2}\b/)) : null;
    const parts = l.replace(dates?.[0] ?? "", "").split(/\s*[|,–—]\s*|\s+(?:at|an der|aan de)\s+/i).filter(Boolean);
    const institution = parts[1] ?? (lines[i + 1] && !DATE_RANGE.test(lines[i + 1]) && !degreeRe.test(lines[i + 1]) ? lines[i + 1] : "");
    out.push({
      degree: parts[0]?.trim() ?? l,
      institution: institution.trim(),
      start: dates?.[1] ?? "",
      end: dates?.[2] ?? year?.[0] ?? "",
      details: "",
    });
  }
  return out;
}

function parseLanguages(lines: string[], whole: string): Profile["languages"] {
  const out: Profile["languages"] = [];
  const pool = lines.length ? lines.join("\n").split(/\n|,|;|•/) : whole.split(/\n/);
  for (const raw of pool) {
    const seg = raw.trim();
    const lang = LANGS.find((L) => new RegExp(`\\b${L}\\b`, "i").test(seg));
    if (!lang) continue;
    const level = seg.match(LANG_LEVEL)?.[0] ?? "";
    if (!lines.length && !level) continue;
    const display = seg.match(new RegExp(`\\b${lang}\\b`, "i"))![0];
    if (!out.some((o) => o.language.toLowerCase() === display.toLowerCase())) out.push({ language: display, level });
  }
  return out;
}

function parseProjects(lines: string[]): Profile["projects"] {
  const out: Profile["projects"] = [];
  let cur: Profile["projects"][number] | null = null;
  for (const l of lines) {
    const isBullet = l.startsWith("•");
    if (!isBullet && l.length <= 80) {
      if (cur) out.push(cur);
      const [name, ...rest] = l.split(/\s+[–—|-]\s+/);
      cur = { name: name.trim(), description: rest.join(" – "), technologies: [], url: (l.match(URL) ?? []).find((u) => /\//.test(u)) ?? "" };
    } else if (cur) {
      cur.description = [cur.description, l.replace(/^•\s*/, "")].filter(Boolean).join(" ");
    }
  }
  if (cur) out.push(cur);
  return out.map((p) => ({ ...p, technologies: findSkills(`${p.name} ${p.description}`) }));
}

export function heuristicExtract(text: string): ExtractionResult {
  const sections = splitSections(text);
  const header = sections.header ?? [];
  const uncertain: string[] = [];
  const urls = Array.from(text.matchAll(URL)).map((m) => m[0]).filter((u) => !EMAIL.test(u) && /[a-z]\.[a-z]/i.test(u) && !/^\d/.test(u));
  const fullName = header.find(looksLikeName) ?? "";
  if (fullName) uncertain.push("fullName");
  const locationLine = header.find((l) => /(germany|deutschland|netherlands|nederland|the netherlands|berlin|munich|münchen|hamburg|amsterdam|rotterdam|utrecht|eindhoven|cologne|köln|frankfurt|den haag|the hague)/i.test(l));
  const location = locationLine ? (locationLine.split(/[|•]/).find((p) => /(germany|deutschland|netherlands|nederland|berlin|munich|münchen|hamburg|amsterdam|rotterdam|utrecht|eindhoven|cologne|köln|frankfurt|haag|hague)/i.test(p)) ?? "").trim() : "";
  if (location) uncertain.push("location");

  const skillLines = sections.skills ?? [];
  const skillsFromSection = skillLines.join(", ").split(/[,;•|/]|\s{2,}|:\s/).map((s) => s.trim()).filter((s) => s && s.length < 40);
  const skills = Array.from(new Set([...findSkills(text), ...skillsFromSection.map(canonicalSkill).filter((s) => findSkills(s).length > 0)]));

  const experience = parseExperience(sections.experience ?? []);
  if (experience.length) uncertain.push("experience");
  const education = parseEducation(sections.education ?? []);
  if (education.length) uncertain.push("education");

  const authLine = text.split("\n").find((l) => /(work permit|work authori[sz]ation|right to work|eu citizen|blue card|blaue karte|aufenthaltstitel|arbeitserlaubnis|werkvergunning|visa)/i.test(l));

  const profile = ProfileSchema.parse({
    fullName,
    email: text.match(EMAIL)?.[0] ?? "",
    phone: text.match(PHONE)?.[0]?.trim() ?? "",
    location,
    headline: header.find((l) => l !== fullName && /(developer|engineer|entwickler|ontwikkelaar|designer|programmer)/i.test(l) && l.length < 80) ?? "",
    summary: (sections.summary ?? []).join(" "),
    links: {
      github: urls.find((u) => /github\.com\//i.test(u)) ?? "",
      linkedin: urls.find((u) => /linkedin\.com\//i.test(u)) ?? "",
      portfolio: urls.find((u) => !/(github|linkedin)\.com/i.test(u) && !/(gmail|outlook|hotmail|yahoo)\./i.test(u)) ?? "",
      other: [],
    },
    experience,
    education,
    skills,
    projects: parseProjects(sections.projects ?? []),
    certifications: (sections.certifications ?? []).map((l) => l.replace(/^•\s*/, "")),
    languages: parseLanguages(sections.languages ?? [], text),
    achievements: (sections.achievements ?? []).map((l) => l.replace(/^•\s*/, "")),
    workAuthorization: authLine ? { DE: authLine, NL: authLine, requiresSponsorship: null, source: "cv" } : undefined,
  });
  if (authLine) uncertain.push("workAuthorization");

  return { profile, uncertain, missing: missingFields(profile), method: "heuristic", droppedLlmFacts: [] };
}

export function missingFields(p: Profile): string[] {
  const missing: string[] = [];
  if (!p.fullName) missing.push("fullName");
  if (!p.email) missing.push("email");
  if (!p.phone) missing.push("phone");
  if (!p.location) missing.push("location");
  if (!p.experience.length) missing.push("experience");
  if (!p.skills.length) missing.push("skills");
  if (!p.languages.length) missing.push("languages");
  if (p.workAuthorization.source === "unknown") missing.push("workAuthorization");
  return missing;
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}@+]/gu, "");
}

/** True when every meaningful token sequence of `fact` can be found in the source text. */
export function factSupported(fact: string, sourceText: string): boolean {
  if (!fact.trim()) return true;
  const src = norm(sourceText);
  const f = norm(fact);
  if (src.includes(f)) return true;
  const words = fact.split(/\s+/).map(norm).filter((w) => w.length > 2);
  if (!words.length) return src.includes(f);
  const hits = words.filter((w) => src.includes(w)).length;
  return hits / words.length >= 0.8;
}

/** Lists profile facts that cannot be traced back to the CV text (unless the candidate entered them). */
export function verifyProfileAgainstText(p: Profile, text: string, userProvided: Set<string> = new Set()): string[] {
  const issues: string[] = [];
  const check = (key: string, value: string) => {
    if (value && !userProvided.has(key) && !factSupported(value, text)) issues.push(`${key}: "${value}"`);
  };
  check("fullName", p.fullName);
  check("email", p.email);
  check("phone", p.phone.replace(/\s/g, ""));
  p.experience.forEach((e, i) => {
    check(`experience[${i}].title`, e.title);
    check(`experience[${i}].company`, e.company);
    check(`experience[${i}].start`, e.start);
    e.bullets.forEach((b, j) => check(`experience[${i}].bullets[${j}]`, b));
  });
  p.education.forEach((e, i) => {
    check(`education[${i}].degree`, e.degree);
    check(`education[${i}].institution`, e.institution);
  });
  p.skills.forEach((s, i) => {
    if (!userProvided.has(`skills[${i}]`) && !userProvided.has("skills") && findSkills(text).indexOf(s) < 0 && !factSupported(s, text)) issues.push(`skills[${i}]: "${s}"`);
  });
  p.certifications.forEach((c, i) => check(`certifications[${i}]`, c));
  p.languages.forEach((l, i) => check(`languages[${i}]`, l.language));
  return issues;
}

const LLM_SYSTEM = `You extract structured data from a CV. Output JSON matching the requested keys.
Rules: copy facts exactly as written in the CV. Never infer, embellish, translate, or add anything not written.
Leave a field empty ("" or []) if the CV does not state it. Do not guess work authorization, visa, salary or language levels.`;

export async function extractProfile(text: string): Promise<ExtractionResult> {
  const base = heuristicExtract(text);
  const cfg = await getLlmConfig().catch(() => null);
  if (!cfg) return base;
  try {
    const llm = await chatJson<Partial<Profile>>(
      cfg,
      LLM_SYSTEM,
      `Keys: fullName,email,phone,location,headline,summary,links{github,linkedin,portfolio},experience[{title,company,location,start,end,current,bullets[]}],education[{degree,institution,start,end}],skills[],projects[{name,description,url}],certifications[],languages[{language,level}],achievements[].\n\nCV:\n${text.slice(0, 30_000)}`,
    );
    const merged = ProfileSchema.parse({ ...base.profile, ...stripEmpty(llm), workAuthorization: base.profile.workAuthorization });
    merged.skills = Array.from(new Set([...base.profile.skills, ...merged.skills.map(canonicalSkill)]));
    merged.experience = merged.experience.map((e) => ({ ...e, technologies: findSkills([e.title, ...e.bullets].join("\n")) }));
    // Any LLM fact not traceable to the CV text is removed rather than trusted.
    const issues = verifyProfileAgainstText(merged, text);
    const cleaned = dropUnsupported(merged, issues);
    return {
      profile: cleaned,
      uncertain: Array.from(new Set([...base.uncertain, "experience", "education"])),
      missing: missingFields(cleaned),
      method: "heuristic+llm",
      droppedLlmFacts: issues,
    };
  } catch {
    return base;
  }
}

function stripEmpty(o: Partial<Profile>): Partial<Profile> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out as Partial<Profile>;
}

function dropUnsupported(p: Profile, issues: string[]): Profile {
  const copy: Profile = structuredClone(p);
  for (const issue of issues) {
    const key = issue.split(":")[0];
    const m = key.match(/^(\w+)(?:\[(\d+)\])?(?:\.(\w+))?(?:\[(\d+)\])?$/);
    if (!m) continue;
    const [, field, i, sub, j] = m;
    const target = copy as unknown as Record<string, unknown>;
    if (i === undefined) target[field] = "";
    else if (!sub) (target[field] as unknown[])[Number(i)] = undefined;
    else if (j !== undefined) ((target[field] as Record<string, unknown[]>[])[Number(i)][sub] as unknown[])[Number(j)] = undefined;
    else (target[field] as Record<string, unknown>[])[Number(i)][sub] = "";
  }
  copy.skills = copy.skills.filter(Boolean);
  copy.certifications = copy.certifications.filter(Boolean);
  copy.languages = copy.languages.filter(Boolean);
  copy.experience = copy.experience.map((e) => ({ ...e, bullets: e.bullets.filter(Boolean) })).filter((e) => e.title);
  copy.education = copy.education.filter((e) => e.degree);
  return copy;
}
