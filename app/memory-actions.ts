"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";

/** Save the "Your memory" note for a show the signed-in user attended. */
export async function addMemoryAction(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!showId || !text) return;

  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) return;

  // Only allow notes on shows in the user's own archive.
  const owns = await db
    .select({ showId: t.userShows.showId })
    .from(t.userShows)
    .where(
      and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)),
    );
  if (!owns[0]) return;

  const existing = await db
    .select({ id: t.memories.id })
    .from(t.memories)
    .where(
      and(eq(t.memories.userId, userId), eq(t.memories.showId, showId)),
    );

  if (existing[0]) {
    await db
      .update(t.memories)
      .set({ text })
      .where(eq(t.memories.id, existing[0].id));
  } else {
    await db.insert(t.memories).values({ userId, showId, text });
  }

  revalidatePath(`/shows/${showId}`);
  revalidatePath("/memories");
}
