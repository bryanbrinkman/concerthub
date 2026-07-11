import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, Pencil } from "lucide-react";
import { and, eq, ne } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { getArchive, posterState } from "@/lib/archive";
import type { Edition, PosterState, PosterType } from "@/lib/types";
import { formatEditionSize, formatShortDate, posterArtistSlug } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterGallery } from "@/components/poster-gallery";
import { StateBadge } from "@/components/state-badge";
import { JsonLd } from "@/components/json-ld";
import { getPublicPoster } from "@/lib/public";
import {
  breadcrumbJsonLd,
  posterJsonLd,
  routeMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poster = await getPublicPoster(id);
  if (!poster) return { title: "Poster record" };

  const subject = poster.artistName ?? poster.title;
  const place = poster.venueName ? ` ${poster.venueName}` : "";
  const title = `${subject}${place} ${poster.year} Concert Poster | Concert Collect`;
  const by =
    poster.designer && poster.designer !== "Unknown"
      ? ` by ${poster.designer}`
      : "";
  const description = `View the ${poster.title} concert poster${by}${poster.showDate ? ` from ${formatShortDate(poster.showDate)}` : ` (${poster.year})`}, including print details, edition information, poster artist, and related show history.`;

  return routeMetadata({
    title,
    description,
    path: `/posters/${id}`,
    image: poster.imageUrl,
  });
}

interface PosterRecord {
  id: string;
  title: string;
  designer: string;
  year: number;
  notes?: string;
  images: string[];
  editions: Edition[];
  state: PosterState;
  posterType: PosterType;
  tourName?: string;
  ownerId?: string;
  ownerName?: string;
  showId?: string;
  showDate?: string;
  artistName?: string;
  venueName?: string;
  venueCity?: string;
  isOwner: boolean;
}

/**
 * Canonical poster record: the collectible object, always connected back
 * to its show. Resolves from the viewer's archive first (covers demo
 * mode), then the shared database (covers Trading Post links).
 */
export default async function PosterRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const db = getDb();
  const viewerId = await currentUserId();

  let record: PosterRecord | undefined;
  const mine = archive.posters.find((p) => p.id === id);
  if (mine) {
    const show = mine.showId
      ? archive.shows.find((s) => s.id === mine.showId)
      : undefined;
    const artist = show
      ? archive.artists.find((a) => a.id === show.artistId)
      : undefined;
    const venue = show
      ? archive.venues.find((v) => v.id === show.venueId)
      : undefined;
    record = {
      id: mine.id,
      title: mine.title,
      designer: mine.designer,
      year: mine.year,
      notes: mine.notes,
      images: [
        ...(mine.imageUrl ? [mine.imageUrl] : []),
        ...(mine.imageUrls ?? []),
      ],
      editions: mine.editions,
      state: posterState(mine),
      posterType: mine.posterType ?? "show",
      tourName: mine.tourId
        ? archive.tours.find((tr) => tr.id === mine.tourId)?.name
        : undefined,
      showId: show?.id,
      showDate: show?.date,
      artistName: artist?.name,
      venueName: venue?.name,
      venueCity: venue?.city,
      isOwner: !archive.demo,
    };
  } else if (db) {
    try {
      const [row] = await db
        .select({
          id: t.posters.id,
          title: t.posters.title,
          designer: t.posters.designer,
          year: t.posters.year,
          notes: t.posters.notes,
          imageUrl: t.posters.imageUrl,
          imageUrls: t.posters.imageUrls,
          editions: t.posters.editions,
          state: t.posters.state,
          owned: t.posters.owned,
          ownerId: t.posters.userId,
          ownerName: t.users.name,
          showId: t.posters.showId,
          showDate: t.shows.date,
          artistName: t.artists.name,
          venueName: t.venues.name,
          venueCity: t.venues.city,
        })
        .from(t.posters)
        .innerJoin(t.users, eq(t.posters.userId, t.users.id))
        .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
        .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
        .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
        .where(eq(t.posters.id, id));
      if (row) {
        record = {
          id: row.id,
          title: row.title,
          designer: row.designer,
          year: row.year,
          notes: row.notes ?? undefined,
          images: [
            ...(row.imageUrl ? [row.imageUrl] : []),
            ...(row.imageUrls ?? []),
          ],
          editions: row.editions ?? [],
          state: (row.state ?? (row.owned ? "own" : "want")) as PosterState,
          ownerId: row.ownerId,
          ownerName: row.ownerName ?? undefined,
          // Defaults; enriched below in an isolated query so a pending
          // poster_type migration can't 404 the public page.
          posterType: "show",
          showId: row.showId ?? undefined,
          showDate: row.showDate ?? undefined,
          artistName: row.artistName ?? undefined,
          venueName: row.venueName ?? undefined,
          venueCity: row.venueCity ?? undefined,
          isOwner: viewerId != null && row.ownerId === viewerId,
        };
      }
    } catch (error) {
      console.warn("[poster record] query failed:", error);
    }
  }
  if (!record) notFound();

  // Poster type + tour name for DB-loaded records (isolated: a pending
  // migration must not break the page).
  if (!mine && db) {
    try {
      const [meta] = await db
        .select({
          posterType: t.posters.posterType,
          tourName: t.tours.name,
        })
        .from(t.posters)
        .leftJoin(t.tours, eq(t.posters.tourId, t.tours.id))
        .where(eq(t.posters.id, record.id));
      if (meta) {
        record.posterType = (meta.posterType ?? "show") as PosterType;
        record.tourName = meta.tourName ?? undefined;
      }
    } catch {
      // poster_type not migrated yet — stays "show"
    }
  }

  // Related records (best effort; shared catalog only).
  let sameBand: Array<{ id: string; title: string; imageUrl: string | null; year: number }> = [];
  let samePosterArtist: typeof sameBand = [];
  if (db) {
    try {
      if (record.showId) {
        const [showRow] = await db
          .select({ artistId: t.shows.artistId })
          .from(t.shows)
          .where(eq(t.shows.id, record.showId));
        if (showRow) {
          sameBand = await db
            .select({
              id: t.posters.id,
              title: t.posters.title,
              imageUrl: t.posters.imageUrl,
              year: t.posters.year,
            })
            .from(t.posters)
            .innerJoin(t.shows, eq(t.posters.showId, t.shows.id))
            .where(
              and(eq(t.shows.artistId, showRow.artistId), ne(t.posters.id, record.id)),
            )
            .limit(6);
        }
      }
      samePosterArtist = await db
        .select({
          id: t.posters.id,
          title: t.posters.title,
          imageUrl: t.posters.imageUrl,
          year: t.posters.year,
        })
        .from(t.posters)
        .where(
          and(eq(t.posters.designer, record.designer), ne(t.posters.id, record.id)),
        )
        .limit(6);
    } catch (error) {
      console.warn("[poster record] related query failed:", error);
    }
  }

  const edition = record.editions[0];
  const isTour = record.posterType === "tour";
  const isFestival = record.posterType === "festival";
  const typeLabel = isTour
    ? "Tour poster (multiple dates)"
    : isFestival
      ? "Festival poster"
      : "Show poster";
  const rows: Array<[string, string]> = [["Poster Artist", record.designer]];
  rows.push(["Type", typeLabel]);
  if (isTour && record.tourName) rows.push(["Tour", record.tourName]);
  if (record.artistName) rows.push(["Artist / Band", record.artistName]);
  if (record.showDate) rows.push(["Show date", formatShortDate(record.showDate)]);
  if (record.venueName)
    rows.push([
      "Venue",
      `${record.venueName}${record.venueCity ? ` · ${record.venueCity}` : ""}`,
    ]);
  rows.push(["Year", String(record.year)]);
  if (edition?.name) rows.push(["Variant", edition.name]);
  const editionSize = formatEditionSize(edition);
  if (editionSize) rows.push(["Dimensions", editionSize]);
  if (edition?.technique) rows.push(["Printing method", edition.technique]);
  if (edition?.runSize)
    rows.push([
      "Edition size",
      edition.copyNumber
        ? `#${edition.copyNumber} of ${edition.runSize}`
        : String(edition.runSize),
    ]);
  if (edition?.signed) rows.push(["Autographed", "Yes — signed"]);
  if (edition?.markings) rows.push(["Markings", edition.markings]);
  if (record.notes) rows.push(["Notes", record.notes]);

  // Contribution prompts: nudge the community to complete the record.
  const missingBits: string[] = [];
  if (!record.designer || record.designer === "Unknown")
    missingBits.push("poster artist credit");
  if (!edition?.runSize) missingBits.push("edition size");
  if (!edition?.technique) missingBits.push("printing method");
  if (!formatEditionSize(edition)) missingBits.push("dimensions");
  if (record.images.length === 0) missingBits.push("an image");

  const relatedGrid = (items: typeof sameBand, heading: string) =>
    items.length > 0 ? (
      <section>
        <h2 className="mb-3 text-base font-semibold">{heading}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((p) => (
            <Link key={p.id} href={`/posters/${p.id}`} className="group block">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                  {p.title}
                </div>
              )}
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {p.title} · {p.year}
              </p>
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          posterJsonLd({
            title: record.title,
            path: `/posters/${record.id}`,
            designer: record.designer,
            year: record.year,
            image: record.images[0],
            widthIn: edition?.widthIn,
            heightIn: edition?.heightIn,
            technique: edition?.technique,
          }),
          breadcrumbJsonLd([
            { name: "Posters", path: "/posters" },
            { name: record.title, path: `/posters/${record.id}` },
          ]),
        ]}
      />
      <Link
        href="/posters"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Posters
      </Link>

      <PageHeader
        title={record.title}
        subtitle={`${
          isTour ? "Tour poster" : isFestival ? "Festival poster" : "Show poster"
        } · art by ${record.designer}`}
        actions={
          record.isOwner ? (
            <Button variant="outline" asChild>
              <Link href={`/edit/poster/${record.id}`}>
                <Pencil />
                Edit details
              </Link>
            </Button>
          ) : undefined
        }
      />

      {missingBits.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200">
            <span className="font-medium">Know more about this print?</span>{" "}
            This record is missing {missingBits.join(", ")}.
          </p>
          {record.isOwner ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/edit/poster/${record.id}`}>Complete the record</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Artwork */}
        {record.images.length > 0 ? (
          <PosterGallery images={record.images} title={record.title} />
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No artwork on this record yet.
            </p>
            {record.isOwner ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/edit/poster/${record.id}`}>Upload an image</Link>
              </Button>
            ) : null}
          </div>
        )}

        {/* Metadata panel */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle>Print details</CardTitle>
              <StateBadge state={record.state} />
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="min-w-0 flex-1 font-medium">
                      {label === "Poster Artist" &&
                      value &&
                      value !== "Unknown" ? (
                        <Link
                          href={`/poster-artists/${posterArtistSlug(value)}`}
                          className="text-primary hover:underline"
                        >
                          {value}
                        </Link>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
                {record.ownerName ? (
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted-foreground">
                      Collection
                    </dt>
                    <dd className="min-w-0 flex-1 font-medium">
                      {record.ownerId ? (
                        <Link
                          href={`/u/${record.ownerId}`}
                          className="hover:text-primary"
                        >
                          {record.ownerName}
                        </Link>
                      ) : (
                        record.ownerName
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:hello@concertcollect.com?subject=Report%20a%20poster%20record">
                    Report an issue
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Related show card */}
          {record.showId && record.artistName ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>From the show</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={
                    mine ? `/shows/${record.showId}` : `/u/${record.ownerId}`
                  }
                  className="group flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">
                      {record.artistName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {record.venueName}
                      {record.venueCity ? ` · ${record.venueCity}` : ""}
                      {record.showDate
                        ? ` · ${formatShortDate(record.showDate)}`
                        : ""}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {relatedGrid(sameBand, `More posters — ${record.artistName ?? "this band"}`)}
      {relatedGrid(samePosterArtist, `More by ${record.designer}`)}
    </div>
  );
}
