"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { upsertArtist, upsertTour, upsertVenue } from "@/lib/upserts";
import type { Edition, EphemeraKind } from "@/lib/types";

/** Server actions behind the add-item forms (/add/...). */

async function requireUserDb(): Promise<{ userId: string; db: Db }> {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) redirect("/");
  return { userId: userId as string, db: db as Db };
}

/** The show must be in the signed-in user's archive to attach items to it. */
async function assertOwnsShow(db: Db, userId: string, showId: string) {
  const rows = await db
    .select({ showId: t.userShows.showId })
    .from(t.userShows)
    .where(
      and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)),
    );
  if (!rows[0]) redirect("/shows");
}

const str = (formData: FormData, key: string): string =>
  String(formData.get(key) ?? "").trim();

const optional = (value: string): string | undefined =>
  value.length > 0 ? value : undefined;

export async function addShowAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const artistName = str(formData, "artistName");
  const venueName = str(formData, "venueName");
  const city = str(formData, "city");
  const date = str(formData, "date"); // yyyy-mm-dd from <input type="date">
  if (!artistName || !venueName || !date) return;

  const artistId = await upsertArtist(db, artistName);
  const venueId = await upsertVenue(
    db,
    venueName,
    city,
    optional(str(formData, "region")),
    optional(str(formData, "country")),
  );
  const tourName = optional(str(formData, "tourName"));
  const tourId = tourName
    ? await upsertTour(db, artistId, tourName, date.slice(0, 4))
    : undefined;

  // Reuse an identical canonical show if one already exists.
  const existing = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(
      and(
        eq(t.shows.artistId, artistId),
        eq(t.shows.venueId, venueId),
        eq(t.shows.date, date),
      ),
    );
  let showId = existing[0]?.id;
  if (!showId) {
    const inserted = await db
      .insert(t.shows)
      .values({
        artistId,
        venueId,
        tourId,
        date,
        showTime: optional(str(formData, "showTime")),
        gradient: gradientFor(artistName + date),
      })
      .returning({ id: t.shows.id });
    showId = inserted[0].id;
  }

  await db
    .insert(t.userShows)
    .values({
      userId,
      showId,
      attended: true,
      favorite: formData.get("favorite") !== null,
    })
    .onConflictDoNothing();

  revalidatePath("/", "layout");
  redirect(`/shows/${showId}`);
}

export async function addEphemeraAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const showId = str(formData, "showId");
  const title = str(formData, "title");
  if (!showId || !title) return;
  await assertOwnsShow(db, userId, showId);

  const kind = (str(formData, "kind") || "other") as EphemeraKind;
  await db.insert(t.ephemeraItems).values({
    userId,
    showId,
    kind,
    title,
    detail: optional(str(formData, "detail")),
    imageUrl: optional(str(formData, "imageUrl")),
    gradient: gradientFor(title + kind),
  });

  revalidatePath("/", "layout");
  redirect(`/shows/${showId}`);
}

export async function addPosterAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const title = str(formData, "title");
  const year = Number(str(formData, "year"));
  if (!title || !Number.isFinite(year)) return;

  const showId = optional(str(formData, "showId"));
  if (showId) await assertOwnsShow(db, userId, showId);

  const runSize = Number(str(formData, "runSize"));
  const copyNumber = Number(str(formData, "copyNumber"));
  const edition: Edition = {
    id: crypto.randomUUID(),
    name: str(formData, "editionName") || "Regular",
    runSize: Number.isFinite(runSize) && runSize > 0 ? runSize : undefined,
    copyNumber:
      Number.isFinite(copyNumber) && copyNumber > 0 ? copyNumber : undefined,
    technique: optional(str(formData, "technique")),
    dimensions: optional(str(formData, "dimensions")),
    markings: optional(str(formData, "markings")),
  };

  await db.insert(t.posters).values({
    userId,
    showId,
    title,
    designer: str(formData, "designer") || "Unknown",
    year,
    notes: optional(str(formData, "notes")),
    owned: formData.get("owned") !== null,
    imageUrl: optional(str(formData, "imageUrl")),
    gradient: gradientFor(title),
    editions: [edition],
  });

  revalidatePath("/", "layout");
  redirect(showId ? `/shows/${showId}` : "/posters");
}

export async function addPhotoAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const showId = str(formData, "showId");
  const imageUrl = optional(str(formData, "imageUrl"));
  if (!showId || !imageUrl) return;
  await assertOwnsShow(db, userId, showId);

  await db.insert(t.showPhotos).values({
    userId,
    showId,
    caption: str(formData, "caption"),
    imageUrl,
    gradient: gradientFor(imageUrl),
  });

  revalidatePath("/", "layout");
  redirect(`/shows/${showId}`);
}
