import Link from "next/link";
import { ArrowUpRight, NotebookPen } from "lucide-react";

import { findArtist, findShow, findVenue, getArchive } from "@/lib/archive";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const archive = await getArchive();
  const sorted = [...archive.memories].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div>
      <PageHeader
        title="Memories"
        subtitle="Your own words, show by show."
        actions={
          <Button>
            <NotebookPen />
            Add memory
          </Button>
        }
      />
      {sorted.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No memories written yet"
          description="Open any show and write down what you remember before it fades."
          actionLabel="Add memory"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sorted.map((memory) => {
            const show = findShow(archive, memory.showId);
            const artist = show ? findArtist(archive, show.artistId) : undefined;
            const venue = show ? findVenue(archive, show.venueId) : undefined;
            return (
              <div key={memory.id} className="space-y-2">
                {show ? (
                  <Link
                    href={`/shows/${show.id}`}
                    className="group flex items-center gap-1.5 px-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary">
                      {artist?.name}
                    </span>
                    · {venue?.name} · {formatShortDate(show.date)}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                <MemoryCard memory={memory} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
