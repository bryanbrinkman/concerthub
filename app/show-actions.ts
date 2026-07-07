"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";

/** Per-show flags + removal for the signed-in user's archive. */

async function userShowRow(showId: string) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db || !showId) return null;
  const rows = await db
    .select()
    .from(t.userShows)
    .where(
      and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)),
    );
  return rows[0] ? { userId, db, row: rows[0] } : null;
}

export async function toggleFavoriteAction(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const ctx = await userShowRow(showId);
  if (!ctx) return;
  await ctx.db
    .update(t.userShows)
    .set({ favorite: !ctx.row.favorite })
    .where(
      and(
        eq(t.userShows.userId, ctx.userId),
        eq(t.userShows.showId, showId),
      ),
    );
  revalidatePath("/", "layout");
}

export async function toggleAttendedAction(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const ctx = await userShowRow(showId);
  if (!ctx) return;
  await ctx.db
    .update(t.userShows)
    .set({ attended: !ctx.row.attended })
    .where(
      and(
        eq(t.userShows.userId, ctx.userId),
        eq(t.userShows.showId, showId),
      ),
    );
  revalidatePath("/", "layout");
}

/**
 * Remove a show from the user's archive: deletes their attendance row and
 * everything they attached (memories, ephemera, photos, media links);
 * their posters are kept but detached. The canonical show row remains for
 * other users.
 */
export async function removeShowAction(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const ctx = await userShowRow(showId);
  if (!ctx) return;
  const { db, userId } = ctx;

  await db
    .delete(t.memories)
    .where(and(eq(t.memories.userId, userId), eq(t.memories.showId, showId)));
  await db
    .delete(t.ephemeraItems)
    .where(
      and(
        eq(t.ephemeraItems.userId, userId),
        eq(t.ephemeraItems.showId, showId),
      ),
    );
  await db
    .delete(t.showPhotos)
    .where(
      and(eq(t.showPhotos.userId, userId), eq(t.showPhotos.showId, showId)),
    );
  await db
    .delete(t.mediaLinks)
    .where(
      and(eq(t.mediaLinks.userId, userId), eq(t.mediaLinks.showId, showId)),
    );
  await db
    .update(t.posters)
    .set({ showId: null })
    .where(and(eq(t.posters.userId, userId), eq(t.posters.showId, showId)));
  await db
    .delete(t.userShows)
    .where(
      and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)),
    );

  revalidatePath("/", "layout");
  redirect("/shows");
}
