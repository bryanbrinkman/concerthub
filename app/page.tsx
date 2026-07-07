import Link from "next/link";
import { ArrowRight, CalendarDays, Image as ImageIcon, Ticket, Users } from "lucide-react";

import {
  artists,
  getAllShows,
  getArchiveCounts,
  getArtist,
  getVenue,
  memories,
} from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ShowCard } from "@/components/show-card";
import { MemoryCard } from "@/components/memory-card";

export default function DashboardPage() {
  const counts = getArchiveCounts();
  const recentShows = getAllShows().filter((s) => s.attended).slice(0, 4);
  const latestMemory = memories[0];
  const latestMemoryShow = latestMemory
    ? getAllShows().find((s) => s.id === latestMemory.showId)
    : undefined;

  const stats = [
    { label: "Shows attended", value: counts.shows, icon: CalendarDays },
    { label: "Artists seen", value: artists.length, icon: Users },
    { label: "Posters archived", value: counts.posters, icon: ImageIcon },
    { label: "Ticket stubs", value: counts.tickets, icon: Ticket },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back, Bryan"
        subtitle="Your live music archive — every show, stub, and story in one place."
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
            <CardContent className="flex items-center gap-4 p-5">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recentShows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* Latest memory */}
      {latestMemory && latestMemoryShow ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Latest memory</h2>
            <MemoryCard
              memory={latestMemory}
              title={`${getArtist(latestMemoryShow.artistId)?.name ?? "Show"} · ${
                getVenue(latestMemoryShow.venueId)?.name ?? ""
              }`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
