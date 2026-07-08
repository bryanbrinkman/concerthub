import Link from "next/link";
import { ChevronLeft, MapPin, Users } from "lucide-react";

import type { PublicVenue } from "@/lib/public";
import { GradientArt } from "@/components/gradient-art";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, venueJsonLd } from "@/lib/seo";

/**
 * Server-rendered public identity block for a venue not in the viewer's
 * archive — crawlable name/location + JSON-LD, linking into the public
 * databases instead of 404-ing.
 */
export function PublicVenueView({ venue }: { venue: PublicVenue }) {
  const path = `/venues/${venue.id}`;
  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          venueJsonLd({
            name: venue.name,
            path,
            city: venue.city,
            region: venue.region,
            country: venue.country,
          }),
          breadcrumbJsonLd([
            { name: "Venues", path: "/venues" },
            { name: venue.name, path },
          ]),
        ]}
      />
      <Link
        href="/venues"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All venues
      </Link>

      <div className="flex items-center gap-5">
        <GradientArt gradient="midnight" className="h-20 w-20 shrink-0 rounded-xl">
          <div className="flex w-full items-center justify-center">
            <MapPin className="h-6 w-6 text-white/85" />
          </div>
        </GradientArt>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{venue.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {venue.city}
            {venue.region ? `, ${venue.region}` : ""}
            {venue.country ? ` · ${venue.country}` : ""}
          </p>
          {venue.capacity ? (
            <div className="mt-2">
              <Badge variant="secondary">
                <Users />
                Capacity {venue.capacity.toLocaleString("en-US")}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Browse documented shows and posters from {venue.name} in the{" "}
        <Link
          href={`/shows?q=${encodeURIComponent(venue.name)}`}
          className="text-primary hover:underline"
        >
          show database
        </Link>{" "}
        and{" "}
        <Link
          href={`/posters?q=${encodeURIComponent(venue.name)}`}
          className="text-primary hover:underline"
        >
          poster database
        </Link>
        .
      </p>
    </div>
  );
}
