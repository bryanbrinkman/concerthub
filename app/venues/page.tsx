import Link from "next/link";
import { MapPin, Search, Users } from "lucide-react";

import { listPublicVenues } from "@/lib/public";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata({
  title: "Venues — Concert History & Posters | Concert Collect",
  description:
    "Browse venues in the Concert Collect archive — documented shows and concert posters from rooms, sheds, and amphitheatres around the world.",
  path: "/venues",
});

/** Public venue index: a dense, searchable list built to scale as the
 * community documents more rooms. */
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const all = (await listPublicVenues()) ?? [];
  const venues = query
    ? all.filter((v) =>
        [v.name, v.city, v.region, v.country]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(query)),
      )
    : all;

  return (
    <div>
      <PageHeader
        title="Venues"
        subtitle="Rooms, sheds, and amphitheatres documented in the archive."
      />

      <form action="/venues" method="get" className="mb-4 flex max-w-md gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search venues or cities…"
            className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      {all.length > 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {venues.length.toLocaleString()}{" "}
          {query ? `of ${all.length.toLocaleString()} ` : ""}
          venue{venues.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {venues.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={query ? "No matches" : "No venues yet"}
          description={
            query
              ? `No venue matches “${q}”. Try a city or a different spelling.`
              : "Venues appear here as the community adds posters and shows."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              title={`${venue.name} — ${venue.showCount} documented show${venue.showCount === 1 ? "" : "s"}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{venue.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {venue.city}
                  {venue.region ? `, ${venue.region}` : ""}
                  {venue.country ? ` · ${venue.country}` : ""}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Users className="h-3 w-3" />
                {venue.showCount}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
