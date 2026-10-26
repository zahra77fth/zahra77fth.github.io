import type { Settings } from "@/lib/settings";
import { ashby, greenhouse, lever, personio, recruitee, smartrecruiters, workday } from "./sources/ats";
import { arbeitnow, bundesagentur, restricted, RESTRICTED_PLATFORMS } from "./sources/boards";
import { careerSite } from "./sources/careersite";
import type { SourceAdapter } from "./types";

/** Boards verified reachable via public APIs; companies that hire in DE/NL. Extend in Settings. */
export const DEFAULT_BOARDS: Settings["companyBoards"] & { careerSites: string[] } = {
  greenhouse: [
    "n26", "gitlab", "contentful", "getyourguide", "adyen", "celonis", "hellofresh", "sumup", "raisin", "trivago", "elastic", "flix",
    "commercetools", "datadog", "cloudflare", "stripe", "mongodb", "databricks", "figma", "doctolib", "wolt", "realtimeboardglobal",
    "dataiku", "bird", "helsing", "parloa", "freenow", "airbnb", "dropbox", "twilio", "okta",
  ],
  lever: ["spotify", "tomtom"],
  ashby: ["n8n", "deepl", "parloa", "ramp", "linear", "vanta", "supabase", "cursor", "posthog"],
  smartrecruiters: ["deliveryhero", "BoschGroup", "Continental", "Ubisoft2"],
  recruitee: ["bunq", "channable"],
  personio: ["ottonova", "tado", "personio"],
  workday: ["philips.wd3.myworkdayjobs.com|philips|jobs-and-careers", "ing.wd3.myworkdayjobs.com|ing|ICSGBLCOR", "nvidia.wd5.myworkdayjobs.com|nvidia|NVIDIAExternalCareerSite"],
  careerSites: [],
};

function merged(defaults: string[], extra: string[] | undefined) {
  return Array.from(new Set([...defaults, ...(extra ?? [])]));
}

export function buildSources(settings: Settings): SourceAdapter[] {
  const b = settings.companyBoards;
  const list: SourceAdapter[] = [
    arbeitnow(),
    bundesagentur(),
    ...merged(DEFAULT_BOARDS.greenhouse, b.greenhouse).map(greenhouse),
    ...merged(DEFAULT_BOARDS.lever, b.lever).map(lever),
    ...merged(DEFAULT_BOARDS.ashby, b.ashby).map(ashby),
    ...merged(DEFAULT_BOARDS.smartrecruiters, b.smartrecruiters).map(smartrecruiters),
    ...merged(DEFAULT_BOARDS.recruitee, b.recruitee).map(recruitee),
    ...merged(DEFAULT_BOARDS.personio, b.personio).map(personio),
    ...merged(DEFAULT_BOARDS.workday, b.workday).map(workday),
    ...settings.careerSites.map((u) => careerSite(u)),
    ...RESTRICTED_PLATFORMS.map(restricted),
  ];
  return list.filter((s) => settings.enabledSources[s.id] !== false);
}

/** Recognise ATS board identifiers in any URL so new companies seen in the wild extend coverage automatically. */
export function boardFromUrl(url: string): { kind: keyof Settings["companyBoards"]; slug: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const seg = u.pathname.split("/").filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(u.hostname) && seg[0] && seg[0] !== "embed") return { kind: "greenhouse", slug: seg[0] };
  if (u.hostname === "boards.greenhouse.io" && u.searchParams.get("for")) return { kind: "greenhouse", slug: u.searchParams.get("for")! };
  if (/^jobs(\.eu)?\.lever\.co$/.test(u.hostname) && seg[0]) return { kind: "lever", slug: seg[0] };
  if (u.hostname === "jobs.ashbyhq.com" && seg[0]) return { kind: "ashby", slug: seg[0] };
  if (u.hostname === "jobs.smartrecruiters.com" && seg[0]) return { kind: "smartrecruiters", slug: seg[0] };
  const rc = u.hostname.match(/^([a-z0-9-]+)\.recruitee\.com$/);
  if (rc) return { kind: "recruitee", slug: rc[1] };
  const pe = u.hostname.match(/^([a-z0-9-]+)\.jobs\.personio\.(de|com)$/);
  if (pe) return { kind: "personio", slug: pe[1] };
  return null;
}
