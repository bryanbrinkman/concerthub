import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, CalendarDays, MapPin } from "lucide-react";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { GradientKey } from "@/lib/types";
import { formatShortDate, formatShowDate, parsePosterSizeIn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PosterArt } from "@/components/gradient-art";
import { TicketArt } from "@/components/ticket-art";
import { GalleryWall, type WallSlot } from "@/components/gallery-wall";

/** Dynamic preview so a shared gallery/profile link shows the collector's
 * name in the browser tab and social cards. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  if (!db) return { title: "Collector profile" };
  try {
    const [user] = await db
      .select({ name: t.users.name })
      .from(t.users)
      .where(eq(t.users.id, id));
    const name = user?.name ?? "A collector";
    const title = `${name}'s archive`;
    const description = `${name}'s concert archive on Concert Collect — their gallery wall, posters, and shows.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "profile" },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return { title: "Collector profile" };
  }
}

/**
 * Public, read-only collector profile: their attended shows and poster
 * wall. Deliberately excludes memories, ephemera details, and photos —
 * those stay private to the archive owner for now.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();

  const [user] = await db
    .select({ id: t.users.id, name: t.users.name })
    .from(t.users)
    .where(eq(t.users.id, id));
  if (!user) notFound();

  const showRows = await db
    .select({
      id: t.shows.id,
      date: t.shows.date,
      showTime: t.shows.showTime,
      gradient: t.shows.gradient,
      artistName: t.artists.name,
      venueName: t.venues.name,
      venueCity: t.venues.city,
      venueRegion: t.venues.region,
      favorite: t.userShows.favorite,
    })
    .from(t.userShows)
    .innerJoin(t.shows, eq(t.userShows.showId, t.shows.id))
    .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
    .innerJoin(t.venues, eq(t.shows.venueId, t.venues.id))
    .where(eq(t.userShows.userId, user.id))
    .orderBy(desc(t.shows.date));

  const posterRows = await db
    .select({
      id: t.posters.id,
      title: t.posters.title,
      designer: t.posters.designer,
      year: t.posters.year,
      imageUrl: t.posters.imageUrl,
      gradient: t.posters.gradient,
      editions: t.posters.editions,
      state: t.posters.state,
      owned: t.posters.owned,
    })
    .from(t.posters)
    .where(eq(t.posters.userId, user.id));

  // Founding Collector: one of the first archives to catalog 10+ prints.
  const ownedCount = posterRows.filter(
    (p) => (p.state ?? (p.owned ? "own" : "want")) !== "want",
  ).length;
  const isFoundingCollector = ownedCount >= 10;

  const wall = posterRows.filter((p) => p.imageUrl);
  const name = user.name ?? "A collector";

  // Hand-arranged gallery wall, when the collector has saved one.
  let galleryLayout: WallSlot[] | undefined;
  try {
    const [galleryRow] = await db
      .select({ layout: t.galleryWalls.layout })
      .from(t.galleryWalls)
      .where(eq(t.galleryWalls.userId, user.id));
    galleryLayout = galleryRow?.layout;
  } catch {
    // gallery table not migrated yet — fall back to the grid
  }
  const galleryItems = wall.map((p) => ({
    posterId: p.id,
    imageUrl: p.imageUrl as string,
    title: p.title,
    widthIn:
      p.editions?.[0]?.widthIn ??
      parsePosterSizeIn(p.editions?.[0]?.dimensions)?.widthIn,
  }));
  const hasGallery =
    galleryLayout &&
    galleryLayout.some((slot) =>
      galleryItems.some((item) => item.posterId === slot.posterId),
    );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {name}&apos;s archive
          </h1>
          {isFoundingCollector ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              <Award className="h-3.5 w-3.5" />
              Founding Collector
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {showRows.length} {showRows.length === 1 ? "show" : "shows"} ·{" "}
          {posterRows.length} {posterRows.length === 1 ? "print" : "prints"} —
          on Concert Collect
        </p>
      </div>

      {hasGallery ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Gallery wall</h2>
          <GalleryWall items={galleryItems} initialLayout={galleryLayout} />
        </section>
      ) : null}

      {wall.length > 0 && !hasGallery ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Poster wall</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {wall.map((poster) => (
              <div key={poster.id}>
                <PosterArt
                  gradient={(poster.gradient ?? "midnight") as GradientKey}
                  imageUrl={poster.imageUrl ?? undefined}
                  title={poster.title}
                  className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)]"
                />
                <div className="mt-2 px-0.5">
                  <p className="truncate text-sm font-medium">{poster.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {poster.designer} · {poster.year}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Shows</h2>
        {showRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing archived yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {showRows.map((show) => (
              <div key={show.id}>
                <TicketArt
                  seedId={show.id}
                  gradient={(show.gradient ?? "midnight") as GradientKey}
                  artist={show.artistName}
                  venue={show.venueName}
                  cityLine={`${show.venueCity}${show.venueRegion ? `, ${show.venueRegion}` : ""}`}
                  dateLine={formatShowDate(show.date)}
                  timeLine={show.showTime ?? undefined}
                />
                <div className="mt-2 space-y-1 px-0.5">
                  <p className="truncate text-sm font-medium">
                    {show.artistName}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {show.venueName}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    {formatShortDate(show.date)}
                  </p>
                  {show.favorite ? <Badge variant="success">Favorite</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Concert Collect — your shows, your story.{" "}
        <a href="/" className="text-primary hover:underline">
          Start your own archive
        </a>
      </p>
    </div>
  );
}
