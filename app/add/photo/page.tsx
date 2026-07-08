import { Camera, LogIn } from "lucide-react";

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
import { ImageField } from "@/components/image-field";
import { addPhotoAction } from "../actions";

export const metadata = { title: "Add photo" };

export default async function AddPhotoPage({
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
        title="Sign in to add photos"
        description="Photos are saved to your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  const shows = allShows(archive);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add a photo"
        subtitle="The blurry lasers, the marquee, the confetti — they all count."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>New photo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addPhotoAction} className="space-y-4">
            <Field label="Show">
              <select
                name="showId"
                required
                defaultValue={preselectedShow ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  Pick a show…
                </option>
                {shows.map((show) => (
                  <option key={show.id} value={show.id}>
                    {findArtist(archive, show.artistId)?.name ?? "Unknown"} —{" "}
                    {findVenue(archive, show.venueId)?.name ?? ""} (
                    {formatShortDate(show.date)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Photo">
              <ImageField />
            </Field>
            <Field label="Caption (optional)">
              <input
                name="caption"
                placeholder="e.g. Confetti during the encore"
                className={inputClass}
              />
            </Field>
            <Button type="submit">
              <Camera />
              Save to archive
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
