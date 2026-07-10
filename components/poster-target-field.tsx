"use client";

import * as React from "react";
import { CalendarRange, MapPin, Tent } from "lucide-react";

import { cn } from "@/lib/utils";
import { inputClass, selectClass } from "@/components/form-controls";

type TargetType = "show" | "tour" | "festival";

/**
 * Choose what a poster documents:
 *  - show: a specific date/venue (pick an existing show).
 *  - tour: multiple dates for one artist (artist + tour name).
 *  - festival: a multi-act event — Governors Ball, Coachella — captured as
 *    a festival show with its full lineup (name, date, place, and the acts).
 * Submits `posterType` plus the fields for the chosen kind. Interactive, so
 * it lives in a client component.
 */
export function PosterTargetField({
  shows,
  defaultType = "show",
  defaultShowId = "",
  defaultTourArtist = "",
  defaultTourName = "",
  defaultFestivalName = "",
  defaultFestivalVenue = "",
  defaultFestivalCity = "",
  defaultFestivalDate = "",
  defaultFestivalEndDate = "",
  defaultFestivalLineup = "",
}: {
  shows: Array<{ id: string; label: string }>;
  defaultType?: TargetType;
  defaultShowId?: string;
  defaultTourArtist?: string;
  defaultTourName?: string;
  defaultFestivalName?: string;
  defaultFestivalVenue?: string;
  defaultFestivalCity?: string;
  defaultFestivalDate?: string;
  defaultFestivalEndDate?: string;
  defaultFestivalLineup?: string;
}) {
  const [type, setType] = React.useState<TargetType>(defaultType);

  const option = (value: TargetType, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        type === value
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );

  const label = (text: string) => (
    <label className="mb-1 block text-xs text-muted-foreground">{text}</label>
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name="posterType" value={type} />
      <p className="text-sm font-medium">This poster is for…</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {option("show", "A concert", <MapPin className="h-4 w-4" />)}
        {option("tour", "A tour", <CalendarRange className="h-4 w-4" />)}
        {option("festival", "A festival", <Tent className="h-4 w-4" />)}
      </div>

      {type === "show" ? (
        <div className="pt-1">
          {label("Which show? (optional)")}
          <select name="showId" defaultValue={defaultShowId} className={selectClass}>
            <option value="">Not tied to a specific show yet</option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.label}
              </option>
            ))}
          </select>
        </div>
      ) : type === "tour" ? (
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <div>
            {label("Band / artist")}
            <input
              name="tourArtist"
              defaultValue={defaultTourArtist}
              placeholder="e.g. Phish"
              className={inputClass}
            />
          </div>
          <div>
            {label("Tour name")}
            <input
              name="tourName"
              defaultValue={defaultTourName}
              placeholder="e.g. 2023 Summer Tour"
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-white/[0.02] p-3">
          <div>
            {label("Festival name")}
            <input
              name="festivalName"
              defaultValue={defaultFestivalName}
              placeholder="e.g. Governors Ball 2014"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              {label("Venue / grounds")}
              <input
                name="festivalVenue"
                defaultValue={defaultFestivalVenue}
                placeholder="e.g. Randall's Island Park"
                className={inputClass}
              />
            </div>
            <div>
              {label("City")}
              <input
                name="festivalCity"
                defaultValue={defaultFestivalCity}
                placeholder="e.g. New York, NY"
                className={inputClass}
              />
            </div>
            <div>
              {label("Date (first day)")}
              <input
                type="date"
                name="festivalDate"
                defaultValue={defaultFestivalDate}
                className={inputClass}
              />
            </div>
            <div>
              {label("End date (optional)")}
              <input
                type="date"
                name="festivalEndDate"
                defaultValue={defaultFestivalEndDate}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            {label("Lineup — one act per line (creates an artist page for each)")}
            <textarea
              name="festivalLineup"
              defaultValue={defaultFestivalLineup}
              rows={5}
              placeholder={"OutKast\nJack White\nVampire Weekend\nThe Strokes\n…"}
              className={cn(inputClass, "min-h-[7rem] resize-y")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The first act is billed at the top; every name becomes a
              searchable artist on the festival.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
