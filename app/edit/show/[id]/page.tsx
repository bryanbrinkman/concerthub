import { notFound } from "next/navigation";
import { CalendarDays, LogIn } from "lucide-react";

import {
  findArtist,
  findTour,
  findVenue,
  getArchive,
  openersForShow,
} from "@/lib/archive";
import { formatShowDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass } from "@/components/form-controls";
import { OpenerFields } from "@/components/opener-fields";
import { updateShowAction } from "@/app/add/actions";

export const metadata = { title: "Edit show" };

export default async function EditShowPage({
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
        title="Sign in to edit shows"
        description="Shows live in your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  const show = archive.shows.find((s) => s.id === id);
  if (!show) notFound();

  const artist = findArtist(archive, show.artistId);
  const venue = findVenue(archive, show.venueId);
  const tour = show.tourId ? findTour(archive, show.tourId) : undefined;
  const openers = openersForShow(archive, show);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Edit show"
        subtitle={`${artist?.name ?? "Show"} — ${venue?.name ?? ""}, ${formatShowDate(show.date)}`}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Show details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateShowAction} className="space-y-4">
            <input type="hidden" name="showId" value={show.id} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Showtime (optional)">
                <input
                  name="showTime"
                  defaultValue={show.showTime ?? ""}
                  placeholder="8:00 PM"
                  className={inputClass}
                />
              </Field>
              <Field label="Tour (optional)">
                <input
                  name="tourName"
                  defaultValue={tour?.name ?? ""}
                  placeholder="e.g. The Human Fear Tour"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field
              label="Openers / support acts"
              hint="Everyone on the bill gets their own artist page and show credit. Remove a row to take an act off the bill."
            >
              <OpenerFields defaultNames={openers.map((o) => o.name)} />
            </Field>
            <Field
              label="setlist.fm link (optional)"
              hint="Paste the show's setlist.fm URL to attach the exact setlist — handy when the auto-match by artist name and date comes up empty. Clear the field to unlink."
            >
              <input
                name="setlistFmUrl"
                type="url"
                defaultValue={show.setlistFmUrl ?? ""}
                placeholder="https://www.setlist.fm/setlist/…"
                className={inputClass}
              />
            </Field>
            <Button type="submit">
              <CalendarDays />
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
