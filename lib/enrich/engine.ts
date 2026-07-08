/**
 * Show Enrichment Engine core.
 *
 * runProviderForShow() executes ONE provider for ONE show: builds the
 * EventFingerprint from canonical data, calls the provider through the
 * response cache, scores + stores candidates with provenance, and
 * applies the (deliberately narrow) auto-accept rules. Serverless-sized
 * by design — the client runs providers in parallel, one request each,
 * so no long-running job infrastructure is needed on Vercel.
 */

import { and, desc, eq, gt, sql } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { normalizeText, type EventFingerprint } from "./fingerprint";
import { missingEnv, type ProviderContext } from "./types";
import { providerByName } from "./providers";

/** Auto-accept threshold (0–100) for low-risk structured fields. */
const AUTO_ACCEPT = Number(process.env.ENRICH_AUTO_ACCEPT ?? 90);
/** Per-user provider calls per minute. */
const USER_RATE_LIMIT = 12;
/** Re-running the same provider on the same show inside this window is a no-op. */
const RERUN_COOLDOWN_SECONDS = 10 * 60;

export interface RunSummary {
  provider: string;
  status: "done" | "error" | "skipped" | "unavailable";
  count: number;
  note?: string;
}

async function buildFingerprint(db: Db, showId: string): Promise<EventFingerprint | null> {
  const [row] = await db
    .select({
      id: t.shows.id,
      name: t.shows.name,
      date: t.shows.date,
      endDate: t.shows.endDate,
      artistName: t.artists.name,
      venueName: t.venues.name,
      venueCity: t.venues.city,
    })
    .from(t.shows)
    .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
    .innerJoin(t.venues, eq(t.shows.venueId, t.venues.id))
    .where(eq(t.shows.id, showId));
  if (!row) return null;

  let performers: string[] = [row.artistName];
  try {
    const bill = await db
      .select({
        name: t.artists.name,
        order: t.showPerformers.billingOrder,
      })
      .from(t.showPerformers)
      .innerJoin(t.artists, eq(t.showPerformers.artistId, t.artists.id))
      .where(eq(t.showPerformers.showId, showId));
    if (bill.length > 0) {
      performers = [...bill]
        .sort((a, b) => a.order - b.order)
        .map((p) => p.name);
    }
  } catch {
    // Pending 0006 migration — the primary act alone still fingerprints.
  }

  return {
    eventName: row.name ? normalizeText(row.name) : undefined,
    venue: normalizeText(row.venueName),
    city: row.venueCity ? normalizeText(row.venueCity) : undefined,
    startDate: row.date,
    endDate: row.endDate ?? undefined,
    year: row.date.slice(0, 4),
    performers: performers.map(normalizeText),
    title: normalizeText(row.name ?? row.artistName),
  };
}

function makeCache(db: Db, provider: string): ProviderContext {
  return {
    async cached(key, ttlSeconds, fetcher) {
      const queryKey = key.slice(0, 500);
      const [hit] = await db
        .select()
        .from(t.providerCache)
        .where(
          and(
            eq(t.providerCache.provider, provider),
            eq(t.providerCache.queryKey, queryKey),
            gt(t.providerCache.expiresAt, new Date()),
          ),
        );
      if (hit) return hit.response as Awaited<ReturnType<typeof fetcher>>;
      const response = await fetcher();
      await db
        .insert(t.providerCache)
        .values({
          provider,
          queryKey,
          response,
          expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        })
        .onConflictDoUpdate({
          target: [t.providerCache.provider, t.providerCache.queryKey],
          set: {
            response,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
          },
        });
      return response;
    },
  };
}

/** Narrow auto-accept: low-risk structured fields only. Poster/edition
 * facts always require human confirmation. */
async function applyAutoAccept(db: Db, showId: string): Promise<void> {
  // 1. Multi-day end date from a high-confidence event match.
  const [show] = await db
    .select({ endDate: t.shows.endDate, date: t.shows.date })
    .from(t.shows)
    .where(eq(t.shows.id, showId));
  if (show && !show.endDate) {
    const metas = await db
      .select()
      .from(t.dataCandidates)
      .where(
        and(
          eq(t.dataCandidates.showId, showId),
          eq(t.dataCandidates.kind, "event_meta"),
          eq(t.dataCandidates.status, "pending"),
        ),
      );
    const best = metas
      .filter((c) => {
        const value = c.value as { startDate?: string; endDate?: string };
        return (
          c.confidence >= AUTO_ACCEPT &&
          value.startDate?.slice(0, 10) === show.date &&
          value.endDate &&
          value.endDate > show.date
        );
      })
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (best) {
      const value = best.value as { endDate: string };
      await db
        .update(t.shows)
        .set({ endDate: value.endDate })
        .where(eq(t.shows.id, showId));
      await db
        .update(t.dataCandidates)
        .set({ status: "auto_accepted" })
        .where(eq(t.dataCandidates.id, best.id));
    }
  }

  // 2. Attach per-performer setlist links to acts already on the bill.
  try {
    const performerCandidates = await db
      .select()
      .from(t.dataCandidates)
      .where(
        and(
          eq(t.dataCandidates.showId, showId),
          eq(t.dataCandidates.kind, "performer"),
          eq(t.dataCandidates.status, "pending"),
        ),
      );
    if (performerCandidates.length === 0) return;
    const bill = await db
      .select({
        artistId: t.showPerformers.artistId,
        setlistFmId: t.showPerformers.setlistFmId,
        name: t.artists.name,
      })
      .from(t.showPerformers)
      .innerJoin(t.artists, eq(t.showPerformers.artistId, t.artists.id))
      .where(eq(t.showPerformers.showId, showId));
    const billByName = new Map(bill.map((p) => [normalizeText(p.name), p]));
    for (const candidate of performerCandidates) {
      const value = candidate.value as { setlistFmId?: string };
      const billed = billByName.get(candidate.valueKey);
      if (!billed) continue;
      if (value.setlistFmId && !billed.setlistFmId && candidate.confidence >= AUTO_ACCEPT) {
        await db
          .update(t.showPerformers)
          .set({
            setlistFmId: value.setlistFmId,
            setlistFmUrl: (candidate.value as { setlistFmUrl?: string }).setlistFmUrl,
          })
          .where(
            and(
              eq(t.showPerformers.showId, showId),
              eq(t.showPerformers.artistId, billed.artistId),
            ),
          );
      }
      // Already on the bill — the suggestion is settled either way.
      await db
        .update(t.dataCandidates)
        .set({
          status:
            candidate.confidence >= AUTO_ACCEPT ? "auto_accepted" : "superseded",
        })
        .where(eq(t.dataCandidates.id, candidate.id));
    }
  } catch {
    // Lineup table pending migration — skip silently.
  }
}

export async function runProviderForShow(
  db: Db,
  userId: string,
  showId: string,
  providerName: string,
): Promise<RunSummary> {
  const provider = providerByName(providerName);
  if (!provider) {
    return { provider: providerName, status: "error", count: 0, note: "Unknown provider" };
  }

  const missing = missingEnv(provider);
  if (missing.length > 0) {
    return {
      provider: provider.name,
      status: "unavailable",
      count: 0,
      note: `Not configured (${missing.join(", ")})`,
    };
  }

  // Rate limits: per-user calls/minute, plus a per-show/provider cooldown.
  const [{ n: recentCalls }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(t.enrichmentJobs)
    .where(
      and(
        eq(t.enrichmentJobs.userId, userId),
        gt(t.enrichmentJobs.createdAt, new Date(Date.now() - 60_000)),
      ),
    );
  if (Number(recentCalls) >= USER_RATE_LIMIT) {
    return { provider: provider.name, status: "skipped", count: 0, note: "Rate limited — try again in a minute" };
  }
  const [lastRun] = await db
    .select({ createdAt: t.enrichmentJobs.createdAt, count: t.enrichmentJobs.candidateCount })
    .from(t.enrichmentJobs)
    .where(
      and(
        eq(t.enrichmentJobs.showId, showId),
        eq(t.enrichmentJobs.provider, provider.name),
        eq(t.enrichmentJobs.status, "done"),
      ),
    )
    .orderBy(desc(t.enrichmentJobs.createdAt))
    .limit(1);
  if (
    lastRun &&
    Date.now() - lastRun.createdAt.getTime() < RERUN_COOLDOWN_SECONDS * 1000
  ) {
    return {
      provider: provider.name,
      status: "skipped",
      count: lastRun.count,
      note: "Fresh results already cached",
    };
  }

  const fingerprint = await buildFingerprint(db, showId);
  if (!fingerprint) {
    return { provider: provider.name, status: "error", count: 0, note: "Show not found" };
  }

  const [job] = await db
    .insert(t.enrichmentJobs)
    .values({ showId, userId, provider: provider.name })
    .returning({ id: t.enrichmentJobs.id });

  try {
    const candidates = await provider.run(fingerprint, makeCache(db, provider.name));
    for (const candidate of candidates) {
      await db
        .insert(t.dataCandidates)
        .values({
          showId,
          kind: candidate.kind,
          candidateType: candidate.candidateType,
          valueKey: candidate.valueKey.slice(0, 500),
          value: candidate.value,
          provider: provider.name,
          sourceUrl: candidate.sourceUrl,
          confidence: Math.round(candidate.confidence),
          reasons: candidate.reasons,
        })
        .onConflictDoUpdate({
          target: [
            t.dataCandidates.showId,
            t.dataCandidates.kind,
            t.dataCandidates.valueKey,
          ],
          set: {
            confidence: Math.round(candidate.confidence),
            reasons: candidate.reasons,
            fetchedAt: new Date(),
            // status intentionally preserved — a rejection stays rejected.
          },
        });
    }
    await applyAutoAccept(db, showId);
    await db
      .update(t.enrichmentJobs)
      .set({ status: "done", candidateCount: candidates.length })
      .where(eq(t.enrichmentJobs.id, job.id));
    return { provider: provider.name, status: "done", count: candidates.length };
  } catch (error) {
    const note = error instanceof Error ? error.message : "Provider failed";
    await db
      .update(t.enrichmentJobs)
      .set({ status: "error", detail: note.slice(0, 500) })
      .where(eq(t.enrichmentJobs.id, job.id));
    console.warn(`[enrich] ${provider.name} failed for ${showId}:`, error);
    return { provider: provider.name, status: "error", count: 0, note };
  }
}
