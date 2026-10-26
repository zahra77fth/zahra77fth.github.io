import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const KINDS = {
  "resume-pdf": ["resumePdfPath", "application/pdf"],
  "resume-docx": ["resumeDocxPath", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "cover-pdf": ["coverPdfPath", "application/pdf"],
  "cover-docx": ["coverDocxPath", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  "cover-txt": ["coverTxtPath", "text/plain; charset=utf-8"],
} as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await currentSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, kind } = await params;
  const spec = KINDS[kind as keyof typeof KINDS];
  if (!spec) return NextResponse.json({ error: "unknown kind" }, { status: 404 });
  const app = await prisma.application.findUnique({ where: { id } });
  const file = app?.[spec[0]];
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  const resolved = path.resolve(file);
  if (!resolved.startsWith(env.storageDir + path.sep)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const data = await fs.readFile(resolved);
  return new NextResponse(new Uint8Array(data), { headers: { "content-type": spec[1], "content-disposition": `attachment; filename="${path.basename(resolved)}"`, "cache-control": "private, no-store" } });
}
