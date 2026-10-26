import { getJson, htmlToText, decodeEntities, politeFetch, HttpError } from "../http";
import type { RawJob, SourceAdapter, SourceResult } from "../types";

function err(e: unknown): SourceResult {
  const notes = e instanceof Error ? e.message : String(e);
  return { jobs: [], fetched: 0, coverage: e instanceof HttpError && (e.status === 401 || e.status === 403) ? "BLOCKED" : "ERROR", notes };
}

// ---------------- Greenhouse (public Job Board API) ----------------
interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  content?: string;
  offices?: { name?: string; location?: string }[];
}

export function greenhouse(slug: string): SourceAdapter {
  return {
    id: `greenhouse:${slug}`,
    kind: "greenhouse",
    name: `Greenhouse · ${slug}`,
    async discover(ctx) {
      try {
        const board = await getJson<{ name?: string }>(`https://boards-api.greenhouse.io/v1/boards/${slug}`).catch(() => ({ name: slug }));
        const data = await getJson<{ jobs: GhJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
        const jobs: RawJob[] = data.jobs
          .filter((j) => ctx.isRelevantTitle(j.title))
          .map((j) => ({
            sourceId: `greenhouse:${slug}`,
            externalId: String(j.id),
            url: j.absolute_url,
            applyUrl: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
            company: board.name || slug,
            title: j.title.trim(),
            locationRaw: [j.location?.name, ...(j.offices ?? []).map((o) => o.location || o.name)].filter(Boolean).join("; "),
            descriptionText: htmlToText(decodeEntities(j.content ?? "")),
            postedAt: j.first_published ? new Date(j.first_published) : j.updated_at ? new Date(j.updated_at) : null,
            atsKind: "greenhouse",
          }));
        return { jobs, fetched: data.jobs.length, coverage: data.jobs.length ? "OK" : "EMPTY" };
      } catch (e) {
        return err(e);
      }
    },
  };
}

// ---------------- Lever (public Postings API, US and EU instances) ----------------
interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt?: number;
  workplaceType?: string;
  country?: string;
  categories?: { location?: string; allLocations?: string[]; commitment?: string };
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
}

export function lever(slug: string): SourceAdapter {
  return {
    id: `lever:${slug}`,
    kind: "lever",
    name: `Lever · ${slug}`,
    async discover(ctx) {
      for (const host of ["api.lever.co", "api.eu.lever.co"]) {
        try {
          const all: LeverPosting[] = [];
          for (let skip = 0; ; skip += 100) {
            const page = await getJson<LeverPosting[]>(`https://${host}/v0/postings/${slug}?mode=json&skip=${skip}&limit=100`);
            all.push(...page);
            if (page.length < 100 || (await ctx.shouldStop())) break;
          }
          const jobs: RawJob[] = all
            .filter((p) => ctx.isRelevantTitle(p.text))
            .map((p) => ({
              sourceId: `lever:${slug}`,
              externalId: p.id,
              url: p.hostedUrl,
              applyUrl: p.applyUrl || `${p.hostedUrl}/apply`,
              company: slug,
              title: p.text.trim(),
              locationRaw: (p.categories?.allLocations?.length ? p.categories.allLocations : [p.categories?.location]).filter(Boolean).join("; "),
              descriptionText: [p.descriptionPlain, ...(p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), p.additionalPlain].filter(Boolean).join("\n"),
              postedAt: p.createdAt ? new Date(p.createdAt) : null,
              atsKind: "lever",
              countryCode: p.country ?? null,
              workplaceType: p.workplaceType ?? null,
            }));
          return { jobs, fetched: all.length, coverage: all.length ? "OK" : "EMPTY", notes: host };
        } catch (e) {
          if (e instanceof HttpError && e.status === 404 && host === "api.lever.co") continue;
          return err(e);
        }
      }
      return { jobs: [], fetched: 0, coverage: "ERROR", notes: "Board not found on Lever US or EU" };
    },
  };
}

// ---------------- Ashby (public Job Posting API) ----------------
interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  workplaceType?: string;
  descriptionPlain?: string;
  jobUrl: string;
  applyUrl?: string;
  publishedAt?: string;
  isListed?: boolean;
  address?: { postalAddress?: { addressCountry?: string; addressLocality?: string } };
}

export function ashby(slug: string): SourceAdapter {
  return {
    id: `ashby:${slug}`,
    kind: "ashby",
    name: `Ashby · ${slug}`,
    async discover(ctx) {
      try {
        const data = await getJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`);
        const listed = data.jobs.filter((j) => j.isListed !== false);
        const jobs: RawJob[] = listed
          .filter((j) => ctx.isRelevantTitle(j.title))
          .map((j) => ({
            sourceId: `ashby:${slug}`,
            externalId: j.id,
            url: j.jobUrl,
            applyUrl: j.applyUrl || `${j.jobUrl}/application`,
            company: slug,
            title: j.title.trim(),
            locationRaw: [j.location, j.address?.postalAddress?.addressLocality, j.address?.postalAddress?.addressCountry, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; "),
            descriptionText: j.descriptionPlain ?? "",
            postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
            atsKind: "ashby",
            remote: j.isRemote ?? null,
            workplaceType: j.workplaceType ?? null,
          }));
        return { jobs, fetched: listed.length, coverage: listed.length ? "OK" : "EMPTY" };
      } catch (e) {
        return err(e);
      }
    },
  };
}

// ---------------- SmartRecruiters (public Posting API, paginated) ----------------
interface SrPosting {
  id: string;
  name: string;
  refNumber?: string;
  releasedDate?: string;
  company?: { name?: string; identifier?: string };
  location?: { city?: string; region?: string; country?: string; remote?: boolean; hybrid?: boolean; fullLocation?: string };
}

export function smartrecruiters(company: string): SourceAdapter {
  return {
    id: `smartrecruiters:${company}`,
    kind: "smartrecruiters",
    name: `SmartRecruiters · ${company}`,
    async discover(ctx) {
      try {
        const all: SrPosting[] = [];
        let total = Infinity;
        for (let offset = 0; offset < total && offset < 5000; offset += 100) {
          const page = await getJson<{ content: SrPosting[]; totalFound: number }>(`https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100&offset=${offset}`);
          total = page.totalFound;
          all.push(...page.content);
          if (!page.content.length || (await ctx.shouldStop())) break;
        }
        const relevant = all.filter((p) => ctx.isRelevantTitle(p.name) && ["de", "nl"].includes((p.location?.country ?? "").toLowerCase()));
        const jobs: RawJob[] = [];
        for (const p of relevant) {
          let description = "";
          try {
            const d = await getJson<{ jobAd?: { sections?: Record<string, { text?: string }> } }>(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${p.id}`);
            description = Object.values(d.jobAd?.sections ?? {}).map((s) => htmlToText(s.text ?? "")).join("\n");
          } catch {
            /* keep listing data only */
          }
          jobs.push({
            sourceId: `smartrecruiters:${company}`,
            externalId: p.id,
            url: `https://jobs.smartrecruiters.com/${company}/${p.id}`,
            applyUrl: `https://jobs.smartrecruiters.com/${company}/${p.id}`,
            company: p.company?.name || company,
            title: p.name.trim(),
            locationRaw: p.location?.fullLocation || [p.location?.city, p.location?.region, p.location?.country?.toUpperCase()].filter(Boolean).join(", "),
            descriptionText: description,
            postedAt: p.releasedDate ? new Date(p.releasedDate) : null,
            atsKind: "smartrecruiters",
            countryCode: p.location?.country ?? null,
            remote: p.location?.remote ?? null,
            workplaceType: p.location?.hybrid ? "hybrid" : null,
          });
        }
        return { jobs, fetched: all.length, coverage: all.length ? "OK" : "EMPTY" };
      } catch (e) {
        return err(e);
      }
    },
  };
}

// ---------------- Recruitee (public careers API) ----------------
interface RecruiteeOffer {
  id: number;
  title: string;
  careers_url: string;
  careers_apply_url?: string;
  location?: string;
  city?: string;
  country_code?: string;
  remote?: boolean;
  hybrid?: boolean;
  description?: string;
  requirements?: string;
  published_at?: string;
  company_name?: string;
}

export function recruitee(slug: string): SourceAdapter {
  return {
    id: `recruitee:${slug}`,
    kind: "recruitee",
    name: `Recruitee · ${slug}`,
    async discover(ctx) {
      try {
        const data = await getJson<{ offers: RecruiteeOffer[] }>(`https://${slug}.recruitee.com/api/offers/`);
        const jobs: RawJob[] = data.offers
          .filter((o) => ctx.isRelevantTitle(o.title))
          .map((o) => ({
            sourceId: `recruitee:${slug}`,
            externalId: String(o.id),
            url: o.careers_url,
            applyUrl: o.careers_apply_url || `${o.careers_url}/c/new`,
            company: o.company_name || slug,
            title: o.title.trim(),
            locationRaw: o.location || [o.city, o.country_code].filter(Boolean).join(", "),
            descriptionText: htmlToText(`${o.description ?? ""}\n${o.requirements ?? ""}`),
            postedAt: o.published_at ? new Date(o.published_at) : null,
            atsKind: "recruitee",
            countryCode: o.country_code ?? null,
            remote: o.remote ?? null,
            workplaceType: o.hybrid ? "hybrid" : null,
          }));
        return { jobs, fetched: data.offers.length, coverage: data.offers.length ? "OK" : "EMPTY" };
      } catch (e) {
        return err(e);
      }
    },
  };
}

// ---------------- Personio (public XML feed) ----------------
function xmlTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim() : "";
}

export function parsePersonioXml(xml: string, slug: string): RawJob[] {
  return Array.from(xml.matchAll(/<position>([\s\S]*?)<\/position>/g)).map(([, block]) => {
    const id = xmlTag(block, "id");
    const descs = Array.from(block.matchAll(/<jobDescription>([\s\S]*?)<\/jobDescription>/g)).map(([, d]) => `${xmlTag(d, "name")}\n${htmlToText(xmlTag(d, "value"))}`);
    const office = xmlTag(block, "office");
    const additional = Array.from(block.matchAll(/<additionalOffices>([\s\S]*?)<\/additionalOffices>/g)).map(([, o]) => htmlToText(o));
    return {
      sourceId: `personio:${slug}`,
      externalId: id,
      url: `https://${slug}.jobs.personio.de/job/${id}?language=en`,
      applyUrl: `https://${slug}.jobs.personio.de/job/${id}?language=en&display=en#apply`,
      company: xmlTag(block, "subcompany") || slug,
      title: xmlTag(block, "name"),
      locationRaw: [office, ...additional].filter(Boolean).join("; "),
      descriptionText: descs.join("\n"),
      postedAt: xmlTag(block, "createdAt") ? new Date(xmlTag(block, "createdAt")) : null,
      atsKind: "personio",
    };
  });
}

export function personio(slug: string): SourceAdapter {
  return {
    id: `personio:${slug}`,
    kind: "personio",
    name: `Personio · ${slug}`,
    async discover(ctx) {
      try {
        const xml = await (await politeFetch(`https://${slug}.jobs.personio.de/xml?language=en`)).text();
        const all = parsePersonioXml(xml, slug);
        return { jobs: all.filter((j) => ctx.isRelevantTitle(j.title)), fetched: all.length, coverage: all.length ? "OK" : "EMPTY" };
      } catch (e) {
        return err(e);
      }
    },
  };
}

// ---------------- Workday (public CXS JSON used by Workday career sites) ----------------
interface WdListing {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

/** spec format: "host|tenant|site", e.g. "philips.wd3.myworkdayjobs.com|philips|jobs-and-careers" */
export function workday(spec: string): SourceAdapter {
  const [host, tenant, site] = spec.split("|");
  return {
    id: `workday:${tenant}`,
    kind: "workday",
    name: `Workday · ${tenant}`,
    async discover(ctx) {
      if (!host || !tenant || !site) return { jobs: [], fetched: 0, coverage: "ERROR", notes: `Invalid Workday spec "${spec}"` };
      const base = `https://${host}/wday/cxs/${tenant}/${site}`;
      try {
        const seen = new Map<string, WdListing>();
        let fetched = 0;
        for (const term of ctx.searchTerms) {
          let total = Infinity;
          for (let offset = 0; offset < total && offset < 1000; offset += 20) {
            const page = await getJson<{ total: number; jobPostings: WdListing[] }>(`${base}/jobs`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: term }),
            });
            if (offset === 0) total = page.total;
            fetched += page.jobPostings.length;
            for (const p of page.jobPostings) if (ctx.isRelevantTitle(p.title)) seen.set(p.externalPath, p);
            if (!page.jobPostings.length || (await ctx.shouldStop())) break;
          }
        }
        const jobs: RawJob[] = [];
        for (const p of seen.values()) {
          const detail = await getJson<{
            jobPostingInfo?: { jobDescription?: string; location?: string; additionalLocations?: string[]; country?: { descriptor?: string }; externalUrl?: string; jobReqId?: string; startDate?: string; remoteType?: string };
          }>(`${base}${p.externalPath}`).catch(() => ({ jobPostingInfo: undefined }));
          const info = detail.jobPostingInfo;
          const url = info?.externalUrl || `https://${host}/${site}${p.externalPath.replace(/^\/job/, "/job")}`;
          jobs.push({
            sourceId: `workday:${tenant}`,
            externalId: info?.jobReqId || p.externalPath,
            url,
            applyUrl: `${url.replace(/\/$/, "")}/apply`,
            company: tenant,
            title: p.title.trim(),
            locationRaw: [info?.location ?? p.locationsText, ...(info?.additionalLocations ?? []), info?.country?.descriptor].filter(Boolean).join("; "),
            descriptionText: htmlToText(info?.jobDescription ?? ""),
            postedAt: info?.startDate ? new Date(info.startDate) : null,
            atsKind: "workday",
            workplaceType: info?.remoteType ?? null,
          });
        }
        return { jobs, fetched, coverage: fetched ? "PARTIAL" : "EMPTY", notes: "Keyword search via Workday CXS; only results for configured search terms are covered" };
      } catch (e) {
        return err(e);
      }
    },
  };
}