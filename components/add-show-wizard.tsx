"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Frame,
  ListMusic,
  Loader2,
  MapPin,
  Music,
  Plus,
  Upload,
} from "lucide-react";

import type { SetlistPreview } from "@/lib/setlistfm";
import { formatShowDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, inputClass, selectClass } from "@/components/form-controls";

/**
 * Stepped add-show flow: band → date & venue → setlist.fm cross-check →
 * a few optional details → created, then choose what to add next
 * (poster, ticket/photo, or just view the show). Replaces the single big
 * form so adding a show feels light.
 */

type Step = "band" | "when" | "match" | "details" | "done";
const ORDER: Step[] = ["band", "when", "match", "details"];

export function AddShowWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("band");

  // Collected fields.
  const [artistName, setArtistName] = React.useState("");
  const [date, setDate] = React.useState("");
  const [venueName, setVenueName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [showTime, setShowTime] = React.useState("");
  const [eventType, setEventType] = React.useState("concert");
  const [eventName, setEventName] = React.useState("");
  const [tourName, setTourName] = React.useState("");
  const [openersText, setOpenersText] = React.useState("");
  const [favorite, setFavorite] = React.useState(false);
  const [setlistFmUrl, setSetlistFmUrl] = React.useState("");

  // setlist.fm cross-reference.
  const [looking, setLooking] = React.useState(false);
  const [match, setMatch] = React.useState<SetlistPreview | null>(null);

  // Submission.
  const [saving, setSaving] = React.useState(false);
  const [showId, setShowId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const stepIndex = ORDER.indexOf(step);

  async function runLookup() {
    setStep("match");
    setLooking(true);
    setMatch(null);
    try {
      const res = await fetch("/api/setlist-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistName, date }),
      });
      const data = (await res.json()) as { match: SetlistPreview | null };
      setMatch(data.match);
    } catch {
      setMatch(null);
    } finally {
      setLooking(false);
    }
  }

  /** Accept the setlist.fm match: link the setlist, adopt tour + any
   * blank venue fields from it. */
  function acceptMatch() {
    if (match) {
      if (match.url) setSetlistFmUrl(match.url);
      if (match.tourName && !tourName) setTourName(match.tourName);
      if (match.venueName && !venueName) setVenueName(match.venueName);
      if (match.city && !city) setCity(match.city);
      if (match.region && !region) setRegion(match.region);
      if (match.country && !country) setCountry(match.country);
    }
    setStep("details");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const openers = openersText
        .split(/[\n,]+/)
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name, role: "support" }));
      const res = await fetch("/api/add-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName,
          venueName,
          city,
          region,
          country,
          date,
          showTime,
          eventType,
          eventName,
          tourName,
          lineup: openers,
          setlistFmUrl,
          favorite,
        }),
      });
      const data = (await res.json()) as { showId?: string; error?: string };
      if (!res.ok || !data.showId) {
        setError(data.error ?? "Couldn't add the show.");
        return;
      }
      setShowId(data.showId);
      setStep("done");
      router.refresh();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      {step !== "done" ? (
        <div className="mb-5 flex items-center gap-2">
          {ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      ) : null}

      {/* Step 1 — Band */}
      {step === "band" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Music className="h-5 w-5 text-primary" />
                Who did you see?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The headliner or main act. You can add openers later.
              </p>
            </div>
            <Field
              label="Artist / band"
              hint="Use the billing setlist.fm uses (e.g. “Jeff Lynne's ELO”) so the setlist matches."
            >
              <input
                autoFocus
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && artistName.trim()) setStep("when");
                }}
                placeholder="e.g. Rilo Kiley"
                className={inputClass}
              />
            </Field>
            <Button
              className="w-full"
              disabled={!artistName.trim()}
              onClick={() => setStep("when")}
            >
              Continue
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2 — Date & venue */}
      {step === "when" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                When &amp; where?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {artistName} — the date and venue.
              </p>
            </div>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Venue">
              <input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. The Capitol Theatre"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Port Chester" className={inputClass} />
              </Field>
              <Field label="State/region">
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="NY" className={inputClass} />
              </Field>
              <Field label="Country">
                <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="USA" className={inputClass} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("band")}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!date || !venueName.trim()}
                onClick={() => void runLookup()}
              >
                Find my show
                <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3 — setlist.fm cross-reference */}
      {step === "match" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            {looking ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Checking setlist.fm for {artistName} on{" "}
                  {date ? formatShowDate(date) : ""}…
                </p>
              </div>
            ) : match ? (
              <>
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <ListMusic className="h-5 w-5 text-emerald-400" />
                    Found it on setlist.fm
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll attach the setlist and fill in what we know.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="font-semibold">{match.artistName}</p>
                  <p className="text-sm text-muted-foreground">
                    {[match.venueName, match.city].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatShowDate(match.date)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {match.tourName ? (
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {match.tourName}
                      </span>
                    ) : null}
                    {match.songCount > 0 ? (
                      <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-300">
                        {match.songCount}-song setlist
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={acceptMatch}>
                    <Check />
                    Looks right — continue
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMatch(null);
                      setStep("details");
                    }}
                  >
                    Not my show — skip
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold">No setlist.fm match</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nothing came up for {artistName} on{" "}
                    {date ? formatShowDate(date) : "that date"}. No problem —
                    add the show and fill in the rest. You can paste a
                    setlist.fm link later from the show page.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("when")}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep("details")}>
                    Continue
                    <ArrowRight />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 4 — optional details + submit */}
      {step === "details" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">A few more details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All optional — add what you know, edit anytime.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Event type">
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={selectClass}>
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                  <option value="festival_day">Festival day</option>
                  <option value="multi_act">Multi-act bill</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Showtime">
                <input value={showTime} onChange={(e) => setShowTime(e.target.value)} placeholder="8:00 PM" className={inputClass} />
              </Field>
            </div>
            {eventType !== "concert" ? (
              <Field label="Event name" hint="e.g. Governors Ball 2014">
                <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Festival / event name" className={inputClass} />
              </Field>
            ) : null}
            <Field label="Tour (optional)">
              <input value={tourName} onChange={(e) => setTourName(e.target.value)} placeholder="e.g. The Human Fear Tour" className={inputClass} />
            </Field>
            <Field
              label="Openers / support (optional)"
              hint="One per line — each gets their own artist page."
            >
              <textarea
                value={openersText}
                onChange={(e) => setOpenersText(e.target.value)}
                rows={3}
                placeholder={"Opener one\nOpener two"}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="h-4 w-4 accent-[#8b5cf6]"
              />
              Mark as a favorite
            </label>
            {setlistFmUrl ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                setlist.fm setlist will be attached
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("match")}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <CalendarDays />}
                {saving ? "Adding…" : "Add show"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Done — what next */}
      {step === "done" && showId ? (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{artistName} added</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                It&apos;s in your archive. Add something to it?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <a href={`/add/poster?show=${showId}`}>
                  <Frame />
                  Add a poster
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <a href={`/add/ephemera?show=${showId}`}>
                  <Upload />
                  Add a ticket, photo, or memory
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/shows/${showId}`}>
                  View the show
                  <ArrowRight />
                </a>
              </Button>
              <button
                type="button"
                onClick={() => {
                  // Reset for another show.
                  setStep("band");
                  setArtistName("");
                  setDate("");
                  setVenueName("");
                  setCity("");
                  setRegion("");
                  setCountry("");
                  setShowTime("");
                  setEventType("concert");
                  setEventName("");
                  setTourName("");
                  setOpenersText("");
                  setFavorite(false);
                  setSetlistFmUrl("");
                  setMatch(null);
                  setShowId(null);
                }}
                className="mt-1 cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Add another show
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
