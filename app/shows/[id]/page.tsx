import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { removeShowAction, toggleFavoriteAction } from "@/app/show-actions";

import {
  ephemeraForShow,
  findArtist,
  findShow,
  findTour,
  findVenue,
  getArchive,
  lineupFor,
  mediaLinksForShow,
  memoryForShow,
  openersForShow,
  photosForShow,
  postersForShow,
  showTitleFor,
  showsByArtist,
  showsForTour,
} from "@/lib/archive";
import { isFestival } from "@/lib/billing";
import { LineupCard } from "@/components/lineup-card";
import { OnTheMarket } from "@/components/on-the-market";
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
import { ShareButton } from "@/components/share-button";
import { JsonLd } from "@/components/json-ld";
import { PublicShowView } from "@/components/public-show-view";
import { getPublicShow } from "@/lib/public";
import { isFestival as isFestivalEvent } from "@/lib/billing";
import {
  breadcrumbJsonLd,
  locationLine,
  metaDatePhrase,
  routeMetadata,
  showJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = await getPublicShow(id);
  if (!show) return { title: "Show not found" };

  const headliners = show.performers.filter(
    (p) => p.billingRole === "headliner" || p.billingRole === "co_headliner",
  );
  const title =
    show.name ??
    (headliners.length > 0
      ? headliners.map((p) => p.name).join(" + ")
      : show.primaryArtistName);
  const isFest = show.eventType === "festival" || show.eventType === "festival_day";
  const where = locationLine(show.venueCity, show.venueRegion, show.venueCountry);
  const when = metaDatePhrase(show.date, show.endDate);

  const metaTitle = isFest
    ? `${title} Lineup, Posters & Concert Archive`
    : `${title} at ${show.venueName}, ${when}`;
  const description = isFest
    ? `Explore ${title} at ${show.venueName}${where ? ` in ${where}` : ""}, including the lineup, concert posters, performances, and artifacts from the festival.`
    : `Explore ${title}'s ${when} concert at ${show.venueName}${where ? ` in ${where}` : ""}, including posters, setlist, and show artifacts.`;

  return routeMetadata({
    title: `${metaTitle} | Concert Collect`,
    description,
    path: `/shows/${id}`,
    image: show.posterImage,
  });
}

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const show = findShow(archive, id);
  if (!show) {
    // Not in the viewer's archive — serve the genuinely-public, fully
    // server-rendered view (logged-out visitors, crawlers, other users).
    const publicShow = await getPublicShow(id);
    if (!publicShow) notFound();
    return <PublicShowView show={publicShow} />;
  }

  const artist = findArtist(archive, show.artistId);
  const venue = findVenue(archive, show.venueId);
  const tour = show.tourId ? findTour(archive, show.tourId) : undefined;
  const displayTitle = showTitleFor(archive, show);
  const lineup = lineupFor(archive, show);
  // The lineup card earns its place when there's a real bill to show —
  // any multi-act event, always for festivals.
  const showLineupCard = lineup.length > 1 || isFestival(show);

  // Live data: setlist.fm setlist + poster imagery. Demo mode gets the
  // seeded setlist as offline fallback; user archives fall back to the
  // empty state.
  const seededSetlist = archive.demo ? getSetlistForShow(show.id) : undefined;
  const showPosters = postersForShow(archive, show.id);
  const [setlist, poster] = await Promise.all([
    resolveSetlist(show, artist?.name, seededSetlist),
    enrichPoster(showPosters[0]),
  ]);

  const canEdit = !archive.demo;
  const collectionOptions = canEdit
    ? archive.collections.map((c) => ({ id: c.id, name: c.name }))
    : undefined;
  const ephemeraItems = ephemeraForShow(archive, show.id);
  const ticketDetail = ephemeraItems.find((e) => e.kind === "ticket")?.detail;
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

  // Related shows by the same artist (beyond this tour).
  const artistShows = artist
    ? showsByArtist(archive, artist.id).filter(
        (s2) => !tourShows.some((ts) => ts.id === s2.id) || s2.id === show.id,
      )
    : [];
  const artistCarouselItems: TourCarouselItem[] = artistShows.map((s2) => {
    const v = findVenue(archive, s2.venueId);
    return {
      id: s2.id,
      href: `/shows/${s2.id}`,
      dateLabel: formatShortDate(s2.date),
      cityLabel: v ? `${v.city}${v.region ? `, ${v.region}` : ""}` : "",
      venueName: v?.name ?? "",
      gradient: s2.gradient,
      imageUrl: postersForShow(archive, s2.id)[0]?.imageUrl,
      artistShort: (artist?.name ?? "····").slice(0, 4),
      current: s2.id === show.id,
    };
  });

  // Signed-in users get a real write path for their memory (add + edit).
  const memoryPanel = memory ? (
    canEdit ? (
      <div className="space-y-2">
        <MemoryCard memory={memory} />
        <details>
          <summary className="cursor-pointer px-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Edit or delete this memory
          </summary>
          <div className="mt-2">
            <MemoryForm
              showId={show.id}
              defaultText={memory.text}
              memoryId={memory.id}
              title="Edit memory"
            />
          </div>
        </details>
      </div>
    ) : (
      <MemoryCard memory={memory} />
    )
  ) : archive.demo ? (
    <MemoryCard memory={undefined} />
  ) : (
    <MemoryForm showId={show.id} />
  );

  return (
    <div className="space-y-5">
      <JsonLd
        data={[
          showJsonLd({
            title: displayTitle,
            path: `/shows/${show.id}`,
            date: show.date,
            endDate: show.endDate,
            isFestival: isFestivalEvent(show),
            performers: lineup.map((e) => e.artist.name),
            venueName: venue?.name,
            city: venue?.city,
            region: venue?.region,
            country: venue?.country,
            image: showPosters[0]?.imageUrl,
          }),
          breadcrumbJsonLd([
            { name: "Shows", path: "/shows" },
            { name: displayTitle, path: `/shows/${show.id}` },
          ]),
        ]}
      />
      {/* Top bar: back + quick actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/my-shows"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to my shows
        </Link>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <form action={toggleFavoriteAction}>
              <input type="hidden" name="showId" value={show.id} />
              <Button type="submit" variant="outline" size="sm">
                <Heart
                  className={show.favorite ? "fill-primary text-primary" : ""}
                />
                {show.favorite ? "Saved" : "Save"}
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login?mode=signup">
                <Heart />
                Save
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/add/ephemera?show=${show.id}`}>
              <Plus />
              Add artifact
            </Link>
          </Button>
          <ShareButton />
          {canEdit ? (
            <details className="relative">
              <summary
                aria-label="More"
                className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
              >
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-border bg-popover p-1.5 shadow-xl">
                <Link
                  href={`/edit/show/${show.id}`}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                  Edit show details
                </Link>
                <Link
                  href={`/shows/${show.id}/enrich`}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4" />
                  Enrich show
                </Link>
                <form action={removeShowAction}>
                  <input type="hidden" name="showId" value={show.id} />
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from my archive
                  </button>
                </form>
                <p className="px-2.5 pb-1 pt-0.5 text-[11px] text-muted-foreground">
                  Deletes your notes, photos, and ephemera for this show.
                  Posters are kept.
                </p>
              </div>
            </details>
          ) : null}
        </div>
      </div>

      <ShowHero
        show={show}
        artist={artist}
        venue={venue}
        tour={tour}
        setlist={setlist}
        poster={poster}
        posterVariants={showPosters.map((p) => ({
          id: p.id,
          imageUrl: p.imageUrl,
          title: p.title,
        }))}
        ticketDetail={ticketDetail}
        displayTitle={displayTitle}
        openers={openersForShow(archive, show)}
        canEdit={canEdit}
        collections={collectionOptions}
      />

      {showLineupCard ? <LineupCard items={lineup} /> : null}

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
                <PosterDetailsCard poster={poster} addHref={`/add/poster?show=${show.id}`} canEdit={canEdit} collections={collectionOptions} />
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                      Photos from the night
                    </h2>
                    {photos.length > 4 ? (
                      <span className="text-xs text-primary">View all</span>
                    ) : null}
                  </div>
                  <PhotoGrid photos={photos} limit={4} addHref={`/add/photo?show=${show.id}`} canEdit={canEdit} />
                </section>
              </div>
              <TourCarousel items={carouselItems} />
              <TourCarousel
                items={artistCarouselItems}
                title={`More from ${artist?.name ?? "this artist"}`}
              />
            </TabsContent>

            <TabsContent value="setlist">
              <SetlistCard
                setlist={setlist}
                artistName={artist?.name}
                variant="full"
              />
            </TabsContent>

            <TabsContent value="poster">
              <PosterDetailsCard poster={poster} addHref={`/add/poster?show=${show.id}`} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="photos">
              <PhotoGrid
                photos={photos}
                addHref={`/add/photo?show=${show.id}`}
                canEdit={canEdit}
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
          <EphemeraGrid items={ephemeraItems} addHref={`/add/ephemera?show=${show.id}`} canEdit={canEdit} />
          <OnTheMarket showId={show.id} />
          <div id="memory" className="scroll-mt-20">
            {memoryPanel}
          </div>
          <MediaLinksCard links={links} />
        </aside>
      </div>
    </div>
  );
}
