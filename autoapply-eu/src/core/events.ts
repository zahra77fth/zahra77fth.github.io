import { prisma } from "@/lib/db";

export async function recordEvent(type: string, message: string, data?: Record<string, unknown>, ids?: { jobId?: string; runId?: string }) {
  await prisma.event.create({
    data: { type, message, data: data ? JSON.parse(JSON.stringify(data)) : undefined, jobId: ids?.jobId, runId: ids?.runId },
  });
}
