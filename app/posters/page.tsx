import Link from "next/link";
import { Frame, Plus } from "lucide-react";
import { desc, eq } from "drizzle-orm";

import { getArchive, posterState } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StateBadge } from "@/components/state-badge";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Posters" };

interface WallPoster {
  id: string;
  title: string;
  designer: string;
  year: number;
  imageUrl?: string;
  state: "own" | "want" | "trade" | "sell";
  artistName?: string;
  venueName?: string;
  showDate?: string;
  ownerName?: string;
}

/**
 * The community poster database: every cataloged print across all
 * collectors, searchable. Personal collections live at /my-posters.
 */
export default async function PostersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = getDb();
  const archive = await getArchive();

  let posters: WallPoster[] = [];
  if (db) {
    try {
      const rows = await db
        .select({
          id: t.posters.id,
          title: t.posters.title,
          designer: t.posters.designer,
          year: t.posters.year,
          imageUrl: t.posters.imageUrl,
          state: t.posters.state,
          owned: t.posters.owned,
          artistName: t.artists.name,
          venueName: t.venues.name,
          showDate: t.shows.date,
          ownerName: t.users.name,
        })
        .from(t.posters)
        .innerJoin(t.users, eq(t.posters.userId, t.users.id))
        .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
        .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
        .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
        .orderBy(desc(t.posters.year))
        .limit(300);
      posters = rows.map((row) => ({
        id: row.id,
        title: row.title,
        designer: row.designer,
        year: row.year,
        imageUrl: row.imageUrl ?? undefined,
        state: (row.state ?? (row.owned ? "own" : "want")) as WallPoster["state"],
        artistName: row.artistName ?? undefined,
        venueName: row.venueName ?? undefined,
        showDate: row.showDate ?? undefined,
        ownerName: row.ownerName ?? undefined,
      }));
    } catch (error) {
      console.warn("[posters] community query failed:", error);
    }
  }
  // Demo mode / unreachable DB: the seeded archive stands in.
  if (posters.length === 0 && archive.demo) {
    posters = archive.posters.map((p) => ({
      id: p.id,
      title: p.title,
      designer: p.designer,
      year: p.year,
      imageUrl: p.imageUrl,
      state: posterState(p),
    }));
  }

  const tokens = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    posters = posters.filter((p) => {
      const hay =
        `${p.title} ${p.designer} ${p.artistName ?? ""} ${p.venueName ?? ""} ${p.year} ${p.ownerName ?? ""}`.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }

  return (
    <div>
      <PageHeader
        title="Poster Database"
        subtitle="Every print cataloged by the community — the visual record of live music. Your own flat file lives in My Posters."
        actions={
          <Button asChild>
            <Link href="/add/poster">
              <Plus />
              Add poster
            </Link>
          </Button>
        }
      />

      <form action="/posters" method="get" className="mb-5 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search — artist, poster artist, venue, year…"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {posters.length === 0 ? (
        <EmptyState
          icon={Frame}
          title={q ? `Nothing matches "${q}"` : "No posters in the archive yet"}
          description="Prints appear here as collectors catalog them. Know of one? Help complete the archive."
          actionLabel="Add a poster"
          actionHref="/add/poster"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {posters.map((poster) => (
            <Link
              key={poster.id}
              href={`/posters/${poster.id}`}
              className="group block"
            >
              {poster.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster.imageUrl}
                  alt={`${poster.title} — art by ${poster.designer}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-3 text-center font-mono text-[10px] uppercase text-muted-foreground">
                  {poster.title}
                </div>
              )}
              <div className="mt-2 space-y-0.5 px-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {poster.artistName ?? poster.title}
                  </p>
                  {poster.state !== "own" ? (
                    <StateBadge state={poster.state} />
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    poster.venueName,
                    poster.showDate
                      ? formatShortDate(poster.showDate)
                      : String(poster.year),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {poster.designer && poster.designer !== "Unknown" ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Art by {poster.designer}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
