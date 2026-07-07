"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";

/** Deletes for user-owned archive items. Ownership enforced in the WHERE. */

async function requireUserDb() {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) return null;
  return { userId, db };
}

export async function deleteEphemeraAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireUserDb();
  if (!ctx || !id) return;
  await ctx.db
    .delete(t.ephemeraItems)
    .where(
      and(eq(t.ephemeraItems.id, id), eq(t.ephemeraItems.userId, ctx.userId)),
    );
  revalidatePath("/", "layout");
}

export async function deletePhotoAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireUserDb();
  if (!ctx || !id) return;
  await ctx.db
    .delete(t.showPhotos)
    .where(and(eq(t.showPhotos.id, id), eq(t.showPhotos.userId, ctx.userId)));
  revalidatePath("/", "layout");
}

export async function deletePosterAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireUserDb();
  if (!ctx || !id) return;
  await ctx.db
    .delete(t.posters)
    .where(and(eq(t.posters.id, id), eq(t.posters.userId, ctx.userId)));
  revalidatePath("/", "layout");
}

export async function deleteMemoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireUserDb();
  if (!ctx || !id) return;
  await ctx.db
    .delete(t.memories)
    .where(and(eq(t.memories.id, id), eq(t.memories.userId, ctx.userId)));
  revalidatePath("/", "layout");
}
