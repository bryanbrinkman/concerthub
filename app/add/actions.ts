"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import {
  addToShowLineup,
  setShowLineup,
  upsertArtist,
  upsertTour,
  upsertVenue,
  type LineupEntry,
} from "@/lib/upserts";
import { parseSetlistFmUrl } from "@/lib/setlistfm";
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

const BILLING_ROLES = new Set([
  "headliner",
  "co_headliner",
  "support",
  "opener",
  "festival_performer",
  "special_guest",
  "unknown",
]);
const EVENT_TYPES = new Set([
  "concert",
  "festival",
  "festival_day",
  "multi_act",
  "other",
]);

/**
 * Additional bill entries from the form: parallel repeated
 * performerName/performerRole fields (see components/lineup-fields.tsx).
 * Order = billing order. Deduped, primary act excluded.
 */
const parseLineup = (formData: FormData, primaryName: string): LineupEntry[] => {
  const names = formData.getAll("performerName").map(String);
  const roles = formData.getAll("performerRole").map(String);
  const seen = new Set<string>([primaryName.trim().toLowerCase()]);
  const entries: LineupEntry[] = [];
  names.forEach((raw, i) => {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    entries.push({
      name,
      role: BILLING_ROLES.has(roles[i]) ? roles[i] : "support",
    });
  });
  return entries;
};

/**
 * Resolve a pasted setlist.fm URL to a setlist id that isn't already
 * claimed by a different canonical show. Returns undefined when the URL
 * doesn't parse or the id is taken.
 */
async function claimSetlistFmId(
  db: Db,
  url: string,
  forShowId?: string,
): Promise<string | undefined> {
  const parsed = parseSetlistFmUrl(url);
  if (!parsed) return undefined;
  const taken = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, parsed));
  if (taken[0] && taken[0].id !== forShowId) return undefined;
  return parsed;
}

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
  const setlistFmUrl = optional(str(formData, "setlistFmUrl"));
  const setlistFmId = setlistFmUrl
    ? await claimSetlistFmId(db, setlistFmUrl)
    : undefined;

  const eventTypeInput = str(formData, "eventType");
  const eventType = EVENT_TYPES.has(eventTypeInput) ? eventTypeInput : "concert";
  const eventName = optional(str(formData, "eventName"));
  const endDateInput = str(formData, "endDate");
  const endDate = endDateInput && endDateInput > date ? endDateInput : undefined;
  const lineup = parseLineup(formData, artistName);

  let showId = existing[0]?.id;
  if (!showId) {
    const inserted = await db
      .insert(t.shows)
      .values({
        artistId,
        venueId,
        tourId,
        name: eventName,
        eventType,
        date,
        endDate,
        showTime: optional(str(formData, "showTime")),
        gradient: gradientFor((eventName ?? artistName) + date),
        setlistFmId,
        setlistFmUrl: setlistFmId ? setlistFmUrl : undefined,
      })
      .returning({ id: t.shows.id });
    showId = inserted[0].id;
    // The primary act is billed first; the rest follow in form order.
    await setShowLineup(db, showId, [
      { name: artistName, role: "headliner" },
      ...lineup,
    ]);
  } else {
    if (setlistFmId) {
      // Attaching to an existing canonical show — link the setlist if it
      // doesn't have one yet.
      await db
        .update(t.shows)
        .set({ setlistFmId, setlistFmUrl })
        .where(and(eq(t.shows.id, showId), isNull(t.shows.setlistFmId)));
    }
    // Never clobber an existing event's bill — only add what's new.
    await addToShowLineup(db, showId, [
      { name: artistName, role: "headliner" },
      ...lineup,
    ]);
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

/**
 * Edit a show/event: event type & name, dates, tour, the full bill, and
 * the setlist.fm link (the retroactive path for manually added shows
 * whose artist/date never auto-matched).
 */
export async function updateShowAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const showId = str(formData, "showId");
  if (!showId) return;
  await assertOwnsShow(db, userId, showId);

  const [show] = await db
    .select()
    .from(t.shows)
    .where(eq(t.shows.id, showId));
  if (!show) return;
  const [artistRow] = await db
    .select({ name: t.artists.name })
    .from(t.artists)
    .where(eq(t.artists.id, show.artistId));
  const primaryName = artistRow?.name ?? "";

  const tourName = optional(str(formData, "tourName"));
  const tourId = tourName
    ? await upsertTour(db, show.artistId, tourName, show.date.slice(0, 4))
    : null;

  // setlist.fm link: cleared field unlinks; a new URL relinks (unless the
  // setlist id already belongs to another show).
  const urlInput = str(formData, "setlistFmUrl");
  let setlistFmId = show.setlistFmId;
  let setlistFmUrl = show.setlistFmUrl;
  if (!urlInput) {
    setlistFmId = null;
    setlistFmUrl = null;
  } else if (urlInput !== show.setlistFmUrl) {
    const claimed = await claimSetlistFmId(db, urlInput, showId);
    if (claimed) {
      setlistFmId = claimed;
      setlistFmUrl = urlInput;
    }
  }

  const eventTypeInput = str(formData, "eventType");
  const endDateInput = str(formData, "endDate");
  const primaryRole = str(formData, "primaryRole");

  await db
    .update(t.shows)
    .set({
      name: optional(str(formData, "eventName")) ?? null,
      eventType: EVENT_TYPES.has(eventTypeInput) ? eventTypeInput : "concert",
      endDate: endDateInput && endDateInput > show.date ? endDateInput : null,
      showTime: optional(str(formData, "showTime")) ?? null,
      tourId,
      setlistFmId,
      setlistFmUrl,
    })
    .where(eq(t.shows.id, showId));

  // Full bill replacement: primary act first, then the form's rows in
  // order. Per-performer setlist links survive (setShowLineup re-attaches
  // them by artist).
  await setShowLineup(db, showId, [
    {
      name: primaryName,
      role: BILLING_ROLES.has(primaryRole) ? primaryRole : "headliner",
    },
    ...parseLineup(formData, primaryName),
  ]);

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
    signed: formData.get("signed") !== null,
    markings: optional(str(formData, "markings")),
  };

  // First image is the cover; the rest are detail shots.
  const imageUrls = formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const cover = imageUrls[0] ?? optional(str(formData, "imageUrl"));

  await db.insert(t.posters).values({
    userId,
    showId,
    title,
    designer: str(formData, "designer") || "Unknown",
    year,
    notes: optional(str(formData, "notes")),
    owned: str(formData, "state") !== "want",
    state: str(formData, "state") || "own",
    imageUrl: cover,
    imageUrls: imageUrls.length > 1 ? imageUrls.slice(1) : undefined,
    gradient: gradientFor(title),
    editions: [edition],
  });

  revalidatePath("/", "layout");
  redirect(showId ? `/shows/${showId}` : "/posters");
}

export async function updatePosterAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const posterId = str(formData, "posterId");
  if (!posterId) return;

  const [existing] = await db
    .select()
    .from(t.posters)
    .where(and(eq(t.posters.id, posterId), eq(t.posters.userId, userId)));
  if (!existing) return;

  const title = str(formData, "title") || existing.title;
  const yearInput = Number(str(formData, "year"));
  const showId = optional(str(formData, "showId"));
  if (showId) await assertOwnsShow(db, userId, showId);

  const runSize = Number(str(formData, "runSize"));
  const copyNumber = Number(str(formData, "copyNumber"));
  const edition: Edition = {
    // keep the edition id stable across edits
    id: existing.editions?.[0]?.id ?? crypto.randomUUID(),
    name: str(formData, "editionName") || "Regular",
    runSize: Number.isFinite(runSize) && runSize > 0 ? runSize : undefined,
    copyNumber:
      Number.isFinite(copyNumber) && copyNumber > 0 ? copyNumber : undefined,
    technique: optional(str(formData, "technique")),
    dimensions: optional(str(formData, "dimensions")),
    signed: formData.get("signed") !== null,
    markings: optional(str(formData, "markings")),
  };

  const imageUrls = formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);

  await db
    .update(t.posters)
    .set({
      title,
      designer: str(formData, "designer") || "Unknown",
      year: Number.isFinite(yearInput) && yearInput > 0 ? yearInput : existing.year,
      notes: optional(str(formData, "notes")) ?? null,
      owned: str(formData, "state") !== "want",
      state: str(formData, "state") || "own",
      showId: showId ?? null,
      imageUrl: imageUrls[0] ?? null,
      imageUrls: imageUrls.length > 1 ? imageUrls.slice(1) : null,
      editions: [edition],
    })
    .where(and(eq(t.posters.id, posterId), eq(t.posters.userId, userId)));

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
