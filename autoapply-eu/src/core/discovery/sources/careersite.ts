import { politeFetch, htmlToText, robotsAllowed } from "../http";
import type { RawJob, SourceAdapter } from "../types";

interface JsonLdJob {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  url?: string;
  identifier?: { value?: string } | string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: JsonLdPlace | JsonLdPlace[];
  jobLocationType?: string;
  applicantLocationRequirements?: { name?: string } | { name?: string }[];
  directApply?: boolean;
}
interface JsonLdPlace {
  address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string | { name?: string } } | string;
}

function isJobPosting(o: unknown): o is JsonLdJob {
  if (!o || typeof o !== "object") return false;
  const t = (o as JsonLdJob)["@type"];
  return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
}

export function extractJsonLdJobs(html: string): JsonLdJob[] {
  const out: JsonLdJob[] = [];
  for (const [, body] of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(body.trim());
      const stack: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      while (stack.length) {
        const item = stack.pop();
        if (isJobPosting(item)) out.push(item);
        else if (item && typeof item === "object" && Array.isArray((item as { "@graph"?: unknown[] })["@graph"])) stack.push(...(item as { "@graph": unknown[] })["@graph"]);
      }
    } catch {
      /* invalid JSON-LD block */
    }
  }
  return out;
}

function placeText(p: JsonLdPlace): string {
  if (typeof p.address === "string") return p.address;
  const a = p.address ?? {};
  const country = typeof a.addressCountry === "string" ? a.addressCountry : a.addressCountry?.name;
  return [a.addressLocality, a.addressRegion, country].filter(Boolean).join(", ");
}

export function jsonLdToRaw(j: JsonLdJob, pageUrl: string, sourceId: string): RawJob {
  const places = Array.isArray(j.jobLocation) ? j.jobLocation : j.jobLocation ? [j.jobLocation] : [];
  const reqs = Array.isArray(j.applicantLocationRequirements) ? j.applicantLocationRequirements : j.applicantLocationRequirements ? [j.applicantLocationRequirements] : [];
  const id = typeof j.identifier === "string" ? j.identifier : j.identifier?.value;
  const org = typeof j.hiringOrganization === "string" ? j.hiringOrganization : j.hiringOrganization?.name;
  const url = j.url || pageUrl;
  return {
    sourceId,
    externalId: id || url,
    url,
    applyUrl: url,
    company: org || new URL(pageUrl).hostname.replace(/^www\.|^careers?\.|^jobs\./, ""),
    title: (j.title ?? "").trim(),
    locationRaw: [...places.map(placeText), ...reqs.map((r) => r.name ?? "")].filter(Boolean).join("; "),
    descriptionText: htmlToText(j.description ?? ""),
    postedAt: j.datePosted ? new Date(j.datePosted) : null,
    atsKind: null,
    remote: j.jobLocationType === "TELECOMMUTE" ? true : null,
  };
}

const JOB_PATH = /(job|jobs|career|careers|karriere|stellen|stellenangebote|vacature|vacatures|vacancies|position|openings)/i;

async function sitemapUrls(origin: string, limit: number): Promise<string[]> {
  const queue = [`${origin}/sitemap.xml`];
  const found: string[] = [];
  const seenMaps = new Set<string>();
  while (queue.length && found.length < limit && seenMaps.size < 20) {
    const sm = queue.shift()!;
    if (seenMaps.has(sm)) continue;
    seenMaps.add(sm);
    let xml: string;
    try {
      xml = await (await politeFetch(sm, { checkRobots: true, retries: 1 })).text();
    } catch {
      continue;
    }
    const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)).map((m) => m[1]);
    if (/<sitemapindex/i.test(xml)) queue.push(...locs.filter((l) => JOB_PATH.test(l)), ...locs.filter((l) => !JOB_PATH.test(l)).slice(0, 3));
    else found.push(...locs.filter((l) => JOB_PATH.test(new URL(l).pathname)));
  }
  return found.slice(0, limit);
}

/** Indexes a company career site: the page itself, then job URLs from its sitemap. Uses schema.org JobPosting only. */
export function careerSite(siteUrl: string, maxPages = 150): SourceAdapter {
  const origin = new URL(siteUrl).origin;
  const id = `careersite:${new URL(siteUrl).hostname}`;
  return {
    id,
    kind: "careersite",
    name: `Career site · ${new URL(siteUrl).hostname}`,
    async discover(ctx) {
      const jobs = new Map<string, RawJob>();
      let fetched = 0;
      let disallowed = 0;
      const pages = [siteUrl, ...(await sitemapUrls(origin, maxPages))];
      const linkRe = /href=["']([^"'#]+)["']/gi;
      for (const page of pages.slice(0, maxPages)) {
        if (await ctx.shouldStop()) break;
        if (!(await robotsAllowed(page))) {
          disallowed++;
          continue;
        }
        let html: string;
        try {
          html = await (await politeFetch(page, { retries: 1 })).text();
        } catch {
          continue;
        }
        fetched++;
        for (const j of extractJsonLdJobs(html)) {
          const raw = jsonLdToRaw(j, page, id);
          if (raw.title && ctx.isRelevantTitle(raw.title)) jobs.set(raw.url, raw);
        }
        if (page === siteUrl && pages.length === 1) {
          for (const [, href] of html.matchAll(linkRe)) {
            try {
              const abs = new URL(href, siteUrl).toString();
              if (abs.startsWith(origin) && JOB_PATH.test(new URL(abs).pathname) && !pages.includes(abs)) pages.push(abs);
            } catch {
              /* bad href */
            }
          }
        }
      }
      return {
        jobs: Array.from(jobs.values()),
        fetched,
        coverage: fetched ? (disallowed ? "PARTIAL" : "OK") : disallowed ? "BLOCKED" : "ERROR",
        notes: disallowed ? `${disallowed} pages disallowed by robots.txt` : undefined,
      };
    },
  };
}
