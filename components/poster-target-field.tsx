"use client";

import * as React from "react";
import { CalendarRange, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { inputClass, selectClass } from "@/components/form-controls";

/**
 * Choose what a poster documents: a specific show (date/venue) or a whole
 * tour (multiple dates). Submits `posterType` plus either `showId` or the
 * tour's artist + name. Interactive, so it lives in a client component.
 */
export function PosterTargetField({
  shows,
  defaultType = "show",
  defaultShowId = "",
  defaultTourArtist = "",
  defaultTourName = "",
}: {
  shows: Array<{ id: string; label: string }>;
  defaultType?: "show" | "tour";
  defaultShowId?: string;
  defaultTourArtist?: string;
  defaultTourName?: string;
}) {
  const [type, setType] = React.useState<"show" | "tour">(defaultType);

  const option = (value: "show" | "tour", label: string, icon: React.ReactNode) => (
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

  return (
    <div className="space-y-2">
      <input type="hidden" name="posterType" value={type} />
      <p className="text-sm font-medium">This poster is for…</p>
      <div className="flex gap-2">
        {option("show", "A specific show", <MapPin className="h-4 w-4" />)}
        {option("tour", "A tour (multiple dates)", <CalendarRange className="h-4 w-4" />)}
      </div>

      {type === "show" ? (
        <div className="pt-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Which show? (optional)
          </label>
          <select name="showId" defaultValue={defaultShowId} className={selectClass}>
            <option value="">Not tied to a specific show yet</option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Band / artist
            </label>
            <input
              name="tourArtist"
              defaultValue={defaultTourArtist}
              placeholder="e.g. Phish"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Tour name
            </label>
            <input
              name="tourName"
              defaultValue={defaultTourName}
              placeholder="e.g. 2023 Summer Tour"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
