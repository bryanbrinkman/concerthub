import { notFound } from "next/navigation";
import { CalendarDays, LogIn } from "lucide-react";

import {
  findArtist,
  findTour,
  findVenue,
  getArchive,
  lineupFor,
} from "@/lib/archive";
import { formatShowDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass, selectClass } from "@/components/form-controls";
import { LineupFields } from "@/components/lineup-fields";
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
  const lineup = lineupFor(archive, show);
  const primary = lineup.find((e) => e.artist.id === show.artistId);
  const rest = lineup.filter((e) => e.artist.id !== show.artistId);

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
              <Field label="Event type">
                <select
                  name="eventType"
                  defaultValue={show.eventType ?? "concert"}
                  className={selectClass}
                >
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                  <option value="festival_day">Festival day</option>
                  <option value="multi_act">Multi-act bill</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field
                label="Event name (optional)"
                hint="Becomes the title, e.g. “Governors Ball 2014 — Day 2”."
              >
                <input
                  name="eventName"
                  defaultValue={show.name ?? ""}
                  placeholder="e.g. Governors Ball 2014"
                  className={inputClass}
                />
              </Field>
              <Field label="End date (multi-day events)">
                <input
                  name="endDate"
                  type="date"
                  defaultValue={show.endDate ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Showtime (optional)">
                <input
                  name="showTime"
                  defaultValue={show.showTime ?? ""}
                  placeholder="8:00 PM"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Tour (optional)">
              <input
                name="tourName"
                defaultValue={tour?.name ?? ""}
                placeholder="e.g. The Human Fear Tour"
                className={inputClass}
              />
            </Field>
            <Field
              label={`Billing for ${artist?.name ?? "the primary act"}`}
              hint="The primary act can't be removed here — change its role for co-headline bills or festival slots."
            >
              <select
                name="primaryRole"
                defaultValue={primary?.performer.billingRole ?? "headliner"}
                className={selectClass}
              >
                <option value="headliner">Headliner</option>
                <option value="co_headliner">Co-headliner</option>
                <option value="support">Support</option>
                <option value="opener">Opener</option>
                <option value="festival_performer">Festival performer</option>
                <option value="special_guest">Special guest</option>
                <option value="unknown">Unknown billing</option>
              </select>
            </Field>
            <Field
              label="Rest of the bill"
              hint="Co-headliners, support, or the whole festival lineup — rows are billing order. Removing a row takes that act off the bill."
            >
              <LineupFields
                defaultRows={rest.map((e) => ({
                  name: e.artist.name,
                  role: e.performer.billingRole,
                }))}
                knownNames={archive.artists.map((a) => a.name)}
              />
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
