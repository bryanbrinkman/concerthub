import { notFound } from "next/navigation";
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
  const edition = poster.editions[0];
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
            <Field label="Show (optional)">
              <select
                name="showId"
                defaultValue={poster.showId ?? ""}
                className={selectClass}
              >
                <option value="">Not tied to a show</option>
                {shows.map((show) => (
                  <option key={show.id} value={show.id}>
                    {findArtist(archive, show.artistId)?.name ?? "Unknown"} —{" "}
                    {findVenue(archive, show.venueId)?.name ?? ""} (
                    {formatShortDate(show.date)})
                  </option>
                ))}
              </select>
            </Field>
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
              <Field label="Edition name">
                <input
                  name="editionName"
                  defaultValue={edition?.name ?? ""}
                  placeholder="Regular / Foil / AP"
                  className={inputClass}
                />
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
              <Field label="Dimensions">
                <input
                  name="dimensions"
                  defaultValue={edition?.dimensions ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="signed"
                defaultChecked={edition?.signed ?? false}
                className="h-4 w-4 accent-[#8b5cf6]"
              />
              Signed / autographed
            </label>
            <Field label="Markings (optional)">
              <input
                name="markings"
                defaultValue={edition?.markings ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Notes (optional)">
              <input
                name="notes"
                defaultValue={poster.notes ?? ""}
                className={inputClass}
              />
            </Field>
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
