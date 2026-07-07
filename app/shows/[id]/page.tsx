import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Heart, MoreHorizontal, Share2 } from "lucide-react";

import {
  ephemeraForShow,
  findArtist,
  findShow,
  findTour,
  findVenue,
  getArchive,
  mediaLinksForShow,
  memoryForShow,
  photosForShow,
  postersForShow,
  showsForTour,
} from "@/lib/archive";
import { getSetlistForShow } from "@/lib/data";
import { resolveSetlist } from "@/lib/setlistfm";
import { enrichPoster } from "@/lib/expressobeans";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowHero } from "@/components/show-hero";
import { SetlistCard } from "@/components/setlist-card";
import { EphemeraGrid } from "@/components/ephemera-grid";
import { PosterDetailsCard } from "@/components/poster-details-card";
import { PhotoGrid } from "@/components/photo-grid";
import { MemoryCard } from "@/components/memory-card";
import { MemoryForm } from "@/components/memory-form";
import { TourCarousel, type TourCarouselItem } from "@/components/tour-carousel";
import { MediaLinksCard } from "@/components/media-links-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const show = findShow(archive, id);
  if (!show) return { title: "Show not found" };
  const artist = findArtist(archive, show.artistId);
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
  const archive = await getArchive();
  const show = findShow(archive, id);
  if (!show) notFound();

  const artist = findArtist(archive, show.artistId);
  const venue = findVenue(archive, show.venueId);
  const tour = show.tourId ? findTour(archive, show.tourId) : undefined;

  // Live data: setlist.fm setlist + poster imagery. Demo mode gets the
  // seeded setlist as offline fallback; user archives fall back to the
  // empty state.
  const seededSetlist = archive.demo ? getSetlistForShow(show.id) : undefined;
  const [setlist, poster] = await Promise.all([
    resolveSetlist(show, artist?.name, seededSetlist),
    enrichPoster(postersForShow(archive, show.id)[0]),
  ]);

  const ephemeraItems = ephemeraForShow(archive, show.id);
  const memory = memoryForShow(archive, show.id);
  const links = mediaLinksForShow(archive, show.id);
  const photos = photosForShow(archive, show.id);
  const mediaCount = links.filter(
    (l) => l.kind === "audio" || l.kind === "video" || l.kind === "streaming",
  ).length;

  const tourShows = show.tourId ? showsForTour(archive, show.tourId) : [];
  const carouselItems: TourCarouselItem[] = tourShows.map((s) => {
    const v = findVenue(archive, s.venueId);
    const a = findArtist(archive, s.artistId);
    return {
      id: s.id,
      href: `/shows/${s.id}`,
      dateLabel: formatShortDate(s.date),
      cityLabel: v ? `${v.city}${v.region ? `, ${v.region}` : ""}` : "",
      venueName: v?.name ?? "",
      gradient: s.gradient,
      imageUrl: postersForShow(archive, s.id)[0]?.imageUrl,
      artistShort: (a?.name ?? "····").slice(0, 4),
      current: s.id === show.id,
    };
  });

  // Signed-in users get a real write path for their memory.
  const memoryPanel = memory ? (
    <MemoryCard memory={memory} />
  ) : archive.demo ? (
    <MemoryCard memory={undefined} />
  ) : (
    <MemoryForm showId={show.id} />
  );

  return (
    <div className="space-y-5">
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
        poster={poster}
      />

      {/* Main content + right rail */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
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

            <TabsContent value="overview" className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <PosterDetailsCard poster={poster} addHref={`/add/poster?show=${show.id}`} />
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                      Photos from the night
                    </h2>
                    {photos.length > 4 ? (
                      <span className="text-xs text-primary">View all</span>
                    ) : null}
                  </div>
                  <PhotoGrid photos={photos} limit={4} addHref={`/add/photo?show=${show.id}`} />
                </section>
              </div>
              <TourCarousel items={carouselItems} />
            </TabsContent>

            <TabsContent value="setlist">
              <SetlistCard setlist={setlist} variant="full" />
            </TabsContent>

            <TabsContent value="poster">
              <PosterDetailsCard poster={poster} addHref={`/add/poster?show=${show.id}`} />
            </TabsContent>

            <TabsContent value="photos">
              <PhotoGrid
                photos={photos}
                addHref={`/add/photo?show=${show.id}`}
                className="sm:grid-cols-2 md:grid-cols-3"
              />
            </TabsContent>

            <TabsContent value="media">
              <MediaLinksCard links={links} />
            </TabsContent>

            <TabsContent value="notes">{memoryPanel}</TabsContent>
          </Tabs>
        </div>

        {/* Right rail — stacks below main content under xl */}
        <aside className="min-w-0 space-y-5">
          <EphemeraGrid items={ephemeraItems} addHref={`/add/ephemera?show=${show.id}`} />
          {memoryPanel}
          <MediaLinksCard links={links} />
        </aside>
      </div>
    </div>
  );
}
