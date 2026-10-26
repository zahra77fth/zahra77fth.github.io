import type { Settings } from "@/lib/settings";
import { languageLevel, type Profile } from "../profile/schema";
import { findSkills } from "../skills";
import { chatJson, getLlmConfig } from "../llm";
import { unsupportedClaims, type JobForDocs } from "./tailor";

export type Lang = "en" | "de" | "nl";

export function chooseLanguage(job: JobForDocs, profile: Profile, settings: Settings): Lang {
  if (job.descriptionLang === "de" && settings.coverLetterLanguages.includes("de") && languageLevel(profile, "german") >= 3) return "de";
  if (job.descriptionLang === "nl" && settings.coverLetterLanguages.includes("nl") && languageLevel(profile, "dutch") >= 3) return "nl";
  return "en";
}

/** Picks requirement lines from the posting that the candidate can truthfully speak to. */
export function matchedRequirements(job: JobForDocs, profile: Profile, max = 3): { line: string; skills: string[] }[] {
  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const lines = job.descriptionText
    .split(/\n|•/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && l.length < 220);
  const scored = lines
    .map((line) => ({ line, skills: findSkills(line).filter((s) => mine.has(s.toLowerCase())) }))
    .filter((x) => x.skills.length > 0);
  const out: { line: string; skills: string[] }[] = [];
  const used = new Set<string>();
  for (const x of scored.sort((a, b) => b.skills.length - a.skills.length)) {
    if (x.skills.every((s) => used.has(s))) continue;
    x.skills.forEach((s) => used.add(s));
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

function evidenceBullets(profile: Profile, skills: string[], max = 2): { bullet: string; role: string; company: string }[] {
  const out: { bullet: string; role: string; company: string; score: number }[] = [];
  for (const e of profile.experience) {
    for (const b of e.bullets) {
      const s = findSkills(b).filter((x) => skills.includes(x)).length;
      if (s) out.push({ bullet: b.replace(/\.$/, ""), role: e.title, company: e.company, score: s });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}

function list(items: string[], lang: Lang) {
  const and = lang === "de" ? "und" : lang === "nl" ? "en" : "and";
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

export interface CoverLetter {
  language: Lang;
  subject: string;
  body: string;
  usedLlm: boolean;
  rejectedClaims?: string[];
}

export function composeCoverLetter(profile: Profile, job: JobForDocs, lang: Lang): CoverLetter {
  const jobSkills = findSkills(`${job.title}\n${job.descriptionText}`);
  const matched = profile.skills.filter((s) => jobSkills.includes(s)).slice(0, 5);
  const reqs = matchedRequirements(job, profile);
  const recent = profile.experience[0];
  const proof = evidenceBullets(profile, matched);
  const project = profile.projects.find((p) => findSkills(`${p.name} ${p.description} ${p.technologies.join(" ")}`).some((s) => matched.includes(s)));
  const name = profile.fullName;
  const T = {
    en: {
      subject: `Application for ${job.title}`,
      greet: "Dear Hiring Team,",
      intro: `I am applying for the ${job.title} position at ${job.company}.${recent ? ` I currently work as ${recent.title}${recent.company ? ` at ${recent.company}` : ""}, ` : " "}${matched.length ? `and my day-to-day work with ${list(matched, "en")} lines up closely with what you describe.` : "and I would like to bring my frontend experience to your team."}`,
      reqIntro: "Your posting asks for:",
      proofIntro: "Examples from my experience:",
      project: project ? `I also built ${project.name}${project.description ? `: ${project.description.replace(/\.$/, "")}` : ""}.` : "",
      close: `I would welcome the opportunity to discuss how I can contribute to ${job.company}. My CV is attached.`,
      sign: "Kind regards,",
    },
    de: {
      subject: `Bewerbung als ${job.title}`,
      greet: "Sehr geehrtes Recruiting-Team,",
      intro: `hiermit bewerbe ich mich auf die Position ${job.title} bei ${job.company}.${recent ? ` Derzeit arbeite ich als ${recent.title}${recent.company ? ` bei ${recent.company}` : ""}` : ""}${matched.length ? `, wobei ich täglich mit ${list(matched, "de")} arbeite – genau den Technologien, die Sie suchen.` : "."}`,
      reqIntro: "In Ihrer Ausschreibung nennen Sie:",
      proofIntro: "Beispiele aus meiner Erfahrung:",
      project: project ? `Außerdem habe ich ${project.name} umgesetzt${project.description ? `: ${project.description.replace(/\.$/, "")}` : ""}.` : "",
      close: `Über die Gelegenheit, mich persönlich vorzustellen, freue ich mich. Meinen Lebenslauf finden Sie im Anhang.`,
      sign: "Mit freundlichen Grüßen",
    },
    nl: {
      subject: `Sollicitatie ${job.title}`,
      greet: "Beste recruiter,",
      intro: `Met veel interesse solliciteer ik naar de functie ${job.title} bij ${job.company}.${recent ? ` Momenteel werk ik als ${recent.title}${recent.company ? ` bij ${recent.company}` : ""}` : ""}${matched.length ? `, waarbij ik dagelijks werk met ${list(matched, "nl")}.` : "."}`,
      reqIntro: "In de vacature vraagt u om:",
      proofIntro: "Voorbeelden uit mijn ervaring:",
      project: project ? `Daarnaast heb ik ${project.name} gebouwd${project.description ? `: ${project.description.replace(/\.$/, "")}` : ""}.` : "",
      close: `Ik licht mijn motivatie graag toe in een gesprek. Mijn cv is bijgevoegd.`,
      sign: "Met vriendelijke groet,",
    },
  }[lang];
  const parts = [T.greet, "", T.intro];
  if (reqs.length) parts.push("", T.reqIntro, ...reqs.map((r) => `• ${r.line.replace(/^[-–•]\s*/, "")}`));
  if (proof.length) parts.push("", T.proofIntro, ...proof.map((p) => `• ${p.bullet} (${p.role}${p.company ? `, ${p.company}` : ""})`));
  if (T.project) parts.push("", T.project);
  parts.push("", T.close, "", T.sign, name);
  return { language: lang, subject: T.subject, body: parts.join("\n"), usedLlm: false };
}

export async function generateCoverLetter(profile: Profile, job: JobForDocs, settings: Settings): Promise<CoverLetter> {
  const lang = chooseLanguage(job, profile, settings);
  const base = composeCoverLetter(profile, job, lang);
  const cfg = await getLlmConfig().catch(() => null);
  if (!cfg) return base;
  try {
    const out = await chatJson<{ body?: string }>(
      cfg,
      `You write concise, specific cover letters (max 250 words) in ${lang === "de" ? "German" : lang === "nl" ? "Dutch" : "English"}. Use ONLY facts from the candidate JSON. Never invent technologies, employers, numbers, years of experience, degrees, or achievements. Avoid clichés. Return JSON {"body": string} with greeting and sign-off using the candidate's name.`,
      JSON.stringify({ job: { company: job.company, title: job.title, description: job.descriptionText.slice(0, 5000) }, candidate: profile, draft: base.body }),
    );
    const body = (out.body ?? "").trim();
    const rejected = unsupportedClaims(body, profile, job);
    if (!body || rejected.length || !body.includes(job.company)) return { ...base, rejectedClaims: rejected };
    return { ...base, body, usedLlm: true };
  } catch {
    return base;
  }
}
