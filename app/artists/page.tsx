import Link from "next/link";
import { MapPin } from "lucide-react";

import { artists, getShowsByArtist } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";

export const metadata = { title: "Artists" };

export default function ArtistsPage() {
  return (
    <div>
      <PageHeader
        title="Artists"
        subtitle="Everyone you've seen live, and how many times."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => {
          const artistShows = getShowsByArtist(artist.id);
          const attended = artistShows.filter((s) => s.attended);
          const firstShow = attended[attended.length - 1];
          return (
            <Card key={artist.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-start gap-4 p-5">
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {artist.genres.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {attended.length > 0 ? (
                      firstShow ? (
                        <Link
                          href={`/shows/${firstShow.id}`}
                          className="transition-colors hover:text-primary"
                        >
                          Seen {attended.length}{" "}
                          {attended.length === 1 ? "time" : "times"} →
                        </Link>
                      ) : null
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
    </div>
  );
}
