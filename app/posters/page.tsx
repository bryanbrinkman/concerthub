import Link from "next/link";
import { Frame, Plus } from "lucide-react";

import { findArtist, findShow, getArchive } from "@/lib/archive";
import { enrichPosters } from "@/lib/expressobeans";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterRack, type RackPoster } from "@/components/poster-rack";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Posters" };

export default async function PostersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateFilter } = await searchParams;
  const archive = await getArchive();
  // Pull real artwork from Expresso Beans for any poster with an id set;
  // the rest keep their seeded imagery / gradient art.
  const filtered = stateFilter
    ? archive.posters.filter(
        (p) => (p.state ?? (p.owned ? "own" : "want")) === stateFilter,
      )
    : archive.posters;
  const enriched = await enrichPosters(filtered);

  // Flatten to serializable props for the client-side rack.
  const rackPosters: RackPoster[] = enriched.map((poster) => {
    const show = poster.showId ? findShow(archive, poster.showId) : undefined;
    const artist = show ? findArtist(archive, show.artistId) : undefined;
    const edition = poster.editions[0];
    return {
      id: poster.id,
      title: poster.title,
      designer: poster.designer,
      year: poster.year,
      gradient: poster.gradient,
      imageUrl: poster.resolvedImageUrl,
      owned: poster.owned,
      editionSummary: edition
        ? edition.runSize
          ? `${edition.name} · ed. ${edition.runSize}`
          : edition.name
        : undefined,
      showHref: show ? `/shows/${show.id}` : undefined,
      showLabel: show
        ? `${artist?.name ?? "Show"} · ${formatShortDate(show.date)}`
        : undefined,
      editHref: archive.demo ? undefined : `/edit/poster/${poster.id}`,
    };
  });

  return (
    <div>
      <PageHeader
        title="Posters"
        subtitle={
          stateFilter
            ? `Filtered: ${stateFilter === "want" ? "wantlist" : stateFilter === "trade" ? "for trade" : stateFilter === "sell" ? "for sale" : "in collection"} — fan through the rack.`
            : "Your flat file — fan through the collection like a poster rack."
        }
        actions={
          <Button asChild>
            <Link href="/add/poster">
              <Plus />
              Add poster
            </Link>
          </Button>
        }
      />
      {rackPosters.length === 0 ? (
        <EmptyState
          icon={Frame}
          title="No posters cataloged"
          description="Add show prints with designer, edition, and technique details."
          actionLabel="Add poster"
          actionHref="/add/poster"
        />
      ) : (
        <PosterRack posters={rackPosters} />
      )}
    </div>
  );
}
