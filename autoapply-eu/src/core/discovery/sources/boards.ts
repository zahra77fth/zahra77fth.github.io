import { getJson, htmlToText, HttpError } from "../http";
import type { RawJob, SourceAdapter } from "../types";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  location: string;
  created_at: number;
}

/** Arbeitnow public job-board API: country-wide German listings, many from SMEs and startups. */
export function arbeitnow(maxPages = 40): SourceAdapter {
  return {
    id: "arbeitnow",
    kind: "board",
    name: "Arbeitnow (Germany, public API)",
    async discover(ctx) {
      const jobs: RawJob[] = [];
      let fetched = 0;
      let page = 1;
      let coverage: "OK" | "PARTIAL" | "ERROR" = "OK";
      let notes: string | undefined;
      try {
        for (; page <= maxPages; page++) {
          const res = await getJson<{ data: ArbeitnowJob[]; links?: { next?: string | null } }>(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
          fetched += res.data.length;
          for (const j of res.data) {
            if (!ctx.isRelevantTitle(j.title)) continue;
            jobs.push({
              sourceId: "arbeitnow",
              externalId: j.slug,
              url: j.url,
              applyUrl: j.url,
              company: j.company_name,
              title: j.title.trim(),
              locationRaw: j.location,
              descriptionText: htmlToText(j.description),
              postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
              atsKind: null,
              remote: j.remote,
              countryCode: "DE",
            });
          }
          if (!res.links?.next || !res.data.length || (await ctx.shouldStop())) break;
        }
        if (page > maxPages) {
          coverage = "PARTIAL";
          notes = `Stopped at page limit ${maxPages}`;
        }
      } catch (e) {
        coverage = fetched ? "PARTIAL" : "ERROR";
        notes = e instanceof Error ? e.message : String(e);
      }
      return { jobs, fetched, coverage, notes };
    },
  };
}

interface BaJob {
  refnr: string;
  titel: string;
  beruf?: string;
  arbeitgeber: string;
  arbeitsort?: { ort?: string; region?: string; land?: string };
  aktuelleVeroeffentlichungsdatum?: string;
  externeUrl?: string;
}

/** Bundesagentur für Arbeit Jobsuche API (the largest German listing source). */
export function bundesagentur(): SourceAdapter {
  return {
    id: "bundesagentur",
    kind: "board",
    name: "Bundesagentur für Arbeit Jobsuche",
    async discover(ctx) {
      const jobs: RawJob[] = [];
      let fetched = 0;
      try {
        for (const term of ["Frontend Entwickler", "Frontend Developer", "React", "Webentwickler", "JavaScript Entwickler", "TypeScript"]) {
          for (let page = 1; page <= 10; page++) {
            const res = await getJson<{ stellenangebote?: BaJob[]; maxErgebnisse?: number }>(
              `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was=${encodeURIComponent(term)}&page=${page}&size=100&angebotsart=1`,
              { headers: { "X-API-Key": "jobboerse-jobsuche" }, retries: 1 },
            );
            const list = res.stellenangebote ?? [];
            fetched += list.length;
            for (const j of list) {
              if (!ctx.isRelevantTitle(j.titel)) continue;
              const url = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr}`;
              jobs.push({
                sourceId: "bundesagentur",
                externalId: j.refnr,
                url,
                applyUrl: j.externeUrl ?? url,
                company: j.arbeitgeber,
                title: j.titel,
                locationRaw: [j.arbeitsort?.ort, j.arbeitsort?.region, j.arbeitsort?.land].filter(Boolean).join(", "),
                descriptionText: "",
                postedAt: j.aktuelleVeroeffentlichungsdatum ? new Date(j.aktuelleVeroeffentlichungsdatum) : null,
                atsKind: null,
                countryCode: "DE",
              });
            }
            if (list.length < 100 || (await ctx.shouldStop())) break;
          }
        }
        return { jobs, fetched, coverage: fetched ? "OK" : "EMPTY" };
      } catch (e) {
        const blocked = e instanceof HttpError && (e.status === 401 || e.status === 403);
        return { jobs, fetched, coverage: blocked ? "BLOCKED" : "ERROR", notes: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

/** Platforms whose terms prohibit automated access and that offer no public job API. Recorded, never scraped. */
export const RESTRICTED_PLATFORMS = [
  { id: "linkedin", name: "LinkedIn Jobs", notes: "No public job search API; User Agreement prohibits scraping. Paste job URLs via 'Import job URL'." },
  { id: "indeed", name: "Indeed", notes: "Publisher API closed to new users; ToS prohibits scraping. Paste job URLs manually." },
  { id: "stepstone", name: "StepStone", notes: "No public API; protected by anti-bot. Paste job URLs manually." },
  { id: "xing", name: "XING", notes: "No public job API; login required. Paste job URLs manually." },
  { id: "glassdoor", name: "Glassdoor", notes: "API discontinued; anti-bot protected. Paste job URLs manually." },
  { id: "welcometothejungle", name: "Welcome to the Jungle", notes: "No public API; ToS restricts automated access. Paste job URLs manually." },
  { id: "wellfound", name: "Wellfound", notes: "No public API; login + anti-bot. Paste job URLs manually." },
  { id: "teamtailor", name: "Teamtailor", notes: "Job API requires per-company API key; add career site URL under Career sites for JSON-LD indexing." },
];

export function restricted(p: (typeof RESTRICTED_PLATFORMS)[number]): SourceAdapter {
  return {
    id: p.id,
    kind: "restricted",
    name: p.name,
    async discover() {
      return { jobs: [], fetched: 0, coverage: "BLOCKED", notes: p.notes };
    },
  };
}
