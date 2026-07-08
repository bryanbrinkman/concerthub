import { CalendarDays, LogIn } from "lucide-react";

import { getArchive } from "@/lib/archive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass, selectClass } from "@/components/form-controls";
import { LineupFields } from "@/components/lineup-fields";
import { addShowAction } from "../actions";

export const metadata = { title: "Add show" };

export default async function AddShowPage() {
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to add shows"
        description="Shows are saved to your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add a show"
        subtitle="Enter it by hand — if setlist.fm knows the show, the setlist appears automatically once the artist name and date match."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>New show</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addShowAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Event type">
                <select name="eventType" defaultValue="concert" className={selectClass}>
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                  <option value="festival_day">Festival day</option>
                  <option value="multi_act">Multi-act bill</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field
                label="Event name (optional)"
                hint="Festivals & multi-act bills — becomes the title, e.g. “Governors Ball 2014”."
              >
                <input
                  name="eventName"
                  placeholder="e.g. Governors Ball 2014"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field
              label="Headliner / primary act"
              hint="Use the billing setlist.fm uses (e.g. “Jeff Lynne's ELO”, not “ELO”) so the live setlist resolves. For festivals, the first act you care about is fine — the full bill goes below."
            >
              <input
                name="artistName"
                required
                placeholder="e.g. Rilo Kiley"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Venue">
                <input
                  name="venueName"
                  required
                  placeholder="e.g. The Capitol Theatre"
                  className={inputClass}
                />
              </Field>
              <Field label="City">
                <input
                  name="city"
                  placeholder="e.g. Port Chester"
                  className={inputClass}
                />
              </Field>
              <Field label="State / region (optional)">
                <input name="region" placeholder="NY" className={inputClass} />
              </Field>
              <Field label="Country (optional)">
                <input name="country" placeholder="USA" className={inputClass} />
              </Field>
              <Field label="Date">
                <input name="date" required type="date" className={inputClass} />
              </Field>
              <Field label="End date (multi-day events)">
                <input name="endDate" type="date" className={inputClass} />
              </Field>
              <Field label="Showtime (optional)">
                <input
                  name="showTime"
                  placeholder="8:00 PM"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Tour (optional)">
              <input
                name="tourName"
                placeholder="e.g. The Human Fear Tour"
                className={inputClass}
              />
            </Field>
            <Field
              label="Rest of the bill (optional)"
              hint="Co-headliners, support acts, or a whole festival lineup — everyone gets their own artist page and show credit. Rows are billing order."
            >
              <LineupFields knownNames={archive.artists.map((a) => a.name)} />
            </Field>
            <Field
              label="setlist.fm link (optional)"
              hint="Paste the show's setlist.fm URL to attach the exact setlist. Without it, we auto-match by artist name and date."
            >
              <input
                name="setlistFmUrl"
                type="url"
                placeholder="https://www.setlist.fm/setlist/…"
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="favorite"
                className="h-4 w-4 accent-[#8b5cf6]"
              />
              Mark as a favorite
            </label>
            <Button type="submit">
              <CalendarDays />
              Add to my archive
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
