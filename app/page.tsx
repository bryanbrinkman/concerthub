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
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterArt } from "@/components/gradient-art";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/empty-state";

export default async function DashboardPage() {
  const archive = await getArchive();
  const counts = archiveCounts(archive);

  // The poster is the star: the front page showcases only shows whose
  // pages have real poster artwork attached.
  const posterShows = allShows(archive)
    .flatMap((show) => {
      const posterImage = postersForShow(archive, show.id).find(
        (p) => p.imageUrl,
      )?.imageUrl;
      return posterImage ? [{ show, posterImage }] : [];
    })
    .slice(0, 8);

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

      {/* The poster wall */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">The poster wall</h2>
          <Link
            href="/posters"
            className="text-sm text-primary transition-colors hover:text-primary/80"
          >
            Fan through the rack
          </Link>
        </div>
        {posterShows.length === 0 ? (
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
            {posterShows.map(({ show, posterImage }) => {
              const artist = findArtist(archive, show.artistId);
              const venue = findVenue(archive, show.venueId);
              return (
                <Link
                  key={show.id}
                  href={`/shows/${show.id}`}
                  className="group block"
                >
                  <PosterArt
                    gradient={show.gradient}
                    imageUrl={posterImage}
                    title={artist?.name ?? "Unknown artist"}
                    className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]"
                  />
                  <div className="mt-2.5 px-0.5">
                    <p className="truncate text-sm font-medium">
                      {artist?.name ?? "Unknown artist"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {venue?.name}
                      {venue ? " · " : ""}
                      {formatShortDate(show.date)}
                    </p>
                  </div>
                </Link>
              );
            })}
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
