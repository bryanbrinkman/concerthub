import Link from "next/link";
import { Award, Frame, Plus } from "lucide-react";

import { findArtist, findShow, getArchive, posterState } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { enrichPosters } from "@/lib/expressobeans";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PosterRack, type RackPoster } from "@/components/poster-rack";
import { EmptyState } from "@/components/empty-state";
import { ShareButton } from "@/components/share-button";

export const metadata = { title: "My Posters" };

/** The personal flat file: only the viewer's own prints, as a rack. */
export default async function MyPostersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; missing?: string }>;
}) {
  const { state: stateFilter, missing } = await searchParams;
  const archive = await getArchive();
  let filtered = archive.posters;
  if (stateFilter) {
    filtered = filtered.filter(
      (p) => (p.state ?? (p.owned ? "own" : "want")) === stateFilter,
    );
  }
  // Deep-links from Explore's "missing from the archive" cards — you can
  // only fix your own posters, so this narrows to the ones you can act on.
  if (missing === "image") {
    filtered = filtered.filter((p) => !p.imageUrl && !(p.imageUrls?.length));
  } else if (missing === "credit") {
    filtered = filtered.filter((p) => !p.designer || p.designer === "Unknown");
  } else if (missing === "edition") {
    filtered = filtered.filter((p) => !p.editions?.[0]?.runSize);
  }
  const enriched = await enrichPosters(filtered);

  // Collection payoff — the immediate personal benefit of cataloging:
  // totals, breakdowns, and Founding Collector progress. All derived from
  // the archive; no extra queries.
  const owned = archive.posters.filter((p) => posterState(p) !== "want");
  const wanted = archive.posters.filter((p) => posterState(p) === "want");
  const forTrade = archive.posters.filter((p) =>
    ["trade", "sell"].includes(posterState(p)),
  );
  const signedCount = owned.filter((p) => p.editions?.[0]?.signed).length;
  const variantCount = owned.filter((p) => p.variantOf).length;
  const topOf = (entries: Map<string, number>, n = 3) =>
    [...entries.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const byBand = new Map<string, number>();
  const byDesigner = new Map<string, number>();
  for (const p of owned) {
    const show = p.showId ? findShow(archive, p.showId) : undefined;
    const band = show ? findArtist(archive, show.artistId)?.name : undefined;
    if (band) byBand.set(band, (byBand.get(band) ?? 0) + 1);
    if (p.designer && p.designer !== "Unknown")
      byDesigner.set(p.designer, (byDesigner.get(p.designer) ?? 0) + 1);
  }
  const FOUNDING_GOAL = 10;
  const isFoundingCollector = owned.length >= FOUNDING_GOAL;
  const showStats =
    !archive.demo && !stateFilter && !missing && archive.posters.length > 0;

  // Persist the Founding Collector badge the moment the goal is reached —
  // permanent even if the collection later shrinks. Idempotent + guarded
  // (no-op until migration 0014 runs).
  if (isFoundingCollector && archive.userId) {
    const db = getDb();
    if (db) {
      try {
        await db
          .insert(t.userBadges)
          .values({ userId: archive.userId, badge: "founding_collector" })
          .onConflictDoNothing();
      } catch {
        // user_badge not migrated yet
      }
    }
  }

  // Flatten to serializable props for the client-side rack.
  const rackPosters: RackPoster[] = enriched.map((poster) => {
    const show = poster.showId ? findShow(archive, poster.showId) : undefined;
    const artist = show ? findArtist(archive, show.artistId) : undefined;
    const edition = poster.editions[0];
    return {
      id: poster.id,
      title: poster.title,
      designer: poster.designer,
      year: poster.year,
      gradient: poster.gradient,
      imageUrl: poster.resolvedImageUrl,
      owned: poster.owned,
      editionSummary: edition
        ? edition.runSize
          ? `${edition.name} · ed. ${edition.runSize}`
          : edition.name
        : undefined,
      showHref: show ? `/shows/${show.id}` : undefined,
      showLabel: show
        ? `${artist?.name ?? "Show"} · ${formatShortDate(show.date)}`
        : undefined,
      editHref: archive.demo ? undefined : `/edit/poster/${poster.id}`,
    };
  });

  return (
    <div>
      <PageHeader
        title="My Posters"
        subtitle={
          missing
            ? `Your posters missing ${missing === "image" ? "images" : missing === "credit" ? "an artist credit" : "edition details"} — open one to fill it in.`
            : stateFilter
              ? `Filtered: ${stateFilter === "want" ? "wantlist" : stateFilter === "trade" ? "for trade" : stateFilter === "sell" ? "for sale" : "in collection"} — fan through the rack.`
              : "Your flat file — fan through the collection like a poster rack."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {archive.userId ? (
              <ShareButton path={`/u/${archive.userId}`} label="Share" />
            ) : null}
            <Button asChild>
              <Link href="/add/poster">
                <Plus />
                Add poster
              </Link>
            </Button>
          </div>
        }
      />
      {showStats ? (
        <section className="mb-6 space-y-3">
          {/* Collection at a glance */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                [String(owned.length), "posters owned", "/my-posters"],
                [String(wanted.length), "wanted", "/my-posters?state=want"],
                [String(forTrade.length), "for trade or sale", "/my-posters?state=trade"],
                [String(signedCount), "signed", null],
                [String(variantCount), "variants", null],
              ] as Array<[string, string, string | null]>
            ).map(([value, label, href]) => {
              const tile = (
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-white/20">
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              );
              return href ? (
                <Link key={label} href={href}>
                  {tile}
                </Link>
              ) : (
                <div key={label}>{tile}</div>
              );
            })}
          </div>

          {/* Collection by band / poster artist — quiet, editorial */}
          {byBand.size > 0 || byDesigner.size > 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {byBand.size > 0 ? (
                <>
                  Most collected:{" "}
                  <span className="text-foreground">
                    {topOf(byBand)
                      .map(([name, n]) => `${name} (${n})`)
                      .join(" · ")}
                  </span>
                </>
              ) : null}
              {byBand.size > 0 && byDesigner.size > 0 ? " — " : ""}
              {byDesigner.size > 0 ? (
                <>
                  top poster artists:{" "}
                  <span className="text-foreground">
                    {topOf(byDesigner)
                      .map(([name, n]) => `${name} (${n})`)
                      .join(" · ")}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}

          {/* Founding Collections — permanent early-collector recognition */}
          {isFoundingCollector ? (
            <p className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary">
                <Award className="h-3.5 w-3.5" />
                Founding Collector
              </span>
              <span className="text-xs text-muted-foreground">
                One of the first archives on Concert Collect.
              </span>
            </p>
          ) : (
            <div className="max-w-md rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award className="h-4 w-4 text-primary" />
                  Founding Collections
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {owned.length} of {FOUNDING_GOAL}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (owned.length / FOUNDING_GOAL) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Add {FOUNDING_GOAL - owned.length} more poster
                {FOUNDING_GOAL - owned.length === 1 ? "" : "s"} to become a
                Founding Collector.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {rackPosters.length === 0 ? (
        <EmptyState
          icon={Frame}
          title="No posters cataloged"
          description="Add show prints with designer, edition, and technique details."
          actionLabel="Add poster"
          actionHref="/add/poster"
        />
      ) : (
        <PosterRack
          posters={rackPosters}
          collections={archive.collections.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
