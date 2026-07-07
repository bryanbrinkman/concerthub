import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Image as ImageIcon,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import { seedDemoAction } from "@/app/seed-actions";

import {
  allShows,
  archiveCounts,
  findArtist,
  findShow,
  findTour,
  findVenue,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ShowCard } from "@/components/show-card";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/empty-state";

export default async function DashboardPage() {
  const archive = await getArchive();
  const counts = archiveCounts(archive);
  const recentShows = allShows(archive).filter((s) => s.attended).slice(0, 4);
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
            ? "A live music archive — every show, stub, and story in one place. Sign in to start yours."
            : "Your live music archive — every show, stub, and story in one place."
        }
        actions={
          <Button asChild>
            <Link href="/shows">
              All shows
              <ArrowRight />
            </Link>
          </Button>
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

      {/* Recently archived */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently archived</h2>
          <Link
            href="/shows"
            className="text-sm text-primary transition-colors hover:text-primary/80"
          >
            View all
          </Link>
        </div>
        {recentShows.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={Download}
              title="Your archive is empty"
              description="Import your setlist.fm history to fill it in one click, or start with the demo shows."
            />
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentShows.map((show) => (
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
