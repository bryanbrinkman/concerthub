import Link from "next/link";
import { Frame, Plus } from "lucide-react";

import { findArtist, findShow, getArchive } from "@/lib/archive";
import { enrichPosters } from "@/lib/expressobeans";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterRack, type RackPoster } from "@/components/poster-rack";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "My Posters" };

/** The personal flat file: only the viewer's own prints, as a rack. */
export default async function MyPostersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; missing?: string }>;
}) {
  const { state: stateFilter, missing } = await searchParams;
  const archive = await getArchive();
  let filtered = archive.posters;
  if (stateFilter) {
    filtered = filtered.filter(
      (p) => (p.state ?? (p.owned ? "own" : "want")) === stateFilter,
    );
  }
  // Deep-links from Explore's "missing from the archive" cards — you can
  // only fix your own posters, so this narrows to the ones you can act on.
  if (missing === "image") {
    filtered = filtered.filter((p) => !p.imageUrl && !(p.imageUrls?.length));
  } else if (missing === "credit") {
    filtered = filtered.filter((p) => !p.designer || p.designer === "Unknown");
  } else if (missing === "edition") {
    filtered = filtered.filter((p) => !p.editions?.[0]?.runSize);
  }
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
        title="My Posters"
        subtitle={
          missing
            ? `Your posters missing ${missing === "image" ? "images" : missing === "credit" ? "an artist credit" : "edition details"} — open one to fill it in.`
            : stateFilter
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
        <PosterRack
          posters={rackPosters}
          collections={archive.collections.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
