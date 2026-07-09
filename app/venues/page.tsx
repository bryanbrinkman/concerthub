import Link from "next/link";
import { MapPin, Users } from "lucide-react";

import type { GradientKey } from "@/lib/types";
import { listPublicVenues } from "@/lib/public";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata({
  title: "Venues — Concert History & Posters | Concert Collect",
  description:
    "Browse venues in the Concert Collect archive — documented shows and concert posters from rooms, sheds, and amphitheatres around the world.",
  path: "/venues",
});

/** Public venue index: rooms hosting a documented show in the archive. */
export default async function VenuesPage() {
  const venues = (await listPublicVenues()) ?? [];

  return (
    <div>
      <PageHeader
        title="Venues"
        subtitle="Rooms, sheds, and amphitheatres documented in the archive."
      />
      {venues.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No venues yet"
          description="Venues appear here as the community adds posters and shows."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {venues.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.id}`} className="block">
              <Card className="h-full transition-colors hover:border-white/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <GradientArt
                    gradient={venue.gradient as GradientKey}
                    className="h-16 w-16 shrink-0 rounded-xl"
                  >
                    <div className="flex w-full items-center justify-center">
                      <MapPin className="h-5 w-5 text-white/85" />
                    </div>
                  </GradientArt>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{venue.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {venue.city}
                      {venue.region ? `, ${venue.region}` : ""}
                      {venue.country ? ` · ${venue.country}` : ""}
                    </p>
                    {venue.capacity ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Capacity {venue.capacity.toLocaleString("en-US")}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="default">
                    {venue.showCount} {venue.showCount === 1 ? "show" : "shows"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
