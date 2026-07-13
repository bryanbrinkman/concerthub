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
                className="h-4 w-4 accent-[#8b5cf6]"
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
