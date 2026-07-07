import {
  AudioLines,
  ExternalLink,
  Image as ImageIcon,
  ListMusic,
  Music2,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { MediaLink, MediaLinkKind } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

const KIND_ICONS: Record<MediaLinkKind, LucideIcon> = {
  setlistfm: ListMusic,
  expressobeans: ExternalLink,
  audio: AudioLines,
  video: Play,
  photos: ImageIcon,
  streaming: Music2,
};

/** "Listen / Watch" — recordings, videos, albums, and reference links. */
export function MediaLinksCard({ links }: { links: MediaLink[] }) {
  if (links.length === 0) {
    return (
      <EmptyState
        icon={Play}
        title="Nothing to play yet"
        description="Link a live recording, a YouTube clip, or your photo album from the night."
        actionLabel="Add a link"
      />
    );
  }

  // Recordings/media up top; reference links (setlist.fm, Expresso Beans) below.
  const media = links.filter(
    (l) => l.kind !== "setlistfm" && l.kind !== "expressobeans",
  );
  const references = links.filter(
    (l) => l.kind === "setlistfm" || l.kind === "expressobeans",
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Listen / Watch</CardTitle>
        <Button variant="ghost" size="sm">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {media.map((link) => {
          const Icon = KIND_ICONS[link.kind];
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {link.label}
                </span>
                {link.sublabel ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {link.sublabel}
                  </span>
                ) : null}
              </span>
              {link.duration ? (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {link.duration}
                </span>
              ) : (
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              )}
            </a>
          );
        })}

        {references.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-3">
            {/* TODO(api): deep-link to the exact setlist.fm setlist and
                Expresso Beans item pages once those integrations exist. */}
            {references.map((link) => {
              const Icon = KIND_ICONS[link.kind];
              return (
                <Button key={link.id} variant="outline" size="sm" asChild>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <Icon />
                    {link.label}
                  </a>
                </Button>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
