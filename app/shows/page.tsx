import Link from "next/link";
import { Download, Plus } from "lucide-react";

import {
  allShows,
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

export const metadata = { title: "Shows" };

export default async function ShowsPage() {
  const archive = await getArchive();
  const shows = allShows(archive);

  return (
    <div>
      <PageHeader
        title="All Shows"
        subtitle={`${shows.length} ${shows.length === 1 ? "show" : "shows"} in ${
          archive.demo ? "the demo archive" : "your archive"
        }.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/import">
                <Download />
                Import from setlist.fm
              </Link>
            </Button>
            <Button>
              <Plus />
              Add show
            </Button>
          </>
        }
      />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
