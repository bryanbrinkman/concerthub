import Link from "next/link";
import { MapPin, Users } from "lucide-react";

import { getArchive, showsByArtist } from "@/lib/archive";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const archive = await getArchive();
  const sorted = [...archive.artists].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      <PageHeader
        title="Artists"
        subtitle="Everyone you've seen live, and how many times."
      />
      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No artists yet"
          description="Artists appear here automatically as you add or import shows."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((artist) => {
            const attended = showsByArtist(archive, artist.id).filter(
              (s) => s.attended,
            );
            const firstShow = attended[attended.length - 1];
            return (
              <Card key={artist.id} className="transition-colors hover:border-white/20">
                <CardContent className="flex items-start gap-4 p-4">
                  <GradientArt
                    gradient={artist.gradient}
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
                      {attended.length > 0 && firstShow ? (
                        <Link
                          href={`/shows/${firstShow.id}`}
                          className="transition-colors hover:text-primary"
                        >
                          Seen {attended.length}{" "}
                          {attended.length === 1 ? "time" : "times"} →
                        </Link>
                      ) : (
                        "Not seen yet — on the list"
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
