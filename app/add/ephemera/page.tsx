import { LogIn, Upload } from "lucide-react";

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
import { addEphemeraAction } from "../actions";

export const metadata = { title: "Add ephemera" };

const KINDS = [
  ["ticket", "Ticket stub"],
  ["laminate", "Laminate / pass"],
  ["wristband", "Wristband"],
  ["poster", "Poster"],
  ["apparel", "Apparel (tee, hat…)"],
  ["other", "Other"],
] as const;

export default async function AddEphemeraPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; kind?: string }>;
}) {
  const { show: preselectedShow, kind: preselectedKind } = await searchParams;
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to add ephemera"
        description="Items are saved to your own archive. Create a free account — it takes a moment."
        actionLabel="Create an account"
        actionHref="/login?mode=signup"
      />
    );
  }

  const shows = allShows(archive);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add ephemera"
        subtitle="Ticket stubs, wristbands, laminates, merch — pin what you kept to its show."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>New item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addEphemeraAction} className="space-y-4">
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
            <Field label="Type">
              <select
                name="kind"
                defaultValue={preselectedKind ?? "ticket"}
                className={selectClass}
              >
                {KINDS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                name="title"
                required
                placeholder="e.g. Ticket Stub"
                className={inputClass}
              />
            </Field>
            <Field
              label="Details (optional)"
              hint="The dense collector stuff: section/row/seat, price, size, edition."
            >
              <input
                name="detail"
                placeholder="e.g. Sec 110 · Row 18 · Seat 7 · $89.50"
                className={inputClass}
              />
            </Field>
            <Field label="Image (optional)">
              <ImageField />
            </Field>
            <Button type="submit">
              <Upload />
              Save to archive
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
