import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { runDiscovery } from "@/core/discovery/run";
import { greenhouse, ashby, personio } from "@/core/discovery/sources/ats";
import { arbeitnow, bundesagentur } from "@/core/discovery/sources/boards";
import { resetDb } from "../helpers/db";

/** Hits real public sources. Run with `npm run test:live`. Read-only; never applies. */
describe("live discovery (public sources)", () => {
  beforeAll(resetDb);

  it("discovers real open frontend jobs in Germany and the Netherlands", async () => {
    const stats = await runDiscovery({
      sources: [arbeitnow(5), greenhouse("n26"), greenhouse("getyourguide"), greenhouse("adyen"), greenhouse("hellofresh"), greenhouse("sumup"), greenhouse("contentful"), ashby("n8n"), personio("ottonova"), bundesagentur()],
      concurrency: 4,
    });
    const jobs = await prisma.job.findMany({ select: { title: true, company: true, country: true, city: true, canonicalUrl: true, sourceId: true } });
    const sources = await prisma.source.findMany({ select: { id: true, coverage: true, lastJobCount: true, lastMatchCount: true, lastError: true } });
    console.log(JSON.stringify({ stats, sources, sample: jobs.slice(0, 25) }, null, 2));
    expect(stats.fetched).toBeGreaterThan(100);
    expect(jobs.length).toBeGreaterThan(0);
    for (const j of jobs) expect(["DE", "NL", "EU_REMOTE"]).toContain(j.country);
  }, 600_000);
});
