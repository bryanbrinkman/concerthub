import Link from "next/link";
import { ExternalLink, Frame, Plus } from "lucide-react";

import { getShow, posters } from "@/lib/data";
import { enrichPosters } from "@/lib/expressobeans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PosterImage } from "@/components/poster-image";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Posters" };

export default async function PostersPage() {
  // Pull real artwork from Expresso Beans for any poster with an id set;
  // the rest keep their generated gradient art.
  const enriched = await enrichPosters(posters);

  return (
    <div>
      <PageHeader
        title="Posters"
        subtitle="Your flat file — screen prints, editions, and the ones that got away."
        actions={
          <Button>
            <Plus />
            Add poster
          </Button>
        }
      />
      {enriched.length === 0 ? (
        <EmptyState
          icon={Frame}
          title="No posters cataloged"
          description="Add show prints with designer, edition, and technique details."
          actionLabel="Add poster"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {enriched.map((poster) => {
            const show = poster.showId ? getShow(poster.showId) : undefined;
            const primary = poster.editions[0];
            const card = (
              <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40">
                <PosterImage
                  imageUrl={poster.resolvedImageUrl}
                  gradient={poster.gradient}
                  title={poster.title}
                  subtitle={poster.designer}
                  footer={String(poster.year)}
                  className="transition-transform duration-300 group-hover:scale-[1.015]"
                />
                <div className="space-y-1.5 p-2 pt-3">
                  <p className="truncate text-sm font-medium">{poster.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {poster.designer} · {poster.year}
                    {primary?.runSize ? ` · ed. ${primary.runSize}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {poster.owned ? (
                      <Badge variant="success">In collection</Badge>
                    ) : (
                      <Badge variant="outline">Wishlist</Badge>
                    )}
                    {poster.editions.length > 1 ? (
                      <Badge variant="secondary">
                        {poster.editions.length} editions
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            );
            return show ? (
              <Link key={poster.id} href={`/shows/${show.id}`} className="block">
                {card}
              </Link>
            ) : (
              <div key={poster.id}>{card}</div>
            );
          })}
        </div>
      )}
      <div className="mt-6">
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
