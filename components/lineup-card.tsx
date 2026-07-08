import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { Artist, ShowPerformer } from "@/lib/types";
import { BILLING_ROLE_LABELS } from "@/lib/billing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface LineupItem {
  artist: Artist;
  performer: ShowPerformer;
}

const COLLAPSE_AFTER = 10;

function PerformerRow({ item }: { item: LineupItem }) {
  const { artist, performer } = item;
  const roleLabel =
    performer.billingRole === "headliner" ||
    performer.billingRole === "festival_performer" ||
    performer.billingRole === "unknown"
      ? null
      : BILLING_ROLE_LABELS[performer.billingRole];
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent">
      <Link
        href={`/artists/${artist.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
      >
        {artist.name}
        {performer.setTime ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {performer.setTime}
          </span>
        ) : null}
      </Link>
      <span className="flex shrink-0 items-center gap-1.5">
        {roleLabel ? <Badge variant="secondary">{roleLabel}</Badge> : null}
        {performer.setlistFmUrl ? (
          <a
            href={performer.setlistFmUrl}
            target="_blank"
            rel="noreferrer"
            title={`${artist.name}'s setlist on setlist.fm`}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </span>
    </li>
  );
}

/**
 * The full bill for a show/event, in billing order — grouped by stage
 * when stages are known, collapsed past the fold for big festivals.
 */
export function LineupCard({ items }: { items: LineupItem[] }) {
  if (items.length === 0) return null;

  // Group by stage only when at least one performer has one.
  const stages = new Map<string, LineupItem[]>();
  for (const item of items) {
    const key = item.performer.stage ?? "";
    stages.set(key, [...(stages.get(key) ?? []), item]);
  }
  const grouped = [...stages.entries()].filter(([stage]) => stage !== "");
  const ungrouped = stages.get("") ?? [];
  const useStages = grouped.length > 0;

  const renderList = (list: LineupItem[]) => {
    if (list.length <= COLLAPSE_AFTER) {
      return (
        <ul className="space-y-0.5">
          {list.map((item) => (
            <PerformerRow key={item.artist.id} item={item} />
          ))}
        </ul>
      );
    }
    const head = list.slice(0, COLLAPSE_AFTER - 2);
    const tail = list.slice(COLLAPSE_AFTER - 2);
    return (
      <>
        <ul className="space-y-0.5">
          {head.map((item) => (
            <PerformerRow key={item.artist.id} item={item} />
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer rounded-lg px-2 py-1.5 text-sm text-primary transition-colors hover:bg-accent">
            View full {list.length}-artist lineup
          </summary>
          <ul className="space-y-0.5">
            {tail.map((item) => (
              <PerformerRow key={item.artist.id} item={item} />
            ))}
          </ul>
        </details>
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Lineup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {useStages ? (
          <>
            {grouped.map(([stage, list]) => (
              <div key={stage}>
                <p className="mb-1 px-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {stage}
                </p>
                {renderList(list)}
              </div>
            ))}
            {ungrouped.length > 0 ? (
              <div>
                <p className="mb-1 px-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Also on the bill
                </p>
                {renderList(ungrouped)}
              </div>
            ) : null}
          </>
        ) : (
          renderList(items)
        )}
      </CardContent>
    </Card>
  );
}
