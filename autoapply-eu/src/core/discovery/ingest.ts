import { prisma } from "@/lib/db";
import type { Settings } from "@/lib/settings";
import { findSkills } from "../skills";
import { recordEvent } from "../events";
import { classifyLocation } from "./location";
import { canonicalUrl, jobFingerprint } from "./normalize";
import type { RawJob } from "./types";
import { politeFetch, HttpError } from "./http";

export interface IngestStats {
  inScope: number;
  outOfScope: number;
  created: number;
  updated: number;
  duplicates: number;
  reopened: number;
}

export function detectLanguage(text: string): "en" | "de" | "nl" {
  const sample = ` ${text.slice(0, 4000).toLowerCase()} `;
  const count = (words: string[]) => words.reduce((n, w) => n + (sample.split(` ${w} `).length - 1), 0);
  const de = count(["und", "der", "die", "das", "wir", "sie", "mit", "für", "ist", "bei", "unsere", "deine", "ihre"]);
  const nl = count(["en", "het", "een", "wij", "jij", "voor", "met", "van", "zijn", "onze", "jouw", "bij", "ons"]);
  const en = count(["and", "the", "we", "you", "with", "for", "our", "your", "are", "is", "to", "of"]);
  if (de > en && de >= nl) return "de";
  if (nl > en && nl > de) return "nl";
  return "en";
}

export async function ingestJobs(raws: RawJob[], settings: Settings, runId?: string): Promise<IngestStats> {
  const stats: IngestStats = { inScope: 0, outOfScope: 0, created: 0, updated: 0, duplicates: 0, reopened: 0 };
  for (const raw of raws) {
    const loc = classifyLocation(raw.locationRaw, raw.descriptionText, { countryCode: raw.countryCode, remote: raw.remote, workplaceType: raw.workplaceType });
    const countryOk = loc.country === "EU_REMOTE" ? settings.remotePreferences.includes("REMOTE") : !!loc.country && settings.targetCountries.includes(loc.country);
    if (!countryOk) {
      stats.outOfScope++;
      continue;
    }
    stats.inScope++;
    let url: string;
    try {
      url = canonicalUrl(raw.url);
    } catch {
      stats.outOfScope++;
      continue;
    }
    const fingerprint = jobFingerprint(raw.company, raw.title, loc.city);
    const common = {
      applyUrl: raw.applyUrl,
      company: raw.company,
      title: raw.title,
      country: loc.country,
      city: loc.city,
      locationRaw: raw.locationRaw.slice(0, 500),
      remotePolicy: loc.remotePolicy,
      techStack: findSkills(`${raw.title}\n${raw.descriptionText}`),
      descriptionText: raw.descriptionText.slice(0, 50_000),
      descriptionLang: detectLanguage(raw.descriptionText),
      postedAt: raw.postedAt && !isNaN(raw.postedAt.getTime()) ? raw.postedAt : null,
      atsKind: raw.atsKind,
      lastSeenAt: new Date(),
    };

    const existing =
      (await prisma.job.findUnique({ where: { sourceId_externalId: { sourceId: raw.sourceId, externalId: raw.externalId } } })) ??
      (await prisma.job.findUnique({ where: { canonicalUrl: url } }));
    if (existing) {
      const reopen = existing.status === "EXPIRED";
      await prisma.job.update({
        where: { id: existing.id },
        data: { ...common, fingerprint, ...(reopen ? { status: "DISCOVERED", expiredAt: null } : {}) },
      });
      if (reopen) stats.reopened++;
      stats.updated++;
      continue;
    }

    const twin = await prisma.job.findFirst({
      where: { fingerprint, status: { notIn: ["DUPLICATE", "EXPIRED"] } },
      orderBy: { firstSeenAt: "asc" },
    });
    // Prefer the ATS record over an aggregator listing so applications target the employer's own form.
    const preferNew = twin && !twin.atsKind && raw.atsKind;
    const job = await prisma.job.create({
      data: {
        ...common,
        sourceId: raw.sourceId,
        externalId: raw.externalId,
        canonicalUrl: url,
        fingerprint,
        status: twin && !preferNew ? "DUPLICATE" : "DISCOVERED",
        duplicateOfId: twin && !preferNew ? twin.id : null,
      },
    });
    if (twin && preferNew) {
      await prisma.job.update({ where: { id: twin.id }, data: { status: "DUPLICATE", duplicateOfId: job.id } });
      await prisma.application.updateMany({ where: { jobId: twin.id, state: { in: ["QUEUED", "DOCUMENTS_READY", "RETRY_PENDING"] } }, data: { state: "DUPLICATE" } });
    }
    if (twin) stats.duplicates++;
    stats.created++;
    await recordEvent(twin && !preferNew ? "job.duplicate" : "job.discovered", `${raw.title} @ ${raw.company}`, { source: raw.sourceId, country: loc.country, city: loc.city }, { jobId: job.id, runId });
  }
  return stats;
}

/** After a complete listing, jobs from that source not seen in this run have been unpublished. */
export async function expireUnseen(sourceId: string, seenSince: Date, runId?: string): Promise<number> {
  const stale = await prisma.job.findMany({ where: { sourceId, lastSeenAt: { lt: seenSince }, status: { notIn: ["EXPIRED"] } }, select: { id: true, title: true, company: true } });
  for (const j of stale) await markExpired(j.id, "No longer listed by source", runId);
  return stale.length;
}

export async function markExpired(jobId: string, reason: string, runId?: string) {
  await prisma.$transaction(async (tx) => {
    await tx.job.update({ where: { id: jobId }, data: { status: "EXPIRED", expiredAt: new Date() } });
    const app = await tx.application.findUnique({ where: { jobId } });
    if (app && ["QUEUED", "DOCUMENTS_READY", "RETRY_PENDING"].includes(app.state)) {
      await tx.application.update({ where: { id: app.id }, data: { state: "EXPIRED" } });
      await tx.stateTransition.create({ data: { applicationId: app.id, fromState: app.state, toState: "EXPIRED", reason, workerId: "discovery", attemptNumber: app.attemptCount } });
    }
  });
  await recordEvent("job.expired", reason, undefined, { jobId, runId });
}

/** For partially-covered sources, re-check individual postings that have not been seen recently. */
export async function recheckStale(sourceIds: string[], olderThanMs = 2 * 86400_000, limit = 200): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: { sourceId: { in: sourceIds }, status: { notIn: ["EXPIRED", "DUPLICATE"] }, lastSeenAt: { lt: new Date(Date.now() - olderThanMs) } },
    take: limit,
  });
  let expired = 0;
  for (const j of jobs) {
    try {
      await politeFetch(j.canonicalUrl, { retries: 1, checkRobots: !j.atsKind });
      await prisma.job.update({ where: { id: j.id }, data: { lastSeenAt: new Date() } });
    } catch (e) {
      if (e instanceof HttpError && (e.status === 404 || e.status === 410)) {
        await markExpired(j.id, `Posting returned HTTP ${e.status}`);
        expired++;
      }
    }
  }
  return expired;
}
