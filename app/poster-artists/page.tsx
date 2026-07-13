import Link from "next/link";
import { Frame, Globe, Paintbrush } from "lucide-react";

import { listPublicPosterArtists } from "@/lib/public";
import { displayHost } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata({
  title: "Poster Artists — Concert Poster Designers | Concert Collect",
  description:
    "Browse the poster artists and print designers behind concert posters in the Concert Collect archive — with their posterographies and works.",
  path: "/poster-artists",
});

/** Public index of poster artists (print designers) with a live filter. */
export default async function PosterArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let artists = (await listPublicPosterArtists()) ?? [];

  const tokens = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    artists = artists.filter((a) =>
      tokens.every((token) => a.name.toLowerCase().includes(token)),
    );
  }

  return (
    <div>
      <PageHeader
        title="Poster Artists"
        subtitle="The designers behind the prints — click through for a poster artist's full body of work."
      />

      <form action="/poster-artists" method="get" className="mb-5 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search poster artists — e.g. Daniel Danger"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input type="submit" hidden />
      </form>

      {artists.length === 0 ? (
        <EmptyState
          icon={Paintbrush}
          title={q ? `No poster artists match "${q}"` : "No poster artists yet"}
          description="Poster artists appear here as prints are cataloged with a designer credit."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.slug}
              href={`/poster-artists/${artist.slug}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:border-white/20">
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-1.5">
                    {artist.thumbs.length > 0 ? (
                      artist.thumbs.map((thumb) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={thumb}
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="h-20 w-14 rounded-md border border-white/10 bg-black/40 object-contain"
                        />
                      ))
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded-md border border-border bg-secondary">
                        <Frame className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{artist.name}</p>
                    <Badge variant="secondary">
                      {artist.posterCount}{" "}
                      {artist.posterCount === 1 ? "print" : "prints"}
                    </Badge>
                  </div>
                  {artist.website ? (
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0 text-primary/80" />
                      {displayHost(artist.website)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
