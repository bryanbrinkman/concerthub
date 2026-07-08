import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Frame,
  Image as ImageIcon,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { seedDemoAction } from "@/app/seed-actions";
import {
  allShows,
  archiveCounts,
  findArtist,
  findShow,
  findVenue,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterArt } from "@/components/gradient-art";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/empty-state";
import { ShareButton } from "@/components/share-button";

export default async function DashboardPage() {
  const archive = await getArchive();
  const counts = archiveCounts(archive);

  // The poster is the star. Signed-in: your own postered shows. Signed
  // out: a random assortment of postered shows from ALL collectors,
  // linking to their public profiles.
  interface WallTile {
    key: string;
    image: string;
    title: string;
    subtitle: string;
    line2?: string;
    href: string;
  }

  const ownTiles = (): WallTile[] =>
    allShows(archive)
      .flatMap((show) => {
        const posterImage = postersForShow(archive, show.id).find(
          (p) => p.imageUrl,
        )?.imageUrl;
        return posterImage ? [{ show, posterImage }] : [];
      })
      .slice(0, 8)
      .map(({ show, posterImage }) => {
        const artist = findArtist(archive, show.artistId);
        const venue = findVenue(archive, show.venueId);
        return {
          key: show.id,
          image: posterImage,
          title: artist?.name ?? "Unknown artist",
          subtitle: `${venue?.name ?? ""}${venue ? " · " : ""}${formatShortDate(show.date)}`,
          href: `/shows/${show.id}`,
        };
      });

  let wallTiles: WallTile[];
  let communityWall = false;
  if (!archive.demo) {
    wallTiles = ownTiles();
  } else {
    // Community wall for signed-out visitors.
    const db = getDb();
    let rows: Array<{
      id: string;
      imageUrl: string | null;
      title: string;
      ownerId: string;
      ownerName: string | null;
      artistName: string | null;
      venueName: string | null;
      showDate: string | null;
    }> = [];
    if (db) {
      try {
        rows = await db
          .select({
            id: t.posters.id,
            imageUrl: t.posters.imageUrl,
            title: t.posters.title,
            ownerId: t.posters.userId,
            ownerName: t.users.name,
            artistName: t.artists.name,
            venueName: t.venues.name,
            showDate: t.shows.date,
          })
          .from(t.posters)
          .innerJoin(t.users, eq(t.posters.userId, t.users.id))
          .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
          .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
          .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
          .where(
            and(eq(t.posters.owned, true), isNotNull(t.posters.imageUrl)),
          )
          .orderBy(sql`random()`)
          .limit(8);
      } catch (error) {
        console.warn("[home] community wall query failed:", error);
      }
    }
    if (rows.length > 0) {
      communityWall = true;
      wallTiles = rows.map((row) => ({
        key: row.id,
        image: row.imageUrl as string,
        title: row.artistName ?? row.title,
        subtitle: `${row.venueName ?? ""}${row.venueName && row.showDate ? " · " : ""}${
          row.showDate ? formatShortDate(row.showDate) : ""
        }`,
        line2: `from ${row.ownerName ?? "a collector"}'s archive`,
        href: `/u/${row.ownerId}`,
      }));
    } else {
      // No community prints yet (or no DB) — fall back to the demo wall.
      wallTiles = ownTiles();
    }
  }

  const latestMemory = [...archive.memories].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const latestMemoryShow = latestMemory
    ? findShow(archive, latestMemory.showId)
    : undefined;

  const stats = [
    { label: "Shows attended", value: counts.shows, icon: CalendarDays },
    { label: "Artists seen", value: archive.artists.length, icon: Users },
    { label: "Posters archived", value: counts.posters, icon: ImageIcon },
    { label: "Ticket stubs", value: counts.tickets, icon: Ticket },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={archive.demo ? "Welcome to Concert Collect" : "Welcome back"}
        subtitle={
          archive.demo
            ? "A live music archive where the poster is the star. Sign in to hang your own wall."
            : "Your poster wall — the shows worth framing."
        }
        actions={
          <>
            {!archive.demo && archive.userId ? (
              <ShareButton
                path={`/u/${archive.userId}`}
                label="Share my archive"
              />
            ) : null}
            <Button asChild>
              <Link href="/shows">
                All shows
                <ArrowRight />
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The poster wall */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {communityWall ? "From the community's walls" : "The poster wall"}
          </h2>
          <Link
            href={communityWall ? "/prints" : "/posters"}
            className="text-sm text-primary transition-colors hover:text-primary/80"
          >
            {communityWall ? "Browse the Trading Post" : "Fan through the rack"}
          </Link>
        </div>
        {wallTiles.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={archive.shows.length === 0 ? Download : Frame}
              title={
                archive.shows.length === 0
                  ? "Your archive is empty"
                  : "No posters on the wall yet"
              }
              description={
                archive.shows.length === 0
                  ? "Import your setlist.fm history to fill it in one click, or start with the demo shows."
                  : "Add poster artwork to a show and it takes the spotlight here."
              }
              actionLabel={
                archive.shows.length === 0 ? undefined : "Add a poster"
              }
              actionHref={archive.shows.length === 0 ? undefined : "/add/poster"}
            />
            {archive.shows.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/import">
                    <Download />
                    Import from setlist.fm
                  </Link>
                </Button>
                {!archive.demo ? (
                  <form action={seedDemoAction}>
                    <Button variant="outline" type="submit">
                      <Sparkles />
                      Copy the demo shows into my archive
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {wallTiles.map((tile) => (
              <Link key={tile.key} href={tile.href} className="group block">
                <PosterArt
                  gradient="midnight"
                  imageUrl={tile.image}
                  title={tile.title}
                  className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]"
                />
                <div className="mt-2.5 px-0.5">
                  <p className="truncate text-sm font-medium">{tile.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tile.subtitle}
                  </p>
                  {tile.line2 ? (
                    <p className="truncate text-xs text-muted-foreground/70">
                      {tile.line2}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Latest memory */}
      {latestMemory && latestMemoryShow ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Latest memory</h2>
            <MemoryCard
              memory={latestMemory}
              title={`${findArtist(archive, latestMemoryShow.artistId)?.name ?? "Show"} · ${
                findVenue(archive, latestMemoryShow.venueId)?.name ?? ""
              }`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
