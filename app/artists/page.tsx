import Link from "next/link";
import { MapPin, Users } from "lucide-react";

import type { GradientKey } from "@/lib/types";
import { listPublicArtists } from "@/lib/public";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata({
  title: "Artists — Concert Posters & Show History | Concert Collect",
  description:
    "Browse artists in the Concert Collect archive — their documented shows, posters, and posterographies from the live music community.",
  path: "/artists",
});

/** Public artist index: everyone in the shared archive with submitted
 * posters or documented shows. */
export default async function ArtistsPage() {
  const artists = (await listPublicArtists()) ?? [];

  return (
    <div>
      <PageHeader
        title="Artists"
        subtitle="Performers documented in the archive — with posters and shows contributed by the community."
      />
      {artists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No artists yet"
          description="Artists appear here as the community adds posters and shows."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.id}`} className="block">
              <Card className="h-full transition-colors hover:border-white/20">
                <CardContent className="flex items-start gap-4 p-4">
                  <GradientArt
                    gradient={artist.gradient as GradientKey}
                    className="h-14 w-14 shrink-0 rounded-full"
                  >
                    <div className="flex w-full items-center justify-center">
                      <span className="text-lg font-bold text-white/90">
                        {artist.name.charAt(0)}
                      </span>
                    </div>
                  </GradientArt>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    {artist.hometown ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
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
                    <p className="mt-3 text-xs text-muted-foreground">
                      {artist.showCount}{" "}
                      {artist.showCount === 1 ? "documented show" : "documented shows"} →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
