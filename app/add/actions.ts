"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import {
  addToShowLineup,
  upsertArtist,
  upsertTour,
  type LineupEntry,
} from "@/lib/upserts";
import { parseSetlistFmUrl } from "@/lib/setlistfm";
import { createShow } from "@/lib/show-create";
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

/** Positive inches from a number input (3–100), else undefined. */
const posInches = (formData: FormData, key: string): number | undefined => {
  const value = Number(str(formData, key));
  return Number.isFinite(value) && value > 3 && value < 100 ? value : undefined;
};

/**
 * True when an error is Postgres "column ... does not exist" (42703) —
 * i.e. a schema migration hasn't been applied yet. Mirrors the resilient
 * read fallbacks in lib/archive.ts so poster writes never crash when a
 * pending migration (e.g. 0011 poster_type) lags behind a deploy.
 */
function isUndefinedColumn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    e?.code === "42703" ||
    Boolean(e?.message && /column .* does not exist/i.test(e.message))
  );
}

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
  const date = str(formData, "date"); // yyyy-mm-dd from <input type="date">
  if (!artistName || !venueName || !date) return;

  const showId = await createShow(db, userId, {
    artistName,
    venueName,
    city: str(formData, "city"),
    region: str(formData, "region"),
    country: str(formData, "country"),
    date,
    showTime: str(formData, "showTime"),
    eventType: str(formData, "eventType"),
    eventName: str(formData, "eventName"),
    endDate: str(formData, "endDate"),
    tourName: str(formData, "tourName"),
    lineup: parseLineup(formData, artistName),
    setlistFmUrl: str(formData, "setlistFmUrl"),
    favorite: formData.get("favorite") !== null,
  });

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

  // A show record is COMMUNAL — many attendees share the same canonical row.
  // So edits only FILL blanks; they never overwrite or erase a value another
  // attendee already contributed. (Your own posters/memories stay yours to
  // edit and delete.) This keeps one bad actor from wiping the archive.
  const set: Partial<typeof t.shows.$inferInsert> = {};

  if (!show.name) {
    const eventName = optional(str(formData, "eventName"));
    if (eventName) set.name = eventName;
  }
  // Upgrade the default "concert" to a more specific type, but don't change
  // a type someone already set (e.g. don't flip a festival back).
  if (show.eventType === "concert") {
    const eventTypeInput = str(formData, "eventType");
    if (EVENT_TYPES.has(eventTypeInput) && eventTypeInput !== "concert") {
      set.eventType = eventTypeInput;
    }
  }
  if (!show.endDate) {
    const endDateInput = str(formData, "endDate");
    if (endDateInput && endDateInput > show.date) set.endDate = endDateInput;
  }
  if (!show.showTime) {
    const showTime = optional(str(formData, "showTime"));
    if (showTime) set.showTime = showTime;
  }
  if (!show.tourId) {
    const tourName = optional(str(formData, "tourName"));
    if (tourName) {
      set.tourId = await upsertTour(
        db,
        show.artistId,
        tourName,
        show.date.slice(0, 4),
      );
    }
  }
  // setlist.fm: link only when not already linked. Never unlink or relink
  // over an existing link someone else attached.
  if (!show.setlistFmId) {
    const urlInput = str(formData, "setlistFmUrl");
    if (urlInput) {
      const claimed = await claimSetlistFmId(db, urlInput, showId);
      if (claimed) {
        set.setlistFmId = claimed;
        set.setlistFmUrl = urlInput;
      }
    }
  }

  if (Object.keys(set).length > 0) {
    await db.update(t.shows).set(set).where(eq(t.shows.id, showId));
  }

  // The bill is ADDITIVE: add the primary act + any performers the form
  // lists, keeping everything others already contributed. Nothing is ever
  // removed — a user can add support acts, not delete them.
  const primaryRole = str(formData, "primaryRole");
  await addToShowLineup(db, showId, [
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

/** Resolve a poster's target: a specific show, or a tour (upserting the
 * artist + tour so tour posters group correctly). */
async function resolvePosterTarget(
  db: Db,
  userId: string,
  formData: FormData,
  year: number,
): Promise<{ posterType: string; showId?: string; tourId?: string }> {
  const raw = str(formData, "posterType");
  const posterType =
    raw === "tour" ? "tour" : raw === "festival" ? "festival" : "show";

  if (posterType === "tour") {
    const tourArtist = str(formData, "tourArtist");
    const tourName = str(formData, "tourName");
    let tourId: string | undefined;
    if (tourArtist && tourName) {
      const artistId = await upsertArtist(db, tourArtist);
      tourId = await upsertTour(db, artistId, tourName, String(year || ""));
    }
    return { posterType, tourId };
  }

  // Festival: create (or reuse) a festival show with its full lineup, then
  // tie the poster to it. The first act is billed at the top; the rest are
  // festival performers — every name becomes a searchable artist.
  if (posterType === "festival") {
    const festivalName = str(formData, "festivalName");
    const venueName = str(formData, "festivalVenue");
    const date = str(formData, "festivalDate"); // yyyy-mm-dd
    const lineupNames = String(formData.get("festivalLineup") ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Need a name, place, date, and at least one act to make a real event.
    if (festivalName && venueName && date && lineupNames.length > 0) {
      const [primary, ...rest] = lineupNames;
      const showId = await createShow(db, userId, {
        artistName: primary,
        venueName,
        city: str(formData, "festivalCity"),
        date,
        endDate: str(formData, "festivalEndDate"),
        eventType: "festival",
        eventName: festivalName,
        lineup: rest.map((name) => ({ name, role: "festival_performer" })),
      });
      return { posterType, showId };
    }
    // Incomplete festival details — keep the poster, just unlinked.
    return { posterType };
  }

  const showId = optional(str(formData, "showId"));
  if (showId) await assertOwnsShow(db, userId, showId);
  return { posterType, showId };
}

export async function addPosterAction(formData: FormData) {
  const { userId, db } = await requireUserDb();
  const title = str(formData, "title");
  const year = Number(str(formData, "year"));
  if (!title || !Number.isFinite(year)) return;

  const { posterType, showId, tourId } = await resolvePosterTarget(
    db,
    userId,
    formData,
    year,
  );

  const runSize = Number(str(formData, "runSize"));
  const copyNumber = Number(str(formData, "copyNumber"));
  const edition: Edition = {
    id: crypto.randomUUID(),
    name: str(formData, "editionName") || "Regular",
    runSize: Number.isFinite(runSize) && runSize > 0 ? runSize : undefined,
    copyNumber:
      Number.isFinite(copyNumber) && copyNumber > 0 ? copyNumber : undefined,
    technique: optional(str(formData, "technique")),
    widthIn: posInches(formData, "widthIn"),
    heightIn: posInches(formData, "heightIn"),
    signed: formData.get("signed") !== null,
    markings: optional(str(formData, "markings")),
  };

  // First image is the cover; the rest are detail shots.
  const imageUrls = formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const cover = imageUrls[0] ?? optional(str(formData, "imageUrl"));

  const values = {
    userId,
    showId,
    tourId,
    posterType,
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
  };
  try {
    await db.insert(t.posters).values(values);
  } catch (error) {
    // poster_type column not yet migrated (0011) — insert without it.
    if (!isUndefinedColumn(error)) throw error;
    const { posterType: _omit, ...legacy } = values;
    await db.insert(t.posters).values(legacy);
  }

  revalidatePath("/", "layout");
  redirect(showId ? `/shows/${showId}` : "/my-posters");
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
  const year =
    Number.isFinite(yearInput) && yearInput > 0 ? yearInput : existing.year;
  const { posterType, showId, tourId } = await resolvePosterTarget(
    db,
    userId,
    formData,
    year,
  );

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
    widthIn: posInches(formData, "widthIn"),
    heightIn: posInches(formData, "heightIn"),
    signed: formData.get("signed") !== null,
    markings: optional(str(formData, "markings")),
  };

  const imageUrls = formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const set = {
    title,
    designer: str(formData, "designer") || "Unknown",
    year,
    notes: optional(str(formData, "notes")) ?? null,
    owned: str(formData, "state") !== "want",
    state: str(formData, "state") || "own",
    posterType,
    showId: showId ?? null,
    tourId: tourId ?? null,
    imageUrl: imageUrls[0] ?? null,
    imageUrls: imageUrls.length > 1 ? imageUrls.slice(1) : null,
    editions: [edition],
  };
  const where = and(eq(t.posters.id, posterId), eq(t.posters.userId, userId));
  try {
    await db.update(t.posters).set(set).where(where);
  } catch (error) {
    // poster_type column not yet migrated (0011) — update without it.
    if (!isUndefinedColumn(error)) throw error;
    const { posterType: _omit, ...legacy } = set;
    await db.update(t.posters).set(legacy).where(where);
  }

  revalidatePath("/", "layout");
  redirect(showId ? `/shows/${showId}` : "/my-posters");
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
