import { z } from "zod";

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string().default(""),
  location: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  details: z.string().default(""),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  url: z.string().default(""),
});

export const LanguageSchema = z.object({
  language: z.string(),
  level: z.string().default(""),
});

export const ProfileSchema = z.object({
  fullName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  links: z
    .object({
      github: z.string().default(""),
      linkedin: z.string().default(""),
      portfolio: z.string().default(""),
      other: z.array(z.string()).default([]),
    })
    .default({ github: "", linkedin: "", portfolio: "", other: [] }),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  skills: z.array(z.string()).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(LanguageSchema).default([]),
  achievements: z.array(z.string()).default([]),
  // Only ever set from the CV text or by the candidate; never inferred.
  workAuthorization: z
    .object({
      DE: z.string().default(""),
      NL: z.string().default(""),
      requiresSponsorship: z.boolean().nullable().default(null),
      source: z.enum(["cv", "user", "unknown"]).default("unknown"),
    })
    .default({ DE: "", NL: "", requiresSponsorship: null, source: "unknown" }),
  salaryExpectationEur: z.number().int().nullable().default(null),
  noticePeriod: z.string().default(""),
  earliestStart: z.string().default(""),
  willingToRelocate: z.boolean().nullable().default(null),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;

export interface ExtractionResult {
  profile: Profile;
  uncertain: string[];
  missing: string[];
  method: "heuristic" | "heuristic+llm";
  droppedLlmFacts: string[];
}

export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function languageLevel(profile: Profile, language: string): number {
  const aliases: Record<string, string[]> = {
    english: ["english", "englisch", "engels"],
    german: ["german", "deutsch", "duits"],
    dutch: ["dutch", "niederländisch", "nederlands"],
  };
  const names = aliases[language.toLowerCase()] ?? [language.toLowerCase()];
  const entry = profile.languages.find((l) => names.includes(l.language.trim().toLowerCase()));
  if (!entry) return -1;
  const lvl = entry.level.toLowerCase();
  const cefr = lvl.match(/\b([abc][12])\b/i);
  if (cefr) return CEFR_ORDER.indexOf(cefr[1].toUpperCase());
  if (/native|mother|muttersprach|moedertaal|bilingual/.test(lvl)) return 6;
  if (/fluent|fließend|fliessend|vloeiend|proficient|verhandlungssicher/.test(lvl)) return 5;
  if (/advanced|professional|gut|goed|upper/.test(lvl)) return 3;
  if (/intermediate|conversational|grundkenntnisse|basic|elementary|beginner/.test(lvl)) return 1;
  return 0;
}
