import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { extractProfile, extractText, missingFields, verifyProfileAgainstText } from "../cv/parse";
import { Profile, ProfileSchema } from "./schema";
import { recordEvent } from "../events";

export async function importCv(filePath: string) {
  const buf = await fs.readFile(filePath);
  const text = await extractText(filePath);
  if (text.length < 50) throw new Error("Could not extract readable text from this CV (is it a scanned image?)");
  const result = await extractProfile(text);
  const row = await prisma.candidateProfile.upsert({
    where: { id: "singleton" },
    create: {
      sourceFile: filePath,
      sourceSha256: sha256(buf),
      rawText: text,
      extracted: JSON.parse(JSON.stringify(result)),
      data: result.profile,
      approvedAt: null,
    },
    update: {
      sourceFile: filePath,
      sourceSha256: sha256(buf),
      rawText: text,
      extracted: JSON.parse(JSON.stringify(result)),
      data: result.profile,
      approvedAt: null,
    },
  });
  await recordEvent("profile.imported", `Imported CV ${filePath.split(/[\\/]/).pop()} (${result.method})`, {
    missing: result.missing,
    droppedLlmFacts: result.droppedLlmFacts.length,
  });
  return { row, result };
}

export async function getProfileRow() {
  return prisma.candidateProfile.findUnique({ where: { id: "singleton" } });
}

export async function saveProfile(data: unknown) {
  const profile = ProfileSchema.parse(data);
  await prisma.candidateProfile.upsert({
    where: { id: "singleton" },
    create: { extracted: {}, data: profile },
    update: { data: profile, approvedAt: null },
  });
  await recordEvent("profile.edited", "Candidate profile edited; re-approval required");
  return profile;
}

export async function approveProfile() {
  const row = await getProfileRow();
  if (!row) throw new Error("No profile to approve");
  const profile = ProfileSchema.parse(row.data);
  const missing = missingFields(profile).filter((m) => ["fullName", "email"].includes(m));
  if (missing.length) throw new Error(`Profile is missing required facts: ${missing.join(", ")}`);
  await prisma.candidateProfile.update({ where: { id: "singleton" }, data: { approvedAt: new Date() } });
  await recordEvent("profile.approved", "Candidate profile approved as source of truth");
}

/** The only accessor the pipeline uses: returns null unless the candidate has approved the profile. */
export async function getApprovedProfile(): Promise<Profile | null> {
  const row = await getProfileRow();
  if (!row?.approvedAt) return null;
  return ProfileSchema.parse(row.data);
}

export async function profileVerificationIssues() {
  const row = await getProfileRow();
  if (!row?.rawText) return [];
  return verifyProfileAgainstText(ProfileSchema.parse(row.data), row.rawText);
}
