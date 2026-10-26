import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/health"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  // Full session validation happens server-side in requireSession(); this only short-circuits anonymous requests.
  if (!req.cookies.get("aa_session")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
