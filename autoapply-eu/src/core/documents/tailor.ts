import type { Profile } from "../profile/schema";
import { countSkillMentions, findSkills } from "../skills";
import { chatJson, getLlmConfig } from "../llm";

export interface JobForDocs {
  company: string;
  title: string;
  descriptionText: string;
  descriptionLang: string | null;
  city: string | null;
  country: string | null;
}

export interface TailoredCv {
  fullName: string;
  headline: string;
  contact: string[];
  summary: string;
  skills: { primary: string[]; other: string[] };
  experience: { title: string; company: string; location: string; period: string; bullets: string[] }[];
  projects: { name: string; description: string; technologies: string[]; url: string }[];
  education: { degree: string; institution: string; period: string }[];
  certifications: string[];
  languages: string[];
}

function relevance(text: string, jobSkills: string[], jobText: string): number {
  let s = 0;
  for (const sk of findSkills(text)) if (jobSkills.includes(sk)) s += 2 + Math.min(3, countSkillMentions(jobText, sk));
  const words = new Set(jobText.toLowerCase().match(/[a-zäöüß]{5,}/g) ?? []);
  for (const w of text.toLowerCase().match(/[a-zäöüß]{5,}/g) ?? []) if (words.has(w)) s += 0.1;
  return s;
}

/** Everything in a tailored CV is selected and reordered from the verified profile; nothing is added. */
export function tailorCv(profile: Profile, job: JobForDocs): TailoredCv {
  const jobText = `${job.title}\n${job.descriptionText}`;
  const jobSkills = findSkills(jobText);
  const mine = profile.skills;
  const primary = mine
    .filter((s) => jobSkills.includes(s))
    .sort((a, b) => countSkillMentions(jobText, b) - countSkillMentions(jobText, a));
  const other = mine.filter((s) => !primary.includes(s));

  const experience = profile.experience.map((e) => {
    const ranked = e.bullets.map((b, i) => ({ b, i, r: relevance(b, jobSkills, jobText) })).sort((x, y) => y.r - x.r || x.i - y.i);
    const keep = ranked.slice(0, Math.max(4, ranked.filter((x) => x.r > 0).length)).map((x) => x.b);
    return { title: e.title, company: e.company, location: e.location, period: [e.start, e.end || (e.current ? "Present" : "")].filter(Boolean).join(" – "), bullets: keep };
  });

  const projects = [...profile.projects]
    .map((p) => ({ p, r: relevance(`${p.name} ${p.description} ${p.technologies.join(" ")}`, jobSkills, jobText) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, 4)
    .map(({ p }) => p);

  const contact = [profile.location, profile.email, profile.phone, profile.links.linkedin, profile.links.github, profile.links.portfolio].filter(Boolean);
  return {
    fullName: profile.fullName,
    headline: profile.headline || profile.experience[0]?.title || "",
    contact,
    summary: profile.summary,
    skills: { primary, other },
    experience,
    projects,
    education: profile.education.map((e) => ({ degree: e.degree, institution: e.institution, period: [e.start, e.end].filter(Boolean).join(" – ") })),
    certifications: profile.certifications,
    languages: profile.languages.map((l) => (l.level ? `${l.language} (${l.level})` : l.language)),
  };
}

export function profileCorpus(p: Profile): string {
  return JSON.stringify(p);
}

/** Rejects generated prose that names technologies or figures absent from the verified profile. */
export function unsupportedClaims(generated: string, profile: Profile, job: JobForDocs): string[] {
  const corpus = profileCorpus(profile);
  const issues: string[] = [];
  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const inCorpus = new Set(findSkills(corpus).map((s) => s.toLowerCase()));
  for (const s of findSkills(generated)) if (!mine.has(s.toLowerCase()) && !inCorpus.has(s.toLowerCase())) issues.push(`technology "${s}"`);
  for (const n of generated.match(/\b\d+(?:[.,]\d+)?\s?(?:%|\+|years?|jahre|jaar|x)\b/gi) ?? []) {
    const digits = n.match(/\d+(?:[.,]\d+)?/)![0];
    if (!corpus.includes(digits)) issues.push(`figure "${n.trim()}"`);
  }
  const yearsClaim = generated.match(/(\d+)\+?\s*(years|jahre|jaar)/i);
  if (yearsClaim && !corpus.includes(yearsClaim[0])) issues.push(`experience claim "${yearsClaim[0]}"`);
  void job;
  return Array.from(new Set(issues));
}

export async function improveSummary(cv: TailoredCv, profile: Profile, job: JobForDocs): Promise<{ summary: string; usedLlm: boolean; rejected?: string[] }> {
  const cfg = await getLlmConfig().catch(() => null);
  if (!cfg || !profile.summary) return { summary: cv.summary, usedLlm: false };
  try {
    const out = await chatJson<{ summary?: string }>(
      cfg,
      "You edit CV summaries. Rephrase the candidate's own summary to foreground experience relevant to the job. Use ONLY facts present in the candidate data. Do not add technologies, numbers, years, titles, or achievements that are not in the data. Max 70 words. Return JSON {\"summary\": string}.",
      JSON.stringify({ candidateSummary: profile.summary, candidateSkills: profile.skills, experience: profile.experience.map((e) => ({ title: e.title, company: e.company, start: e.start, end: e.end })), jobTitle: job.title, jobCompany: job.company, jobExcerpt: job.descriptionText.slice(0, 3000) }),
    );
    const summary = (out.summary ?? "").trim();
    const rejected = unsupportedClaims(summary, profile, job);
    if (!summary || rejected.length) return { summary: cv.summary, usedLlm: false, rejected };
    return { summary, usedLlm: true };
  } catch {
    return { summary: cv.summary, usedLlm: false };
  }
}
