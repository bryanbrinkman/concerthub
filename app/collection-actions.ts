"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";

/** Server actions for custom collections (create / delete / membership). */

async function requireUserDb(): Promise<{ userId: string; db: Db }> {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) redirect("/");
  return { userId: userId as string, db: db as Db };
}

/** The collection must belong to the signed-in user. */
async function assertOwnsCollection(db: Db, userId: string, id: string) {
  const [row] = await db
    .select({ id: t.collections.id })
    .from(t.collections)
    .where(and(eq(t.collections.id, id), eq(t.collections.userId, userId)));
  if (!row) redirect("/collections");
}

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createCollectionAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const name = str(formData, "name");
  if (!name) return;
  const [row] = await db
    .insert(t.collections)
    .values({
      userId,
      name: name.slice(0, 80),
      description: str(formData, "description").slice(0, 240),
      gradient: gradientFor(name),
    })
    .returning({ id: t.collections.id });
  revalidatePath("/collections");
  if (row) redirect(`/collections/${row.id}`);
}

export async function deleteCollectionAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const id = str(formData, "collectionId");
  if (!id) return;
  await assertOwnsCollection(db, userId, id);
  await db.delete(t.collections).where(eq(t.collections.id, id));
  revalidatePath("/collections");
  redirect("/collections");
}

export async function addPosterToCollectionAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const collectionId = str(formData, "collectionId");
  const posterId = str(formData, "posterId");
  if (!collectionId || !posterId) return;
  await assertOwnsCollection(db, userId, collectionId);
  // Only the owner's own posters can join their collection.
  const [poster] = await db
    .select({ id: t.posters.id })
    .from(t.posters)
    .where(and(eq(t.posters.id, posterId), eq(t.posters.userId, userId)));
  if (!poster) return;
  await db
    .insert(t.collectionPosters)
    .values({ collectionId, posterId })
    .onConflictDoNothing();
  revalidatePath(`/collections/${collectionId}`);
}

export async function removePosterFromCollectionAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const collectionId = str(formData, "collectionId");
  const posterId = str(formData, "posterId");
  if (!collectionId || !posterId) return;
  await assertOwnsCollection(db, userId, collectionId);
  await db
    .delete(t.collectionPosters)
    .where(
      and(
        eq(t.collectionPosters.collectionId, collectionId),
        eq(t.collectionPosters.posterId, posterId),
      ),
    );
  revalidatePath(`/collections/${collectionId}`);
}
