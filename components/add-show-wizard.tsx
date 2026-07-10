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
  PencilLine,
  Plus,
  Search,
  Upload,
} from "lucide-react";

import type { ConcertSearchResult, SetlistPreview } from "@/lib/setlistfm";
import { formatShowDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, inputClass, selectClass } from "@/components/form-controls";

/**
 * Add-show flow, search-first: search setlist.fm for any concert (no
 * username or attendance history needed), pick it, and it's archived WITH
 * its real setlist in ~2 clicks. Manual entry (band → when → match →
 * details) stays one tap away for shows setlist.fm doesn't have.
 */

type Step = "search" | "band" | "when" | "match" | "details" | "done";
/** Manual-entry steps — the progress bar only applies to these. */
const MANUAL_ORDER: Step[] = ["band", "when", "match", "details"];

interface CreatePayload {
  artistName: string;
  venueName: string;
  city: string;
  region: string;
  country: string;
  date: string;
  showTime: string;
  eventType: string;
  eventName: string;
  tourName: string;
  lineup: Array<{ name: string; role: string }>;
  setlistFmUrl: string;
  favorite: boolean;
}

export function AddShowWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("search");

  // Collected fields (shared by search prefill + manual entry).
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

  // Universal concert search.
  const [searchYear, setSearchYear] = React.useState("");
  const [searchCity, setSearchCity] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [results, setResults] = React.useState<SetlistPreview[]>([]);
  const [total, setTotal] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);

  // Manual setlist.fm cross-reference (match step).
  const [looking, setLooking] = React.useState(false);
  const [match, setMatch] = React.useState<SetlistPreview | null>(null);
  // Which step the details form should return to on "Back".
  const [detailsFrom, setDetailsFrom] = React.useState<"search" | "match">("match");

  // Submission.
  const [saving, setSaving] = React.useState(false);
  const [showId, setShowId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const stepIndex = MANUAL_ORDER.indexOf(step);

  /* ---- Universal search ---- */

  async function runSearch(page = 1, append = false) {
    if (!artistName.trim()) return;
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      const params = new URLSearchParams({ artist: artistName.trim(), p: String(page) });
      if (searchYear.trim()) params.set("year", searchYear.trim());
      if (searchCity.trim()) params.set("city", searchCity.trim());
      const res = await fetch(`/api/setlist-search?${params}`);
      const data = (await res.json()) as ConcertSearchResult;
      setTotal(data.total ?? 0);
      setResults((prev) => (append ? [...prev, ...data.results] : data.results));
    } catch {
      if (!append) setResults([]);
    } finally {
      setSearching(false);
    }
  }

  /* ---- Show creation ---- */

  async function createShow(payload: CreatePayload) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/add-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { showId?: string; error?: string };
      if (!res.ok || !data.showId) {
        setError(data.error ?? "Couldn't add the show.");
        return false;
      }
      setShowId(data.showId);
      setStep("done");
      router.refresh();
      return true;
    } catch {
      setError("Something went wrong — try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** One-click add straight from a search result. */
  async function addFromResult(r: SetlistPreview) {
    // No venue on the record → send them to review so they can fill it in.
    if (!r.venueName) {
      reviewResult(r);
      return;
    }
    setArtistName(r.artistName);
    setAddingId(r.setlistFmId);
    await createShow({
      artistName: r.artistName,
      venueName: r.venueName,
      city: r.city ?? "",
      region: r.region ?? "",
      country: r.country ?? "",
      date: r.date,
      showTime: "",
      eventType: "concert",
      eventName: "",
      tourName: r.tourName ?? "",
      lineup: [],
      setlistFmUrl: r.url ?? "",
      favorite: false,
    });
    setAddingId(null);
  }

  /** Prefill the form from a result and jump to details for review. */
  function reviewResult(r: SetlistPreview) {
    setArtistName(r.artistName);
    setDate(r.date);
    setVenueName(r.venueName ?? "");
    setCity(r.city ?? "");
    setRegion(r.region ?? "");
    setCountry(r.country ?? "");
    setTourName(r.tourName ?? "");
    setSetlistFmUrl(r.url ?? "");
    setMatch(r);
    setDetailsFrom("search");
    setStep("details");
  }

  function submitFromState() {
    const openers = openersText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name, role: "support" }));
    return createShow({
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
    });
  }

  /* ---- Manual match step ---- */

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

  function acceptMatch() {
    if (match) {
      if (match.url) setSetlistFmUrl(match.url);
      if (match.tourName && !tourName) setTourName(match.tourName);
      if (match.venueName && !venueName) setVenueName(match.venueName);
      if (match.city && !city) setCity(match.city);
      if (match.region && !region) setRegion(match.region);
      if (match.country && !country) setCountry(match.country);
    }
    setDetailsFrom("match");
    setStep("details");
  }

  function resetAll() {
    setStep("search");
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
    setSearchYear("");
    setSearchCity("");
    setSearched(false);
    setResults([]);
    setTotal(0);
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress (manual entry only) */}
      {MANUAL_ORDER.includes(step) ? (
        <div className="mb-5 flex items-center gap-2">
          {MANUAL_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      ) : null}

      {/* Step 0 — Universal search */}
      {step === "search" ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Search className="h-5 w-5 text-primary" />
                Find a show you went to
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search any concert — we&apos;ll attach the real setlist and fill
                in the venue and date automatically.
              </p>
            </div>
            <Field label="Artist / band">
              <input
                autoFocus
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && artistName.trim()) void runSearch();
                }}
                placeholder="e.g. Radiohead"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Year (optional)">
                <input
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && artistName.trim()) void runSearch();
                  }}
                  inputMode="numeric"
                  placeholder="2018"
                  className={inputClass}
                />
              </Field>
              <Field label="City (optional)">
                <input
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && artistName.trim()) void runSearch();
                  }}
                  placeholder="Chicago"
                  className={inputClass}
                />
              </Field>
            </div>
            <Button
              className="w-full"
              disabled={!artistName.trim() || searching}
              onClick={() => void runSearch()}
            >
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
              {searching ? "Searching…" : "Search setlist.fm"}
            </Button>

            {/* Results */}
            {searched && !searching ? (
              results.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {total} match{total === 1 ? "" : "es"} — pick your night:
                  </p>
                  {results.map((r) => (
                    <div
                      key={r.setlistFmId}
                      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.artistName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[r.venueName, r.city].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatShowDate(r.date)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          {r.tourName ? (
                            <span className="rounded-full border border-border px-1.5 py-0.5">
                              {r.tourName}
                            </span>
                          ) : null}
                          {r.songCount > 0 ? (
                            <span className="rounded-full border border-emerald-500/40 px-1.5 py-0.5 text-emerald-300">
                              {r.songCount}-song setlist
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                        <Button
                          size="sm"
                          disabled={saving}
                          onClick={() => void addFromResult(r)}
                        >
                          {addingId === r.setlistFmId ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Plus />
                          )}
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => reviewResult(r)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  {results.length < total ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void runSearch(Math.floor(results.length / 20) + 1, true)}
                    >
                      Show more
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No matches on setlist.fm. Try just the artist name, or add
                    the show by hand.
                  </p>
                </div>
              )
            ) : null}

            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => setStep("band")}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 pt-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <PencilLine className="h-4 w-4" />
              Can&apos;t find it? Add a show by hand
            </button>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 1 — Band (manual) */}
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("search")}>
                Back to search
              </Button>
              <Button
                className="flex-1"
                disabled={!artistName.trim()}
                onClick={() => setStep("when")}
              >
                Continue
                <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2 — Date & venue (manual) */}
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

      {/* Step 3 — setlist.fm cross-reference (manual) */}
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
                      setDetailsFrom("match");
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
            {venueName ? (
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">{artistName}</span> ·{" "}
                {[venueName, city].filter(Boolean).join(" · ")} ·{" "}
                {date ? formatShowDate(date) : ""}
              </p>
            ) : null}
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
              <Button variant="outline" onClick={() => setStep(detailsFrom)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => void submitFromState()}
                disabled={saving || !venueName.trim() || !date}
              >
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
                onClick={resetAll}
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
