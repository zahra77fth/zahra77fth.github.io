import path from "node:path";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Settings } from "@/lib/settings";
import type { Profile } from "../profile/schema";
import { generateCoverLetter } from "./coverLetter";
import { cvDocx, cvPdf, letterDocx, letterPdf, safeName, writeFile } from "./render";
import { improveSummary, tailorCv } from "./tailor";

export function applicationDir(applicationId: string) {
  return path.join(env.storageDir, "applications", applicationId);
}

export async function generateDocuments(applicationId: string, profile: Profile, settings: Settings) {
  const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { job: true } });
  const job = app.job;
  const cv = tailorCv(profile, job);
  const improved = await improveSummary(cv, profile, job);
  cv.summary = improved.summary;
  const letter = await generateCoverLetter(profile, job, settings);
  const lang = letter.language;
  const dir = applicationDir(app.id);
  const base = `${safeName(profile.fullName || "CV")}_${safeName(job.company)}`;
  const sender = { name: profile.fullName, contact: [profile.email, profile.phone, profile.location].filter(Boolean) };
  const recipient = { company: job.company, city: job.city };
  const [resumePdfPath, resumeDocxPath, coverPdfPath, coverDocxPath, coverTxtPath] = await Promise.all([
    writeFile(dir, `${base}_CV.pdf`, await cvPdf(cv, lang)),
    writeFile(dir, `${base}_CV.docx`, await cvDocx(cv, lang)),
    writeFile(dir, `${base}_CoverLetter.pdf`, await letterPdf(letter, sender, recipient)),
    writeFile(dir, `${base}_CoverLetter.docx`, await letterDocx(letter, sender, recipient)),
    writeFile(dir, `${base}_CoverLetter.txt`, `${letter.subject}\n\n${letter.body}\n`),
  ]);
  await writeFile(dir, "tailoring.json", JSON.stringify({ cv, letter: { ...letter, body: undefined }, summaryRejected: improved.rejected ?? [] }, null, 2));
  return { resumePdfPath, resumeDocxPath, coverPdfPath, coverDocxPath, coverTxtPath, coverLanguage: lang, coverText: letter.body };
}
