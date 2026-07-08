import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";

import type { PublicArtist } from "@/lib/public";
import { GradientArt } from "@/components/gradient-art";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, musicGroupJsonLd } from "@/lib/seo";

/**
 * Server-rendered public identity block for an artist not in the viewer's
 * archive. Keeps the page crawlable (name, genres, hometown, JSON-LD) and
 * links into the public show database rather than 404-ing.
 */
export function PublicArtistView({ artist }: { artist: PublicArtist }) {
  const path = `/artists/${artist.id}`;
  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          musicGroupJsonLd(artist.name, path),
          breadcrumbJsonLd([
            { name: "Artists", path: "/artists" },
            { name: artist.name, path },
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
        <GradientArt gradient="midnight" className="h-20 w-20 shrink-0 rounded-full">
          <div className="flex w-full items-center justify-center">
            <span className="text-2xl font-bold text-white/90">
              {artist.name.charAt(0)}
            </span>
          </div>
        </GradientArt>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{artist.name}</h1>
          {artist.hometown ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {artist.hometown}
            </p>
          ) : null}
          {artist.genres.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {artist.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Browse documented shows and posters featuring {artist.name} in the{" "}
        <Link
          href={`/shows?q=${encodeURIComponent(artist.name)}`}
          className="text-primary hover:underline"
        >
          show database
        </Link>{" "}
        and{" "}
        <Link
          href={`/posters?q=${encodeURIComponent(artist.name)}`}
          className="text-primary hover:underline"
        >
          poster database
        </Link>
        .
      </p>
    </div>
  );
}
