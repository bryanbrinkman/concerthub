import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";

import {
  ephemeraForShow,
  findArtist,
  findTour,
  findVenue,
  getArchive,
  showTitleFor,
  postersForShow,
  showsByArtist,
} from "@/lib/archive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientArt } from "@/components/gradient-art";
import { ShowCard } from "@/components/show-card";
import { JsonLd } from "@/components/json-ld";
import { PublicArtistView } from "@/components/public-artist-view";
import { getPublicArtist } from "@/lib/public";
import { breadcrumbJsonLd, musicGroupJsonLd, routeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artist = await getPublicArtist(id);
  if (!artist) return { title: "Artist" };
  return routeMetadata({
    title: `${artist.name} — Concerts, Posters & Show History | Concert Collect`,
    description: `Explore ${artist.name}'s concert history, posters, and posterography${artist.hometown ? ` — from ${artist.hometown}` : ""} on Concert Collect.`,
    path: `/artists/${id}`,
  });
}

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const artist = findArtist(archive, id);
  if (!artist) {
    const publicArtist = await getPublicArtist(id);
    if (!publicArtist) notFound();
    return <PublicArtistView artist={publicArtist} />;
  }

  const shows = showsByArtist(archive, artist.id);
  const attended = shows.filter((s) => s.attended);
  const showIds = new Set(shows.map((s) => s.id));
  const posterography = archive.posters
    .filter((p) => p.showId && showIds.has(p.showId))
    .sort((a, b) => b.year - a.year);
  const posteredShowIds = new Set(
    posterography.map((p) => p.showId as string),
  );
  const showsMissingPosters = shows.filter(
    (s) => !posteredShowIds.has(s.id),
  ).length;

  // Billing role for this artist on a given show (legacy single-artist
  // shows count as headline slots).
  const roleOn = (showId: string): string => {
    const show = archive.shows.find((s) => s.id === showId);
    if (!show) return "headliner";
    const slot = (show.performers ?? []).find((p) => p.artistId === artist.id);
    if (slot) return slot.billingRole;
    return show.artistId === artist.id ? "headliner" : "unknown";
  };
  const isFestivalShow = (showId: string): boolean => {
    const show = archive.shows.find((s) => s.id === showId);
    return show?.eventType === "festival" || show?.eventType === "festival_day";
  };
  // Headline/co-headline posters make the primary posterography; festival
  // lineup posters and support slots get their own subsection so one
  // 50-band festival poster never dominates 50 posterographies.
  const headlinePosters = posterography.filter((p) =>
    ["headliner", "co_headliner"].includes(roleOn(p.showId as string)),
  );
  const appearancePosters = posterography.filter(
    (p) => !headlinePosters.includes(p),
  );

  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          musicGroupJsonLd(artist.name, `/artists/${artist.id}`),
          breadcrumbJsonLd([
            { name: "Artists", path: "/artists" },
            { name: artist.name, path: `/artists/${artist.id}` },
          ]),
        ]}
      />
      <Link
        href="/artists"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All artists
      </Link>

      <div className="flex items-center gap-5">
        <GradientArt
          gradient={artist.gradient}
          className="h-20 w-20 shrink-0 rounded-full"
        >
          <div className="flex w-full items-center justify-center">
            <span className="text-2xl font-bold text-white/90">
              {artist.name.charAt(0)}
            </span>
          </div>
        </GradientArt>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {artist.name}
          </h1>
          {artist.hometown ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {artist.hometown}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artist.genres.map((genre) => (
              <Badge key={genre} variant="secondary">
                {genre}
              </Badge>
            ))}
            <Badge>
              Seen {attended.length} {attended.length === 1 ? "time" : "times"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Posterography — the visual record of this band's shows */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Posterography</h2>
            {posterography.length > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {showsMissingPosters > 0 ? (
                  <span className="text-amber-400">
                    {showsMissingPosters}{" "}
                    {showsMissingPosters === 1 ? "show is" : "shows are"}{" "}
                    missing poster data — know of one?
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    Complete for all known shows
                  </span>
                )}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/add/poster">Add a poster</Link>
          </Button>
        </div>
        {posterography.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No posters cataloged for {artist.name} yet — know of one?{" "}
            <Link href="/add/poster" className="text-primary hover:underline">
              Add it →
            </Link>
          </p>
        ) : (
          <div className="space-y-5">
            {headlinePosters.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {headlinePosters.map((poster) => (
                  <Link
                    key={poster.id}
                    href={`/posters/${poster.id}`}
                    className="group block"
                  >
                    {poster.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster.imageUrl}
                        alt={poster.title}
                        loading="lazy"
                        className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                        {poster.title}
                      </div>
                    )}
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      {poster.year} · {poster.designer}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No headline posters yet — {artist.name}'s posters below are
                from festival lineups or support slots.
              </p>
            )}

            {appearancePosters.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Festival appearances & support bills
                </h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {appearancePosters.map((poster) => (
                    <Link
                      key={poster.id}
                      href={`/posters/${poster.id}`}
                      className="group relative block"
                    >
                      {poster.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={poster.imageUrl}
                          alt={poster.title}
                          loading="lazy"
                          className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                          {poster.title}
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white/85">
                        {isFestivalShow(poster.showId as string)
                          ? "Festival appearance"
                          : "On the bill"}
                      </span>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {poster.year} · {poster.designer}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <h2 className="text-lg font-semibold">Show history</h2>
      {shows.some((s) => s.artistId !== artist.id) ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Includes shows where {artist.name} opened — the card shows the
          headliner.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shows.map((show) => (
          <ShowCard
            title={showTitleFor(archive, show)}
            key={show.id}
            show={show}
            artist={findArtist(archive, show.artistId) ?? artist}
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
    </div>
  );
}
