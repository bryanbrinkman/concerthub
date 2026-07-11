import Link from "next/link";
import { Search, Users } from "lucide-react";

import { listPublicArtists } from "@/lib/public";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { routeMetadata } from "@/lib/seo";

export const metadata = routeMetadata({
  title: "Performers — Concert Posters & Show History | Concert Collect",
  description:
    "Browse performers in the Concert Collect archive — their documented shows, posters, and posterographies from the live music community.",
  path: "/artists",
});

/** Public performer index: a dense, searchable list built to scale as the
 * community adds acts. Every performer on a documented bill appears. */
export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const all = (await listPublicArtists()) ?? [];
  const artists = query
    ? all.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          (a.hometown ?? "").toLowerCase().includes(query),
      )
    : all;

  return (
    <div>
      <PageHeader
        title="Performers"
        subtitle="Everyone documented in the archive — headliners, support, and festival acts alike."
      />

      {/* Search — plain GET so results are linkable and work without JS */}
      <form action="/artists" method="get" className="mb-4 flex max-w-md gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search performers…"
            className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      {all.length > 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {artists.length.toLocaleString()}{" "}
          {query ? `of ${all.length.toLocaleString()} ` : ""}
          performer{artists.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {artists.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No matches" : "No performers yet"}
          description={
            query
              ? `No performer matches “${q}”. Try a different spelling.`
              : "Performers appear here as the community adds posters and shows."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              title={`${artist.name} — ${artist.showCount} documented show${artist.showCount === 1 ? "" : "s"}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.03]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
                {artist.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{artist.name}</p>
                {artist.hometown ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {artist.hometown}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {artist.showCount}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
