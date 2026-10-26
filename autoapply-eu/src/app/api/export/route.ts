import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Full data export (GDPR-style). Secrets are never exported. */
export async function GET() {
  if (!(await currentSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [profile, settings, jobs, applications, transitions, attempts, answers, events, runs, sources] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { id: "singleton" } }),
    getSettings(),
    prisma.job.findMany(),
    prisma.application.findMany(),
    prisma.stateTransition.findMany(),
    prisma.applicationAttempt.findMany(),
    prisma.screeningAnswer.findMany(),
    prisma.event.findMany(),
    prisma.pipelineRun.findMany(),
    prisma.source.findMany(),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), profile, settings, jobs, applications, transitions, attempts, screeningAnswers: answers, events, runs, sources }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="autoapply-eu-export-${new Date().toISOString().slice(0, 10)}.json"` } });
}
