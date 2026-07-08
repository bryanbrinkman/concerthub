import Link from "next/link";
import { Download, Plus } from "lucide-react";

import {
  allShows,
  ephemeraForShow,
  findArtist,
  findTour,
  findVenue,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ShowCard } from "@/components/show-card";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "My Shows" };

export default async function MyShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const archive = await getArchive();
  const tokens = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const shows = allShows(archive).filter((show) => {
    if (tokens.length === 0) return true;
    const hay = [
      findArtist(archive, show.artistId)?.name,
      findVenue(archive, show.venueId)?.name,
      findVenue(archive, show.venueId)?.city,
      show.tourId ? findTour(archive, show.tourId)?.name : "",
      show.date,
    ]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });

  return (
    <div>
      <PageHeader
        title="My Shows"
        subtitle={`${shows.length} ${shows.length === 1 ? "show" : "shows"} in ${
          archive.demo ? "the demo archive" : "your personal collection"
        } — every show you've added, artifacts or not.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/import">
                <Download />
                Import from setlist.fm
              </Link>
            </Button>
            <Button asChild>
              <Link href="/add/show">
                <Plus />
                Add show
              </Link>
            </Button>
          </>
        }
      />
      <form action="/my-shows" method="get" className="mb-5 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search your shows — artist, venue, city, year…"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {shows.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No shows yet"
          description="Import your setlist.fm attendance history to fill your archive in one click."
          actionLabel="Import from setlist.fm"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              artist={findArtist(archive, show.artistId)}
              venue={findVenue(archive, show.venueId)}
              tour={show.tourId ? findTour(archive, show.tourId) : undefined}
              posterImage={postersForShow(archive, show.id)[0]?.imageUrl}
              ticketDetail={
                ephemeraForShow(archive, show.id).find(
                  (e) => e.kind === "ticket",
                )?.detail
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
