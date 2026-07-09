import Link from "next/link";
import { ArrowUpRight, FolderPlus, Frame, Pencil, Trash2 } from "lucide-react";

import type { EnrichedPoster } from "@/lib/expressobeans";
import { deletePosterAction } from "@/app/manage-actions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import { PosterGallery } from "@/components/poster-gallery";
import { EmptyState } from "@/components/empty-state";
import { StateBadge } from "@/components/state-badge";
import { posterState } from "@/lib/archive";
import { formatEditionSize, posterArtistSlug } from "@/lib/utils";

/** Collector metadata for the show's poster/print. */
export function PosterDetailsCard({
  poster,
  addHref,
  canEdit,
}: {
  poster?: EnrichedPoster;
  /** Link to the add-poster form; when unset the CTA is decorative. */
  addHref?: string;
  /** Viewer owns this archive — show the remove control. */
  canEdit?: boolean;
}) {
  if (!poster) {
    return (
      <EmptyState
        icon={Frame}
        title="No poster cataloged"
        description="No poster has been added for this show yet. Know of one? Help complete the archive."
        actionLabel="Add poster"
        actionHref={addHref}
      />
    );
  }

  // Show the primary (first) edition's specs in the metadata table.
  const edition = poster.editions[0];

  // Cover + detail shots; the gallery expands them into a lightbox.
  const galleryImages = [
    ...(poster.resolvedImageUrl ? [poster.resolvedImageUrl] : []),
    ...(poster.imageUrls ?? []),
  ];

  const rows: Array<[string, string]> = [
    ["Poster Artist", poster.designer],
    ["Title", poster.title],
    ["Year", String(poster.year)],
  ];
  const size = formatEditionSize(edition);
  if (size) rows.push(["Dimensions", size]);
  if (edition?.runSize) {
    rows.push([
      "Edition",
      edition.copyNumber
        ? `#${edition.copyNumber} of ${edition.runSize}`
        : `${edition.runSize}`,
    ]);
  }
  if (edition?.technique) rows.push(["Medium", edition.technique]);
  if (edition?.signed) rows.push(["Autographed", "Yes — signed"]);
  if (edition?.markings) rows.push(["Markings", edition.markings]);
  if (poster.notes) rows.push(["Notes", poster.notes]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Poster / Print Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row">
        {galleryImages.length > 0 ? (
          <PosterGallery
            images={galleryImages}
            title={poster.title}
            className="w-36 shrink-0 self-center sm:self-start"
          />
        ) : (
          <PosterImage
            imageUrl={undefined}
            gradient={poster.gradient}
            title={poster.title}
            subtitle={poster.designer}
            footer={String(poster.year)}
            className="w-36 shrink-0 self-center sm:self-start"
          />
        )}
        <dl className="min-w-0 flex-1 space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 flex-1 font-medium">
                {label === "Poster Artist" && value && value !== "Unknown" ? (
                  <Link
                    href={`/poster-artists/${posterArtistSlug(value)}`}
                    className="text-primary hover:underline"
                  >
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
          {poster.editions.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {poster.editions.map((ed) => (
                <Badge key={ed.id} variant="secondary">
                  {ed.name}
                  {ed.runSize ? ` · ${ed.runSize}` : ""}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-1">
            <StateBadge state={posterState(poster)} />
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/posters/${poster.id}`}>
            <ArrowUpRight />
            View poster record
          </Link>
        </Button>
        <Button variant="secondary" size="sm">
          <FolderPlus />
          Add to collection
        </Button>
        {canEdit ? (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/edit/poster/${poster.id}`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <form action={deletePosterAction}>
              <input type="hidden" name="id" value={poster.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                title="Remove this print from your archive"
              >
                <Trash2 />
                Remove
              </Button>
            </form>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
