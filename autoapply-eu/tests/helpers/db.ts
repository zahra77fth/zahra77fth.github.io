import { prisma } from "@/lib/db";
import { ProfileSchema, type Profile } from "@/core/profile/schema";

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "StateTransition","ApplicationAttempt","Application","Job","Event","PipelineRun","NotificationLog","ScreeningAnswer","Source","Setting","Secret","CandidateProfile","Session","User" CASCADE',
  );
}

export async function seedApprovedProfile(p: Profile) {
  await prisma.candidateProfile.create({ data: { extracted: {}, data: ProfileSchema.parse(p), approvedAt: new Date() } });
}
