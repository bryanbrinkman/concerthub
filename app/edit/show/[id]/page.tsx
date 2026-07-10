import { notFound } from "next/navigation";
import { CalendarDays, Lock, LogIn, Users } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass, selectClass } from "@/components/form-controls";
import { LineupFields } from "@/components/lineup-fields";
import { updateShowAction } from "@/app/add/actions";

export const metadata = { title: "Edit show" };

const ROLE_LABELS: Record<string, string> = {
  headliner: "Headliner",
  co_headliner: "Co-headliner",
  support: "Support",
  opener: "Opener",
  festival_performer: "Festival performer",
  special_guest: "Special guest",
  unknown: "Unknown billing",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  concert: "Concert",
  festival: "Festival",
  festival_day: "Festival day",
  multi_act: "Multi-act bill",
  other: "Other",
};

/** A communal field that's already filled — shown but not editable. */
function LockedValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate text-foreground">{children}</span>
    </div>
  );
}

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

      {/* Shows are shared across everyone who attended, so edits only fill in
          missing details and add performers — nothing already recorded can be
          overwritten or removed here. */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 px-3.5 py-3 text-sm text-muted-foreground">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          This is a <span className="text-foreground">shared show record</span>.
          You can fill in missing details and add acts to the bill — but to
          protect the archive, anything already recorded can't be changed or
          removed.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Show details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateShowAction} className="space-y-4">
            <input type="hidden" name="showId" value={show.id} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Event type">
                {show.eventType && show.eventType !== "concert" ? (
                  <LockedValue>
                    {EVENT_TYPE_LABELS[show.eventType] ??
                      show.eventType.replace(/_/g, " ")}
                  </LockedValue>
                ) : (
                  <select name="eventType" defaultValue="concert" className={selectClass}>
                    <option value="concert">Concert</option>
                    <option value="festival">Festival</option>
                    <option value="festival_day">Festival day</option>
                    <option value="multi_act">Multi-act bill</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </Field>
              <Field
                label="Event name"
                hint={show.name ? undefined : "Becomes the title, e.g. “Governors Ball 2014”."}
              >
                {show.name ? (
                  <LockedValue>{show.name}</LockedValue>
                ) : (
                  <input
                    name="eventName"
                    placeholder="e.g. Governors Ball 2014"
                    className={inputClass}
                  />
                )}
              </Field>
              <Field label="End date (multi-day events)">
                {show.endDate ? (
                  <LockedValue>{show.endDate}</LockedValue>
                ) : (
                  <input name="endDate" type="date" className={inputClass} />
                )}
              </Field>
              <Field label="Showtime">
                {show.showTime ? (
                  <LockedValue>{show.showTime}</LockedValue>
                ) : (
                  <input name="showTime" placeholder="8:00 PM" className={inputClass} />
                )}
              </Field>
            </div>
            <Field label="Tour">
              {tour ? (
                <LockedValue>{tour.name}</LockedValue>
              ) : (
                <input
                  name="tourName"
                  placeholder="e.g. The Human Fear Tour"
                  className={inputClass}
                />
              )}
            </Field>

            {/* Existing bill — read-only. New acts are added below. */}
            <Field label="On the bill">
              <div className="flex flex-wrap gap-1.5">
                {primary ? (
                  <Badge variant="secondary">
                    {artist?.name ?? "Primary act"} ·{" "}
                    {ROLE_LABELS[primary.performer.billingRole] ?? "Headliner"}
                  </Badge>
                ) : null}
                {rest.map((e) => (
                  <Badge key={e.artist.id} variant="outline">
                    {e.artist.name}
                    {ROLE_LABELS[e.performer.billingRole]
                      ? ` · ${ROLE_LABELS[e.performer.billingRole]}`
                      : ""}
                  </Badge>
                ))}
              </div>
            </Field>

            <Field
              label="Add to the bill"
              hint="Add co-headliners, support, or festival acts. Each name becomes a searchable artist. Existing acts above stay put."
            >
              <LineupFields
                defaultRows={[]}
                knownNames={archive.artists.map((a) => a.name)}
              />
            </Field>

            {show.setlistFmId ? (
              <Field label="setlist.fm">
                <LockedValue>
                  {show.setlistFmUrl ? (
                    <a
                      href={show.setlistFmUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Linked ✓
                    </a>
                  ) : (
                    "Linked ✓"
                  )}
                </LockedValue>
              </Field>
            ) : (
              <Field
                label="setlist.fm link"
                hint="Paste the show's setlist.fm URL to attach the exact setlist — handy when the auto-match by artist name and date comes up empty."
              >
                <input
                  name="setlistFmUrl"
                  type="url"
                  placeholder="https://www.setlist.fm/setlist/…"
                  className={inputClass}
                />
              </Field>
            )}
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
