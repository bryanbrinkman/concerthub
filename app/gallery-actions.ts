"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { WallSlot } from "@/components/gallery-wall";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/** Persist the viewer's gallery wall layout. */
export async function saveGalleryAction(layout: WallSlot[]) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db || !Array.isArray(layout)) return;

  // Only the viewer's own posters can hang on their wall.
  const owned = new Set(
    (
      await db
        .select({ id: t.posters.id })
        .from(t.posters)
        .where(eq(t.posters.userId, userId))
    ).map((row) => row.id),
  );

  const clean = layout
    .filter((slot) => slot && owned.has(String(slot.posterId)))
    .slice(0, 150)
    .map((slot, index) => ({
      posterId: String(slot.posterId),
      x: clamp(Number(slot.x), 0, 100),
      y: clamp(Number(slot.y), 0, 100),
      w: clamp(Number(slot.w), 4, 40),
      z: clamp(Math.round(Number(slot.z)), 0, 1000) || index + 1,
    }));

  await db
    .insert(t.galleryWalls)
    .values({ userId, layout: clean, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: t.galleryWalls.userId,
      set: { layout: clean, updatedAt: new Date() },
    });

  revalidatePath("/my-gallery");
  revalidatePath(`/u/${userId}`);
}
