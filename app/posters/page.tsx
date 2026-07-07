import { ExternalLink, Frame, Plus } from "lucide-react";

import { findArtist, findShow, getArchive } from "@/lib/archive";
import { enrichPosters } from "@/lib/expressobeans";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterRack, type RackPoster } from "@/components/poster-rack";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Posters" };

export default async function PostersPage() {
  const archive = await getArchive();
  // Pull real artwork from Expresso Beans for any poster with an id set;
  // the rest keep their seeded imagery / gradient art.
  const enriched = await enrichPosters(archive.posters);

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
      ebUrl: poster.ebUrl,
      showHref: show ? `/shows/${show.id}` : undefined,
      showLabel: show
        ? `${artist?.name ?? "Show"} · ${formatShortDate(show.date)}`
        : undefined,
    };
  });

  return (
    <div>
      <PageHeader
        title="Posters"
        subtitle="Your flat file — fan through the collection like a poster rack."
        actions={
          <Button>
            <Plus />
            Add poster
          </Button>
        }
      />
      {rackPosters.length === 0 ? (
        <EmptyState
          icon={Frame}
          title="No posters cataloged"
          description="Add show prints with designer, edition, and technique details."
          actionLabel="Add poster"
        />
      ) : (
        <PosterRack posters={rackPosters} />
      )}
      <div className="mt-5">
        {/* TODO(api): pull market data (avg sale, last sale) from Expresso Beans. */}
        <Button variant="outline" size="sm" asChild>
          <a href="https://www.expressobeans.com/" target="_blank" rel="noreferrer">
            <ExternalLink />
            Browse Expresso Beans
          </a>
        </Button>
      </div>
    </div>
  );
}
