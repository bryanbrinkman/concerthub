"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { addToShowLineup } from "@/lib/upserts";

/** Review actions for enrichment candidates (app/shows/[id]/enrich). */

async function requireCandidate(candidateId: string) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) redirect("/");
  const [candidate] = await (db as Db)
    .select()
    .from(t.dataCandidates)
    .where(eq(t.dataCandidates.id, candidateId));
  if (!candidate) redirect("/");
  const owns = await (db as Db)
    .select({ showId: t.userShows.showId })
    .from(t.userShows)
    .where(
      and(
        eq(t.userShows.userId, userId as string),
        eq(t.userShows.showId, candidate.showId),
      ),
    );
  if (!owns[0]) redirect("/");
  return { db: db as Db, userId: userId as string, candidate };
}

const setStatus = (db: Db, id: string, status: string) =>
  db
    .update(t.dataCandidates)
    .set({ status })
    .where(eq(t.dataCandidates.id, id));

export async function rejectCandidateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;
  const { db, candidate } = await requireCandidate(candidateId);
  await setStatus(db, candidate.id, "rejected");
  revalidatePath(`/shows/${candidate.showId}/enrich`);
}

/** Approve one performer suggestion onto the show's bill. */
export async function approvePerformerAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;
  const { db, candidate } = await requireCandidate(candidateId);
  const value = candidate.value as { name?: string; role?: string };
  if (!value.name) return;
  await addToShowLineup(db, candidate.showId, [
    { name: value.name, role: value.role ?? "festival_performer" },
  ]);
  await setStatus(db, candidate.id, "user_confirmed");
  revalidatePath("/", "layout");
}

/** Batch approve: every pending performer suggestion for the show. */
export async function approveAllPerformersAction(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  if (!showId) return;
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) redirect("/");
  const owns = await db
    .select({ showId: t.userShows.showId })
    .from(t.userShows)
    .where(and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)));
  if (!owns[0]) redirect("/");

  const pending = await db
    .select()
    .from(t.dataCandidates)
    .where(
      and(
        eq(t.dataCandidates.showId, showId),
        eq(t.dataCandidates.kind, "performer"),
        eq(t.dataCandidates.status, "pending"),
      ),
    );
  if (pending.length === 0) return;
  await addToShowLineup(
    db,
    showId,
    pending.map((c) => {
      const value = c.value as { name: string; role?: string };
      return { name: value.name, role: value.role ?? "festival_performer" };
    }),
  );
  await db
    .update(t.dataCandidates)
    .set({ status: "user_confirmed" })
    .where(
      inArray(
        t.dataCandidates.id,
        pending.map((c) => c.id),
      ),
    );
  revalidatePath("/", "layout");
}

/**
 * Confirm a web-discovered image as this show's poster: creates a real
 * poster record (unowned — it's archive documentation, not a copy in
 * the viewer's collection). Poster-artist credit stays "Unknown" until
 * a human fills it in; enrichment never attributes poster artists.
 */
export async function approvePosterAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;
  const { db, userId, candidate } = await requireCandidate(candidateId);
  const value = candidate.value as { imageUrl?: string; title?: string };
  if (!value.imageUrl) return;

  const [show] = await db
    .select({
      date: t.shows.date,
      name: t.shows.name,
      artistName: t.artists.name,
    })
    .from(t.shows)
    .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
    .where(eq(t.shows.id, candidate.showId));

  await db.insert(t.posters).values({
    userId,
    showId: candidate.showId,
    title: `${show?.name ?? show?.artistName ?? "Show"} poster`,
    designer: "Unknown",
    year: Number(show?.date.slice(0, 4) ?? new Date(candidate.fetchedAt).getFullYear()),
    owned: false,
    state: "want",
    imageUrl: value.imageUrl,
    notes: `Found via enrichment — source: ${candidate.sourceUrl ?? "web search"}`,
    gradient: gradientFor(value.imageUrl),
    editions: [],
  });
  await setStatus(db, candidate.id, "user_confirmed");
  revalidatePath("/", "layout");
}

/** Approve a video: attach it as a media link on the show. */
export async function approveVideoAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;
  const { db, userId, candidate } = await requireCandidate(candidateId);
  const value = candidate.value as {
    videoId?: string;
    title?: string;
    channel?: string;
  };
  if (!value.videoId || !value.title) return;
  await db.insert(t.mediaLinks).values({
    userId,
    showId: candidate.showId,
    kind: "video",
    label: value.title,
    sublabel: value.channel ? `YouTube · ${value.channel}` : "YouTube",
    url: `https://www.youtube.com/watch?v=${value.videoId}`,
  });
  await setStatus(db, candidate.id, "user_confirmed");
  revalidatePath("/", "layout");
}
