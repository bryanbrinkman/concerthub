import { MapPin, Users } from "lucide-react";

import { getArchive, showsByVenue } from "@/lib/archive";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Venues" };

export default async function VenuesPage() {
  const archive = await getArchive();
  const sorted = [...archive.venues].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      <PageHeader
        title="Venues"
        subtitle="Rooms, sheds, and amphitheatres you've stood in."
      />
      {sorted.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No venues yet"
          description="Venues appear here automatically as you add or import shows."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorted.map((venue) => {
            const attended = showsByVenue(archive, venue.id).filter(
              (s) => s.attended,
            ).length;
            return (
              <Card key={venue.id} className="transition-colors hover:border-white/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <GradientArt
                    gradient={venue.gradient}
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
                  <Badge variant={attended > 0 ? "default" : "outline"}>
                    {attended > 0
                      ? `${attended} ${attended === 1 ? "show" : "shows"}`
                      : "Tracked"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
