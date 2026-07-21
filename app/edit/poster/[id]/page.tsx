import { notFound } from "next/navigation";
import { Frame, LogIn } from "lucide-react";

import {
  allShows,
  findArtist,
  findVenue,
  getArchive,
} from "@/lib/archive";
import { getPosterArtistWebsite } from "@/lib/public";
import { formatShortDate, parsePosterSizeIn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass, selectClass } from "@/components/form-controls";
import { MultiImageField } from "@/components/multi-image-field";
import { PosterTargetField } from "@/components/poster-target-field";
import { updatePosterAction } from "@/app/add/actions";

export const metadata = { title: "Edit poster" };

export default async function EditPosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to edit posters"
        description="Prints live in your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  const poster = archive.posters.find((p) => p.id === id);
  if (!poster) notFound();

  const shows = allShows(archive);
  const tour = poster.tourId
    ? archive.tours.find((tr) => tr.id === poster.tourId)
    : undefined;
  const tourArtist = tour
    ? findArtist(archive, tour.artistId)?.name ?? ""
    : "";
  // Festival posters link to a festival show; prefill its fields so an edit
  // round-trips (createShow is idempotent on artist+venue+date).
  const festivalShow =
    poster.posterType === "festival" && poster.showId
      ? archive.shows.find((s) => s.id === poster.showId)
      : undefined;
  const festivalVenue = festivalShow
    ? findVenue(archive, festivalShow.venueId)
    : undefined;
  const festivalLineup = festivalShow
    ? [...(festivalShow.performers ?? [])]
        .sort((a, b) => a.billingOrder - b.billingOrder)
        .map((p) => findArtist(archive, p.artistId)?.name)
        .filter(Boolean)
        .join("\n")
    : "";
  const designerWebsite = await getPosterArtistWebsite(poster.designer);
  const edition = poster.editions[0];
  const legacySize =
    edition?.widthIn && edition?.heightIn
      ? { widthIn: edition.widthIn, heightIn: edition.heightIn }
      : parsePosterSizeIn(edition?.dimensions);
  const defaultImages = [
    ...(poster.imageUrl ? [poster.imageUrl] : []),
    ...(poster.imageUrls ?? []),
  ];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Edit poster"
        subtitle={`${poster.title} — update details or add close-up shots.`}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{poster.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePosterAction} className="space-y-4">
            <input type="hidden" name="posterId" value={poster.id} />
            <PosterTargetField
              shows={shows.map((show) => ({
                id: show.id,
                label: `${findArtist(archive, show.artistId)?.name ?? "Unknown"} — ${
                  findVenue(archive, show.venueId)?.name ?? ""
                } (${formatShortDate(show.date)})`,
              }))}
              defaultType={
                poster.posterType === "tour"
                  ? "tour"
                  : poster.posterType === "festival"
                    ? "festival"
                    : "show"
              }
              defaultShowId={poster.showId ?? ""}
              defaultTourArtist={tourArtist}
              defaultTourName={tour?.name ?? ""}
              defaultFestivalName={festivalShow?.name ?? ""}
              defaultFestivalVenue={festivalVenue?.name ?? ""}
              defaultFestivalCity={festivalVenue?.city ?? ""}
              defaultFestivalDate={festivalShow?.date ?? ""}
              defaultFestivalEndDate={festivalShow?.endDate ?? ""}
              defaultFestivalLineup={festivalLineup}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input
                  name="title"
                  required
                  defaultValue={poster.title}
                  className={inputClass}
                />
              </Field>
              <Field label="Poster Artist">
                <input
                  name="designer"
                  defaultValue={poster.designer}
                  className={inputClass}
                />
              </Field>
              <Field label="Year">
                <input
                  name="year"
                  required
                  type="number"
                  min={1950}
                  max={2100}
                  defaultValue={poster.year}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Grouped like the add form; open on edit so nothing saved is
                hidden from the person editing it. */}
            <details
              open
              className="rounded-lg border border-dashed border-border px-3 py-2"
            >
              <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                Edition &amp; print details — size, run, technique
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Poster Artist website"
                hint="e.g. killeracid.com — shown on their poster-artist page."
              >
                <input
                  name="designerWebsite"
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  defaultValue={designerWebsite ?? ""}
                  placeholder="killeracid.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Edition name">
                <input
                  name="editionName"
                  defaultValue={edition?.name ?? ""}
                  placeholder="Regular / Foil / AP"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Variant of (optional)"
                hint="Foil, color way, AP…? Pick the parent design so variants group together."
              >
                <select
                  name="variantOf"
                  defaultValue={poster.variantOf ?? ""}
                  className={selectClass}
                >
                  <option value="">Not a variant — this is the main design</option>
                  {archive.posters
                    .filter(
                      (p) =>
                        p.id !== poster.id &&
                        !p.variantOf, // parents only — no chains
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.year})
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Edition size">
                <input
                  name="runSize"
                  type="number"
                  min={1}
                  defaultValue={edition?.runSize ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Your copy #">
                <input
                  name="copyNumber"
                  type="number"
                  min={1}
                  defaultValue={edition?.copyNumber ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Technique">
                <input
                  name="technique"
                  defaultValue={edition?.technique ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Width (inches)">
                <input
                  name="widthIn"
                  type="number"
                  min={4}
                  max={99}
                  step="0.5"
                  defaultValue={legacySize?.widthIn ?? ""}
                  placeholder="18"
                  className={inputClass}
                />
              </Field>
              <Field label="Height (inches)">
                <input
                  name="heightIn"
                  type="number"
                  min={4}
                  max={99}
                  step="0.5"
                  defaultValue={legacySize?.heightIn ?? ""}
                  placeholder="24"
                  className={inputClass}
                />
              </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="signed"
                    defaultChecked={edition?.signed ?? false}
                    className="h-4 w-4 accent-[#f5a524]"
                  />
                  Signed / autographed
                </label>
                <Field label="Markings">
                  <input
                    name="markings"
                    defaultValue={edition?.markings ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Notes">
                  <input
                    name="notes"
                    defaultValue={poster.notes ?? ""}
                    className={inputClass}
                  />
                </Field>
              </div>
            </details>
            <Field
              label="Artwork"
              hint="First image is the cover. Add close-ups of the numbering, signature, foil, or condition."
            >
              <MultiImageField defaultUrls={defaultImages} />
            </Field>
            <Field label="Collection status">
              <select
                name="state"
                defaultValue={poster.state ?? (poster.owned ? "own" : "want")}
                className={selectClass}
              >
                <option value="own">Own — it's in my collection</option>
                <option value="want">Want — hunting a copy</option>
                <option value="trade">For Trade</option>
                <option value="sell">For Sale</option>
              </select>
            </Field>

            {/* Copy details — price + private notes stay owner-only. */}
            <details
              open={Boolean(
                poster.condition ||
                  poster.framed ||
                  poster.acquiredOn ||
                  poster.acquiredPrice ||
                  poster.privateNotes,
              )}
              className="rounded-lg border border-dashed border-border px-3 py-2"
            >
              <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                My copy — condition, framing, acquisition (optional)
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Condition">
                    <select
                      name="condition"
                      defaultValue={poster.condition ?? ""}
                      className={selectClass}
                    >
                      <option value="">Not graded</option>
                      <option>Mint</option>
                      <option>Near Mint</option>
                      <option>Very Good</option>
                      <option>Good</option>
                      <option>Fair</option>
                      <option>Poor</option>
                    </select>
                  </Field>
                  <Field label="Acquired on">
                    <input
                      type="date"
                      name="acquiredOn"
                      defaultValue={poster.acquiredOn ?? ""}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Paid (private)">
                    <input
                      name="acquiredPrice"
                      defaultValue={poster.acquiredPrice ?? ""}
                      placeholder="$60"
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                      type="checkbox"
                      name="framed"
                      defaultChecked={poster.framed ?? false}
                      className="h-4 w-4 accent-[#f5a524]"
                    />
                    Framed
                  </label>
                </div>
                <Field
                  label="Private notes"
                  hint="Only you can see the price and these notes."
                >
                  <textarea
                    name="privateNotes"
                    rows={2}
                    defaultValue={poster.privateNotes ?? ""}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
              </div>
            </details>
            <Button type="submit">
              <Frame />
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
