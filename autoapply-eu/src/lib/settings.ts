import { z } from "zod";
import { prisma } from "./db";
import { decrypt, encrypt } from "./crypto";

export const DEFAULT_ROLES = [
  "Frontend Developer",
  "Frontend Engineer",
  "Front-End Software Engineer",
  "React Developer",
  "React Engineer",
  "Next.js Developer",
  "TypeScript Developer",
  "JavaScript Developer",
  "Web Developer",
  "UI Engineer",
  "Frontend Software Developer",
  "Software Engineer Frontend",
  "Frontend Application Developer",
  "React / TypeScript Engineer",
  "Full Stack Developer",
  "Web Application Developer",
  "UI Developer",
  "Frontend Entwickler",
  "Webentwickler",
  "React Entwickler",
  "Frontend Ontwikkelaar",
  "Softwareontwikkelaar Frontend",
];

export const SettingsSchema = z.object({
  targetCountries: z.array(z.enum(["DE", "NL"])).default(["DE", "NL"]),
  targetRoles: z.array(z.string()).default(DEFAULT_ROLES),
  remotePreferences: z.array(z.enum(["ONSITE", "HYBRID", "REMOTE"])).default(["ONSITE", "HYBRID", "REMOTE"]),
  minSalaryEur: z.number().int().nonnegative().nullable().default(null),
  coverLetterLanguages: z.array(z.enum(["en", "de", "nl"])).default(["en"]),
  excludeSeniority: z.array(z.string()).default(["principal", "director", "head of", "vp", "intern", "werkstudent", "working student", "stage", "stagiair"]),
  excludeCompanies: z.array(z.string()).default([]),
  autoSubmit: z.boolean().default(false),
  discoveryOnly: z.boolean().default(true),
  schedule: z.string().default("0 7 * * *"),
  timezone: z.string().default("Europe/Berlin"),
  paused: z.boolean().default(false),
  emergencyStop: z.boolean().default(false),
  notifyEmail: z.string().nullable().default(null),
  notificationsEnabled: z.boolean().default(false),
  maxApplicationsPerRun: z.number().int().positive().default(200),
  domainMinIntervalMs: z.number().int().nonnegative().default(1500),
  applyDomainMinIntervalMs: z.number().int().nonnegative().default(60_000),
  enabledSources: z.record(z.string(), z.boolean()).default({}),
  careerSites: z.array(z.string().url()).default([]),
  autoLearnBoards: z.boolean().default(true),
  companyBoards: z
    .object({
      greenhouse: z.array(z.string()).default([]),
      lever: z.array(z.string()).default([]),
      ashby: z.array(z.string()).default([]),
      smartrecruiters: z.array(z.string()).default([]),
      recruitee: z.array(z.string()).default([]),
      personio: z.array(z.string()).default([]),
      workday: z.array(z.string()).default([]),
    })
    .default({ greenhouse: [], lever: [], ashby: [], smartrecruiters: [], recruitee: [], personio: [], workday: [] }),
});

export type Settings = z.infer<typeof SettingsSchema>;

const KEY = "app";

export async function getSettings(): Promise<Settings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return SettingsSchema.parse(row?.value ?? {});
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = SettingsSchema.parse({ ...current, ...patch });
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next },
    update: { value: next },
  });
  return next;
}

export async function setSecret(key: string, value: string) {
  const ciphertext = encrypt(value);
  await prisma.secret.upsert({ where: { key }, create: { key, ciphertext }, update: { ciphertext } });
}

export async function getSecret(key: string): Promise<string | undefined> {
  const row = await prisma.secret.findUnique({ where: { key } });
  if (!row) return undefined;
  return decrypt(row.ciphertext);
}

export async function hasSecret(key: string): Promise<boolean> {
  return (await prisma.secret.count({ where: { key } })) > 0;
}
