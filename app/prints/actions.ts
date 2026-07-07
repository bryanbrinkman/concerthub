"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";

/**
 * Toggle "I'm interested" on another collector's print. Expressing interest
 * shares your name/email with the owner (shown on their Trading Post view)
 * so the two of you can arrange a sale or trade off-site.
 */
export async function toggleInterestAction(formData: FormData) {
  const posterId = String(formData.get("posterId") ?? "").trim();
  if (!posterId) return;

  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) return;

  const poster = await db
    .select({ ownerId: t.posters.userId })
    .from(t.posters)
    .where(eq(t.posters.id, posterId));
  // No self-interest: owners already have the print.
  if (!poster[0] || poster[0].ownerId === userId) return;

  const existing = await db
    .select({ id: t.posterInterests.id })
    .from(t.posterInterests)
    .where(
      and(
        eq(t.posterInterests.posterId, posterId),
        eq(t.posterInterests.userId, userId),
      ),
    );

  if (existing[0]) {
    await db
      .delete(t.posterInterests)
      .where(eq(t.posterInterests.id, existing[0].id));
  } else {
    await db
      .insert(t.posterInterests)
      .values({ posterId, userId })
      .onConflictDoNothing();
  }

  revalidatePath("/prints");
}
