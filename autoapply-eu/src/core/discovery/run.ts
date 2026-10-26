import { prisma } from "@/lib/db";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { recordEvent } from "../events";
import { setDomainMinInterval } from "./http";
import { expireUnseen, ingestJobs, recheckStale, type IngestStats } from "./ingest";
import { boardFromUrl, buildSources } from "./registry";
import { buildTitleFilter, DEFAULT_SEARCH_TERMS, type SourceAdapter } from "./types";

export interface DiscoveryStats {
  sources: number;
  sourcesOk: number;
  sourcesBlocked: number;
  sourcesError: number;
  fetched: number;
  matchedTitles: number;
  ingest: IngestStats;
  expired: number;
  learnedBoards: string[];
}

export async function runDiscovery(opts: { runId?: string; sources?: SourceAdapter[]; shouldStop?: () => Promise<boolean>; concurrency?: number } = {}): Promise<DiscoveryStats> {
  const settings = await getSettings();
  setDomainMinInterval(settings.domainMinIntervalMs);
  const sources = opts.sources ?? buildSources(settings);
  const shouldStop = opts.shouldStop ?? (async () => (await getSettings()).emergencyStop);
  const ctx = {
    searchTerms: DEFAULT_SEARCH_TERMS,
    isRelevantTitle: buildTitleFilter(settings.targetRoles),
    log: (msg: string, data?: Record<string, unknown>) => logger.info(data ?? {}, msg),
    shouldStop,
  };
  const stats: DiscoveryStats = {
    sources: sources.length,
    sourcesOk: 0,
    sourcesBlocked: 0,
    sourcesError: 0,
    fetched: 0,
    matchedTitles: 0,
    ingest: { inScope: 0, outOfScope: 0, created: 0, updated: 0, duplicates: 0, reopened: 0 },
    expired: 0,
    learnedBoards: [],
  };
  const partialSources: string[] = [];
  const queue = [...sources];
  const workers = Array.from({ length: opts.concurrency ?? 6 }, async () => {
    for (let src = queue.shift(); src; src = queue.shift()) {
      if (await shouldStop()) return;
      const startedAt = new Date();
      const result = await src.discover(ctx).catch((e: unknown) => ({ jobs: [], fetched: 0, coverage: "ERROR" as const, notes: e instanceof Error ? e.message : String(e) }));
      const ing = await ingestJobs(result.jobs, settings, opts.runId);
      for (const k of Object.keys(ing) as (keyof IngestStats)[]) stats.ingest[k] += ing[k];
      stats.fetched += result.fetched;
      stats.matchedTitles += result.jobs.length;
      if (result.coverage === "OK" || result.coverage === "EMPTY") {
        stats.sourcesOk++;
        if (result.coverage === "OK") stats.expired += await expireUnseen(src.id, startedAt, opts.runId);
      } else if (result.coverage === "PARTIAL") {
        stats.sourcesOk++;
        partialSources.push(src.id);
      } else if (result.coverage === "BLOCKED") stats.sourcesBlocked++;
      else stats.sourcesError++;
      await prisma.source.upsert({
        where: { id: src.id },
        create: { id: src.id, kind: src.kind, name: src.name, coverage: result.coverage, lastRunAt: new Date(), lastStatus: result.coverage, lastError: result.notes ?? null, lastJobCount: result.fetched, lastMatchCount: ing.inScope },
        update: { kind: src.kind, name: src.name, coverage: result.coverage, lastRunAt: new Date(), lastStatus: result.coverage, lastError: result.notes ?? null, lastJobCount: result.fetched, lastMatchCount: ing.inScope },
      });
      if (result.coverage === "ERROR" || (result.coverage === "BLOCKED" && src.kind !== "restricted")) {
        await recordEvent("source.problem", `${src.name}: ${result.coverage}${result.notes ? ` — ${result.notes}` : ""}`, { source: src.id }, { runId: opts.runId });
      }
    }
  });
  await Promise.all(workers);
  if (partialSources.length) stats.expired += await recheckStale(partialSources);
  if (settings.autoLearnBoards) stats.learnedBoards = await learnBoards(settings);
  return stats;
}

/** Adds ATS boards referenced by discovered job/apply URLs so subsequent runs index the whole company board. */
export async function learnBoards(settings: Settings): Promise<string[]> {
  const jobs = await prisma.job.findMany({ where: { atsKind: null }, select: { applyUrl: true, canonicalUrl: true }, take: 5000, orderBy: { firstSeenAt: "desc" } });
  const boards = structuredClone(settings.companyBoards);
  const learned: string[] = [];
  for (const j of jobs) {
    for (const u of [j.applyUrl, j.canonicalUrl]) {
      const b = u ? boardFromUrl(u) : null;
      if (b && !boards[b.kind].includes(b.slug)) {
        boards[b.kind].push(b.slug);
        learned.push(`${b.kind}:${b.slug}`);
      }
    }
  }
  if (learned.length) await updateSettings({ companyBoards: boards });
  return learned;
}
