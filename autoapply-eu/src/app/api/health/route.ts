import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/core/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }
  try {
    checks.redis = (await redis().ping()) === "PONG" ? "ok" : "error";
  } catch {
    checks.redis = "error";
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json({ status: ok ? "ok" : "degraded", checks }, { status: ok ? 200 : 503 });
}
