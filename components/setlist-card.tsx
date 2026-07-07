import { CirclePlay, ListMusic } from "lucide-react";

import type { Setlist } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

interface SetlistCardProps {
  setlist?: Setlist;
  /** "preview" = dense hero card; "full" = tab view with notes. */
  variant?: "preview" | "full";
  className?: string;
}

export function SetlistCard({
  setlist,
  variant = "preview",
  className,
}: SetlistCardProps) {
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
          // TODO(api): link to the exact setlist.fm setlist page once ids resolve.
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
              {set.songs.map((song) => {
                songNumber += 1;
                return (
                  <li
                    key={`${set.name}-${song.title}`}
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
                    <CirclePlay className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
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
