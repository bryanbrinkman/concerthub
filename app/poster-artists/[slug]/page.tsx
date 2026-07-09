import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getPosterArtistBySlug } from "@/lib/public";
import { formatShortDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  personJsonLd,
  routeMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getPosterArtistBySlug(slug);
  if (!artist) return { title: "Poster artist" };
  return routeMetadata({
    title: `${artist.name} Concert Posters & Posterography | Concert Collect`,
    description: `Explore concert posters by ${artist.name}, including ${artist.works.length} print${artist.works.length === 1 ? "" : "s"}${artist.years ? ` (${artist.years})` : ""} — show history, editions, and posterography.`,
    path: `/poster-artists/${slug}`,
    image: artist.works.find((w) => w.imageUrl)?.imageUrl,
  });
}

/** A poster artist's full body of work in the archive. */
export default async function PosterArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getPosterArtistBySlug(slug);
  if (!artist) notFound();

  const path = `/poster-artists/${slug}`;

  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          personJsonLd(artist.name, path),
          itemListJsonLd(
            `Concert posters by ${artist.name}`,
            artist.works.map((w) => ({ name: w.title, path: `/posters/${w.id}` })),
          ),
          breadcrumbJsonLd([
            { name: "Poster Artists", path: "/poster-artists" },
            { name: artist.name, path },
          ]),
        ]}
      />

      <Link
        href="/poster-artists"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All poster artists
      </Link>

      <PageHeader
        title={artist.name}
        subtitle={`Poster artist · ${artist.works.length} print${artist.works.length === 1 ? "" : "s"}${artist.years ? ` · ${artist.years}` : ""}`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {artist.works.map((work) => (
          <Link key={work.id} href={`/posters/${work.id}`} className="group block">
            {work.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={work.imageUrl}
                alt={`${work.artistName ?? work.title} poster by ${artist.name}`}
                loading="lazy"
                className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                {work.title}
              </div>
            )}
            <div className="mt-2 space-y-0.5 px-0.5">
              <p className="truncate text-sm font-medium">
                {work.artistName ?? work.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  work.venueName,
                  work.showDate ? formatShortDate(work.showDate) : String(work.year),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
