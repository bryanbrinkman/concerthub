import { Frame, LogIn } from "lucide-react";

import {
  allShows,
  findArtist,
  findVenue,
  getArchive,
} from "@/lib/archive";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass, selectClass } from "@/components/form-controls";
import { MultiImageField } from "@/components/multi-image-field";
import { PosterTargetField } from "@/components/poster-target-field";
import { EbPrefillField } from "@/components/eb-prefill-field";
import { addPosterAction } from "../actions";

export const metadata = { title: "Add poster" };

export default async function AddPosterPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show: preselectedShow } = await searchParams;
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to add posters"
        description="Prints are saved to your own archive. Create a free account — it takes a moment."
        actionLabel="Create an account"
        actionHref="/login?mode=signup"
      />
    );
  }

  const shows = allShows(archive);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add poster"
        subtitle="Catalog a print — designer, edition, technique, and your copy number."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>New print</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addPosterAction} className="space-y-4">
            <Field
              label="Artwork"
              hint="First image is the cover. Add close-ups of the numbering, signature, foil, or condition — collectors love the details."
            >
              <MultiImageField />
            </Field>
            <Field
              label="Expresso Beans link (optional)"
              hint="Paste the EB item page and we'll fill in edition size, dimensions, and technique for you."
            >
              <EbPrefillField />
            </Field>
            <PosterTargetField
              shows={shows.map((show) => ({
                id: show.id,
                label: `${findArtist(archive, show.artistId)?.name ?? "Unknown"} — ${
                  findVenue(archive, show.venueId)?.name ?? ""
                } (${formatShortDate(show.date)})`,
              }))}
              defaultShowId={preselectedShow ?? ""}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input
                  name="title"
                  required
                  placeholder="e.g. The Capitol Theatre"
                  className={inputClass}
                />
              </Field>
              <Field label="Poster Artist">
                <input
                  name="designer"
                  placeholder="e.g. Killer Acid"
                  className={inputClass}
                />
              </Field>
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
                  placeholder="killeracid.com"
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
                  placeholder="2025"
                  className={inputClass}
                />
              </Field>
              <Field label="Edition name">
                <input
                  name="editionName"
                  placeholder="Regular / Foil / AP"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Variant of (optional)"
                hint="Foil, color way, AP…? Pick the parent design so variants group together."
              >
                <select name="variantOf" defaultValue="" className={selectClass}>
                  <option value="">Not a variant — this is the main design</option>
                  {archive.posters
                    .filter((p) => !p.variantOf)
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
                  placeholder="300"
                  className={inputClass}
                />
              </Field>
              <Field label="Your copy #">
                <input
                  name="copyNumber"
                  type="number"
                  min={1}
                  placeholder="137"
                  className={inputClass}
                />
              </Field>
              <Field label="Technique">
                <input
                  name="technique"
                  placeholder="6-color screen print"
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
                  placeholder="24"
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="signed"
                className="h-4 w-4 accent-[#f5a524]"
              />
              Signed / autographed
            </label>
            <Field label="Markings (optional)">
              <input
                name="markings"
                placeholder="Signed & numbered in pencil"
                className={inputClass}
              />
            </Field>
            <Field label="Notes (optional)">
              <input
                name="notes"
                placeholder="Official show poster"
                className={inputClass}
              />
            </Field>
            <Field label="Collection status">
              <select name="state" defaultValue="own" className={selectClass}>
                <option value="own">Own — it's in my collection</option>
                <option value="want">Want — hunting a copy</option>
                <option value="trade">For Trade</option>
                <option value="sell">For Sale</option>
              </select>
            </Field>

            {/* Copy details — all optional; price + private notes are never
                shown to anyone else. */}
            <details className="rounded-lg border border-dashed border-border px-3 py-2">
              <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                My copy — condition, framing, acquisition (optional)
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Condition">
                    <select name="condition" defaultValue="" className={selectClass}>
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
                    <input type="date" name="acquiredOn" className={inputClass} />
                  </Field>
                  <Field label="Paid (private)">
                    <input
                      name="acquiredPrice"
                      placeholder="$60"
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                      type="checkbox"
                      name="framed"
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
                    placeholder="Bought at the merch table; slight ding top-left…"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
              </div>
            </details>
            <Button type="submit">
              <Frame />
              Save to archive
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
