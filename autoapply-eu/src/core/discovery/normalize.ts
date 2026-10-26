import { sha256 } from "@/lib/crypto";

const TRACKING_PARAMS = /^(utm_[a-z]+|gh_src|source|src|ref|refid|trk|trackingid|lever-source|lever-origin|campaign|mc_[a-z]+|fbclid|gclid|_hs[a-z]+|__hstc|__hssc|__hsfp)$/i;

export function canonicalUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  u.hash = "";
  for (const k of Array.from(u.searchParams.keys())) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  let s = u.toString();
  if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
  return s.replace(/\/\?/, "?");
}

const COMPANY_SUFFIX = /\b(gmbh|ag|se|kg|kgaa|ug|mbh|co\.?|b\.?v\.?|n\.?v\.?|inc\.?|ltd\.?|llc|plc|holding|group|gruppe|deutschland|germany|netherlands|nederland|europe)\b/gi;
const GENDER_TAG = /\(?\s*(m\s*\/\s*w\s*\/\s*d|w\s*\/\s*m\s*\/\s*d|m\s*\/\s*f\s*\/\s*d|f\s*\/\s*m\s*\/\s*d|m\s*\/\s*f\s*\/\s*x|m\s*\/\s*w\s*\/\s*x|all genders|alle geschlechter|m\s*\/\s*v\s*\/\s*x|m\s*\/\s*v|d\s*\/\s*f\s*\/\s*m|gn)\s*\)?/gi;

export function normalizeCompany(c: string): string {
  return c.toLowerCase().replace(COMPANY_SUFFIX, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(GENDER_TAG, " ")
    .replace(/front[\s-]?end/g, "frontend")
    .replace(/full[\s-]?stack/g, "fullstack")
    .replace(/\bsr\.?\b/g, "senior")
    .replace(/\bjr\.?\b/g, "junior")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function jobFingerprint(company: string, title: string, city: string | null): string {
  return sha256(`${normalizeCompany(company)}|${normalizeTitle(title)}|${(city ?? "").toLowerCase()}`).slice(0, 32);
}
