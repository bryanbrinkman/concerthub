import { CalendarDays, LogIn } from "lucide-react";

import { getArchive } from "@/lib/archive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass } from "@/components/form-controls";
import { addShowAction } from "../actions";

export const metadata = { title: "Add show" };

export default async function AddShowPage() {
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to add shows"
        description="Shows are saved to your own archive — sign in with Google from the sidebar first."
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
            <Field
              label="Artist"
              hint="Use the billing setlist.fm uses (e.g. “Jeff Lynne's ELO”, not “ELO”) so the live setlist resolves."
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
