import Link from "next/link";
import { Frame, Plus } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";

import { getArchive } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { GradientKey } from "@/lib/types";
import { formatShortDate, formatShowDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PosterArt } from "@/components/gradient-art";
import { TicketArt } from "@/components/ticket-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Shows" };

/**
 * The public show database: canonical shows that have artifacts (posters,
 * photos, memories, ephemera) contributed by any collector. Personal
 * everything-included lists live at /my-shows.
 */
export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = getDb();
  const archive = await getArchive();
  const myShowIds = new Set(archive.shows.map((s) => s.id));

  interface Row {
    id: string;
    date: string;
    gradient: string | null;
    artistName: string;
    venueName: string;
    venueCity: string;
    venueRegion: string | null;
    posterImage: string | null;
    posterId: string | null;
    posters: number;
    photos: number;
    memories: number;
    ephemera: number;
  }

  let rows: Row[] = [];
  if (db) {
    try {
      const countBy = async (
        table: typeof t.posters | typeof t.showPhotos | typeof t.memories | typeof t.ephemeraItems,
      ) => {
        const rs = (await db
          .select({
            showId: sql<string>`${table.showId}`,
            n: sql<number>`count(*)`,
          })
          .from(table)
          .groupBy(table.showId)) as Array<{ showId: string | null; n: number }>;
        return new Map(rs.filter((r) => r.showId).map((r) => [r.showId as string, Number(r.n)]));
      };
      const [posterCounts, photoCounts, memoryCounts, ephemeraCounts, showRows, posterArt] =
        await Promise.all([
          countBy(t.posters),
          countBy(t.showPhotos),
          countBy(t.memories),
          countBy(t.ephemeraItems),
          db
            .select({
              id: t.shows.id,
              date: t.shows.date,
              gradient: t.shows.gradient,
              artistName: t.artists.name,
              venueName: t.venues.name,
              venueCity: t.venues.city,
              venueRegion: t.venues.region,
            })
            .from(t.shows)
            .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
            .innerJoin(t.venues, eq(t.shows.venueId, t.venues.id))
            .orderBy(desc(t.shows.date))
            .limit(300),
          db
            .select({
              showId: t.posters.showId,
              id: t.posters.id,
              imageUrl: t.posters.imageUrl,
            })
            .from(t.posters),
        ]);
      const artByShow = new Map<string, { id: string; imageUrl: string }>();
      for (const p of posterArt) {
        if (p.showId && p.imageUrl && !artByShow.has(p.showId)) {
          artByShow.set(p.showId, { id: p.id, imageUrl: p.imageUrl });
        }
      }
      rows = showRows
        .map((s) => ({
          ...s,
          posterImage: artByShow.get(s.id)?.imageUrl ?? null,
          posterId: artByShow.get(s.id)?.id ?? null,
          posters: posterCounts.get(s.id) ?? 0,
          photos: photoCounts.get(s.id) ?? 0,
          memories: memoryCounts.get(s.id) ?? 0,
          ephemera: ephemeraCounts.get(s.id) ?? 0,
        }))
        .filter((s) => s.posters + s.photos + s.memories + s.ephemera > 0);
    } catch (error) {
      console.warn("[shows] public database query failed:", error);
    }
  }

  const tokens = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    rows = rows.filter((s) => {
      const hay =
        `${s.artistName} ${s.venueName} ${s.venueCity} ${s.venueRegion ?? ""} ${s.date}`.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }

  return (
    <div>
      <PageHeader
        title="Show Database"
        subtitle="Every documented night — shows with posters, photos, memories, or ephemera from the community. Your full personal list lives in My Shows."
        actions={
          <Button asChild>
            <Link href="/add/show">
              <Plus />
              Add show
            </Link>
          </Button>
        }
      />

      <form action="/shows" method="get" className="mb-5 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search — artist, venue, city, year…"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Frame}
          title={q ? `Nothing matches "${q}"` : "No documented shows yet"}
          description="Shows appear here once a collector attaches a poster, photo, memory, or ticket to them."
          actionLabel="Add a show"
          actionHref="/add/show"
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {rows.map((show) => {
            const href = myShowIds.has(show.id)
              ? `/shows/${show.id}`
              : show.posterId
                ? `/posters/${show.posterId}`
                : undefined;
            const art = show.posterImage ? (
              <PosterArt
                gradient={(show.gradient ?? "midnight") as GradientKey}
                imageUrl={show.posterImage}
                title={show.artistName}
                className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <TicketArt
                seedId={show.id}
                gradient={(show.gradient ?? "midnight") as GradientKey}
                artist={show.artistName}
                venue={show.venueName}
                cityLine={`${show.venueCity}${show.venueRegion ? `, ${show.venueRegion}` : ""}`}
                dateLine={formatShowDate(show.date)}
              />
            );
            const body = (
              <>
                {art}
                <div className="mt-2.5 space-y-1 px-0.5">
                  <p className="truncate text-sm font-medium">{show.artistName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {show.venueName} · {show.venueCity}
                    {show.venueRegion ? `, ${show.venueRegion}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatShortDate(show.date)}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {show.posters > 0 ? (
                      <Badge variant="secondary">{show.posters} poster{show.posters === 1 ? "" : "s"}</Badge>
                    ) : null}
                    {show.photos > 0 ? (
                      <Badge variant="outline">{show.photos} photo{show.photos === 1 ? "" : "s"}</Badge>
                    ) : null}
                    {show.memories > 0 ? (
                      <Badge variant="outline">{show.memories} memor{show.memories === 1 ? "y" : "ies"}</Badge>
                    ) : null}
                    {show.ephemera > 0 ? (
                      <Badge variant="outline">{show.ephemera} artifact{show.ephemera === 1 ? "" : "s"}</Badge>
                    ) : null}
                  </div>
                </div>
              </>
            );
            return href ? (
              <Link key={show.id} href={href} className="group block">
                {body}
              </Link>
            ) : (
              <div key={show.id} className="group">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
