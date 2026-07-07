import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Heart, MoreHorizontal, Share2 } from "lucide-react";

import {
  getArtist,
  getEphemeraForShow,
  getMediaLinksForShow,
  getMemoryForShow,
  getPhotosForShow,
  getPostersForShow,
  getSetlistForShow,
  getShow,
  getShowsForTour,
  getTour,
  getVenue,
  shows,
} from "@/lib/data";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowHero } from "@/components/show-hero";
import { SetlistCard } from "@/components/setlist-card";
import { EphemeraGrid } from "@/components/ephemera-grid";
import { PosterDetailsCard } from "@/components/poster-details-card";
import { PhotoGrid } from "@/components/photo-grid";
import { MemoryCard } from "@/components/memory-card";
import { TourCarousel } from "@/components/tour-carousel";
import { MediaLinksCard } from "@/components/media-links-card";

export function generateStaticParams() {
  return shows.map((show) => ({ id: show.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = getShow(id);
  if (!show) return { title: "Show not found" };
  const artist = getArtist(show.artistId);
  return {
    title: `${artist?.name ?? "Show"} · ${formatShortDate(show.date)}`,
  };
}

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = getShow(id);
  if (!show) notFound();

  const artist = getArtist(show.artistId);
  const venue = getVenue(show.venueId);
  const tour = show.tourId ? getTour(show.tourId) : undefined;
  const setlist = getSetlistForShow(show.id);
  const posters = getPostersForShow(show.id);
  const poster = posters[0];
  const ephemeraItems = getEphemeraForShow(show.id);
  const memory = getMemoryForShow(show.id);
  const links = getMediaLinksForShow(show.id);
  const photos = getPhotosForShow(show.id);
  const tourShows = show.tourId ? getShowsForTour(show.tourId) : [];
  const mediaCount = links.filter(
    (l) => l.kind === "audio" || l.kind === "video" || l.kind === "streaming",
  ).length;

  return (
    <div className="space-y-6">
      {/* Top bar: back + quick actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/shows"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to all shows
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Heart className={show.favorite ? "fill-primary text-primary" : ""} />
            Favorite
          </Button>
          <Button variant="outline" size="sm">
            <Share2 />
            Share
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="More">
            <MoreHorizontal />
          </Button>
        </div>
      </div>

      <ShowHero
        show={show}
        artist={artist}
        venue={venue}
        tour={tour}
        setlist={setlist}
      />

      {/* Main content + right rail */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="setlist">Setlist</TabsTrigger>
              <TabsTrigger value="poster">Poster</TabsTrigger>
              <TabsTrigger value="photos">
                Photos{photos.length > 0 ? ` (${photos.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="media">
                Audio/Video{mediaCount > 0 ? ` (${mediaCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <PosterDetailsCard poster={poster} />
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                      Photos from the night
                    </h2>
                    {photos.length > 4 ? (
                      <span className="text-xs text-primary">View all</span>
                    ) : null}
                  </div>
                  <PhotoGrid photos={photos} limit={4} />
                </section>
              </div>
              {tourShows.length > 1 ? (
                <TourCarousel shows={tourShows} currentShowId={show.id} />
              ) : null}
            </TabsContent>

            <TabsContent value="setlist">
              <SetlistCard setlist={setlist} variant="full" />
            </TabsContent>

            <TabsContent value="poster">
              <PosterDetailsCard poster={poster} />
            </TabsContent>

            <TabsContent value="photos">
              <PhotoGrid
                photos={photos}
                className="sm:grid-cols-2 md:grid-cols-3"
              />
            </TabsContent>

            <TabsContent value="media">
              <MediaLinksCard links={links} />
            </TabsContent>

            <TabsContent value="notes">
              <MemoryCard memory={memory} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail — stacks below main content under xl */}
        <aside className="min-w-0 space-y-6">
          <EphemeraGrid items={ephemeraItems} />
          <MemoryCard memory={memory} />
          <MediaLinksCard links={links} />
        </aside>
      </div>
    </div>
  );
}
