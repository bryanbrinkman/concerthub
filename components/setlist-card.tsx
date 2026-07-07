"use client";

import * as React from "react";
import { CirclePause, CirclePlay, ListMusic, Loader2 } from "lucide-react";

import type { Setlist } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

/**
 * Setlist with playable songs. The play button fetches a 30-second preview
 * from the iTunes Search API (no key required) and plays it inline; when no
 * preview exists, it opens a YouTube search for the live version instead.
 */

// One audio element for the whole app so previews never overlap.
let sharedAudio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

interface SetlistCardProps {
  setlist?: Setlist;
  /** Used in the preview search ("artist song"). */
  artistName?: string;
  /** "preview" = dense hero card; "full" = tab view with notes. */
  variant?: "preview" | "full";
  className?: string;
}

export function SetlistCard({
  setlist,
  artistName,
  variant = "preview",
  className,
}: SetlistCardProps) {
  const [playingKey, setPlayingKey] = React.useState<string | null>(null);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const playingRef = React.useRef<string | null>(null);
  playingRef.current = playingKey;

  // Stop our playback when the card unmounts (e.g. navigating away).
  React.useEffect(
    () => () => {
      if (playingRef.current && sharedAudio) sharedAudio.pause();
    },
    [],
  );

  const stop = React.useCallback(() => {
    sharedAudio?.pause();
    setPlayingKey(null);
  }, []);

  const toggleSong = React.useCallback(
    async (key: string, title: string) => {
      if (playingRef.current === key) {
        stop();
        return;
      }
      const query = `${artistName ?? ""} ${title}`.trim();
      setLoadingKey(key);
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          results?: Array<{ previewUrl?: string }>;
        };
        const preview = data.results?.[0]?.previewUrl;
        if (!preview) throw new Error("no preview");
        const audio = getAudio();
        audio.pause();
        audio.src = preview;
        audio.onended = () => setPlayingKey(null);
        await audio.play();
        setPlayingKey(key);
      } catch {
        // No preview (or blocked) — fall back to a YouTube search.
        window.open(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} live`)}`,
          "_blank",
          "noopener",
        );
        setPlayingKey(null);
      } finally {
        setLoadingKey(null);
      }
    },
    [artistName, stop],
  );

  if (!setlist) {
    return (
      <EmptyState
        icon={ListMusic}
        title="No setlist yet"
        description="Pull one in from setlist.fm or add the songs you remember."
        actionLabel="Add setlist"
        className={className}
      />
    );
  }

  const full = variant === "full";
  let songNumber = 0;

  return (
    <Card className={cn("bg-card/80", className)}>
      <CardHeader className="flex-row items-baseline justify-between space-y-0 pb-3">
        <CardTitle>Setlist</CardTitle>
        {setlist.source === "setlist.fm" ? (
          <a
            href={setlist.sourceUrl ?? "https://www.setlist.fm/"}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            via setlist.fm
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">added by you</span>
        )}
      </CardHeader>
      <CardContent className={cn(full ? "space-y-5" : "space-y-4", "pb-4")}>
        {setlist.sets.map((set, setIndex) => (
          <div key={set.name}>
            {setIndex > 0 ? (
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {set.name}:
              </p>
            ) : null}
            <ol className={cn(full ? "space-y-1.5" : "space-y-1")}>
              {set.songs.map((song, songIndex) => {
                songNumber += 1;
                const key = `${set.name}-${songIndex}-${song.title}`;
                const isPlaying = playingKey === key;
                const isLoading = loadingKey === key;
                return (
                  <li
                    key={key}
                    className="group flex items-center gap-2.5 rounded-md px-1.5 py-0.5 text-sm transition-colors hover:bg-accent/60"
                  >
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {songNumber}.
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {song.title}
                      {song.coverOf ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({song.coverOf} cover)
                        </span>
                      ) : null}
                    </span>
                    {full && song.note ? (
                      <span className="hidden truncate text-xs italic text-muted-foreground sm:inline">
                        {song.note}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        isPlaying
                          ? `Stop ${song.title}`
                          : `Play a preview of ${song.title}`
                      }
                      title={
                        isPlaying ? "Stop preview" : "Play 30s preview"
                      }
                      onClick={() => toggleSong(key, song.title)}
                      className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : isPlaying ? (
                        <CirclePause className="h-4 w-4 text-primary" />
                      ) : (
                        <CirclePlay className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground/70">
          30-second previews via iTunes — no match opens a YouTube search.
        </p>
        {full ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={setlist.sourceUrl ?? "https://www.setlist.fm/"}
              target="_blank"
              rel="noreferrer"
            >
              <ListMusic />
              View on setlist.fm
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
