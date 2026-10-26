import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await currentSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, kind } = await params;
  const attempt = await prisma.applicationAttempt.findUnique({ where: { id } });
  if (!attempt) return NextResponse.json({ error: "not found" }, { status: 404 });
  const file = kind === "screenshot" ? attempt.screenshotPath : kind === "html" ? attempt.htmlPath : kind === "before-submit" ? attempt.screenshotPath?.replace(/final\.png$/, "before-submit.png") : null;
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  const resolved = path.resolve(file);
  if (!resolved.startsWith(env.storageDir + path.sep)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const data = await fs.readFile(resolved).catch(() => null);
  if (!data) return NextResponse.json({ error: "file missing" }, { status: 404 });
  // Captured HTML is served as plain text so third-party scripts never execute in the dashboard origin.
  return new NextResponse(new Uint8Array(data), { headers: { "content-type": kind === "html" ? "text/plain; charset=utf-8" : "image/png", "cache-control": "private, no-store" } });
}
