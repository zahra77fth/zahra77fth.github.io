import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./crypto";

export const SESSION_COOKIE = "aa_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (>=16 chars)");
  return s;
}

export function sign(value: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null;
}

export async function hasAnyUser() {
  return (await prisma.user.count()) > 0;
}

export async function createUser(username: string, password: string) {
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  if (await hasAnyUser()) throw new Error("A dashboard user already exists");
  return prisma.user.create({ data: { username, passwordHash: hashPassword(password) } });
}

export async function login(username: string, password: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const id = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { id, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  return sign(id);
}

export async function sessionFromCookie(raw: string | undefined) {
  if (!raw) return null;
  const id = unsign(raw);
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function currentSession() {
  const jar = await cookies();
  return sessionFromCookie(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await currentSession();
  if (!session) redirect((await hasAnyUser()) ? "/login" : "/login?setup=1");
  return session;
}

export async function logout(raw: string | undefined) {
  const id = raw ? unsign(raw) : null;
  if (id) await prisma.session.deleteMany({ where: { id } });
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && !process.env.DASHBOARD_URL?.startsWith("http://"),
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
