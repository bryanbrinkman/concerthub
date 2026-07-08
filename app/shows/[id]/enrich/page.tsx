import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ExternalLink,
  LogIn,
  ShoppingBag,
  X,
} from "lucide-react";
import { eq } from "drizzle-orm";

import { findShow, findVenue, getArchive, showTitleFor } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PROVIDERS } from "@/lib/enrich/providers";
import { missingEnv } from "@/lib/enrich/types";
import { formatShortDate } from "@/lib/utils";
import {
  approveAllPerformersAction,
  approvePerformerAction,
  approvePosterAction,
  approveVideoAction,
  rejectCandidateAction,
} from "@/app/enrich-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EnrichRunner } from "@/components/enrich-runner";

export const metadata = { title: "Enrich show" };

type Candidate = typeof t.dataCandidates.$inferSelect;

function ConfidenceBadge({ candidate }: { candidate: Candidate }) {
  const tone =
    candidate.confidence >= 75
      ? "text-emerald-300 border-emerald-500/40"
      : candidate.confidence >= 45
        ? "text-amber-300 border-amber-500/40"
        : "text-muted-foreground border-border";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${tone}`}
      title={(candidate.reasons ?? []).join(" · ")}
    >
      {candidate.confidence}% match
    </span>
  );
}

function Reasons({ candidate }: { candidate: Candidate }) {
  const reasons = (candidate.reasons ?? []).slice(0, 3);
  if (reasons.length === 0) return null;
  return (
    <p className="truncate text-[11px] text-muted-foreground">
      {reasons.join(" · ")}
    </p>
  );
}

function RejectButton({ candidateId, label = "Not this show" }: { candidateId: string; label?: string }) {
  return (
    <form action={rejectCandidateAction}>
      <input type="hidden" name="candidateId" value={candidateId} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
        <X />
        {label}
      </Button>
    </form>
  );
}

export default async function EnrichShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to enrich shows"
        description="Enrichment runs against shows in your own archive — sign in or create an account from the sidebar first."
      />
    );
  }

  const show = findShow(archive, id);
  if (!show) notFound();
  const venue = findVenue(archive, show.venueId);
  const title = showTitleFor(archive, show);

  const db = getDb();
  let pending: Candidate[] = [];
  let confirmedCount = 0;
  if (db) {
    try {
      const rows = await db
        .select()
        .from(t.dataCandidates)
        .where(eq(t.dataCandidates.showId, show.id));
      pending = rows
        .filter((c) => c.status === "pending")
        .sort((a, b) => b.confidence - a.confidence);
      confirmedCount = rows.filter(
        (c) => c.status === "user_confirmed" || c.status === "auto_accepted",
      ).length;
    } catch (error) {
      console.warn("[enrich] candidate read failed (migration pending?):", error);
    }
  }

  const performers = pending.filter((c) => c.kind === "performer");
  const posters = pending.filter((c) => c.kind === "poster_image");
  const videos = pending.filter((c) => c.kind === "video");
  const listings = pending.filter((c) => c.kind === "marketplace");
  const hasAny = pending.length > 0;

  const providers = PROVIDERS.map((p) => ({
    name: p.name,
    label: p.label,
    missing: missingEnv(p),
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/shows/${show.id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to the show
      </Link>

      <PageHeader
        title={`Enriching ${title}`}
        subtitle={`${venue?.name ?? ""} · ${formatShortDate(show.date)} — candidates are suggestions with provenance; nothing merges into the archive until you approve it.${confirmedCount > 0 ? ` ${confirmedCount} already accepted.` : ""}`}
      />

      <EnrichRunner showId={show.id} providers={providers} autoStart={!hasAny} />

      {/* Suggested lineup */}
      {performers.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Suggested lineup{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {performers.length} performer{performers.length === 1 ? "" : "s"} found
              </span>
            </h2>
            <form action={approveAllPerformersAction}>
              <input type="hidden" name="showId" value={show.id} />
              <Button type="submit" size="sm">
                <Check />
                Add all {performers.length}
              </Button>
            </form>
          </div>
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            {performers.map((candidate) => {
              const value = candidate.value as {
                name?: string;
                songCount?: number;
                setlistFmUrl?: string;
              };
              return (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {value.name}
                      {value.songCount ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {value.songCount} songs
                        </span>
                      ) : null}
                    </p>
                    <Reasons candidate={candidate} />
                  </div>
                  <ConfidenceBadge candidate={candidate} />
                  <form action={approvePerformerAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <Check />
                      Add
                    </Button>
                  </form>
                  <RejectButton candidateId={candidate.id} label="" />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Possible posters */}
      {posters.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Possible posters found for this show{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {posters.length} candidate{posters.length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {posters.map((candidate) => {
              const value = candidate.value as {
                imageUrl?: string;
                domain?: string;
                title?: string;
              };
              return (
                <Card key={candidate.id} className="overflow-hidden">
                  {value.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value.imageUrl}
                      alt={value.title ?? "Poster candidate"}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="aspect-[3/4] w-full bg-black/40 object-contain"
                    />
                  ) : null}
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <ConfidenceBadge candidate={candidate} />
                      <span className="truncate text-[11px] text-muted-foreground">
                        {value.domain}
                      </span>
                    </div>
                    <Reasons candidate={candidate} />
                    <div className="flex flex-wrap gap-1.5">
                      <form action={approvePosterAction}>
                        <input type="hidden" name="candidateId" value={candidate.id} />
                        <Button type="submit" size="sm">
                          <Check />
                          Confirm as poster
                        </Button>
                      </form>
                      <RejectButton candidateId={candidate.id} />
                      {candidate.sourceUrl ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">
                            <ExternalLink />
                            Source
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Videos */}
      {videos.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Videos from this show{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {videos.length} found
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            {videos.map((candidate) => {
              const value = candidate.value as {
                title?: string;
                channel?: string;
                thumbnail?: string;
              };
              return (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                >
                  {value.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-14 w-24 shrink-0 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{value.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {value.channel}
                    </p>
                    <Reasons candidate={candidate} />
                  </div>
                  <ConfidenceBadge candidate={candidate} />
                  <form action={approveVideoAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <Check />
                      Attach
                    </Button>
                  </form>
                  <RejectButton candidateId={candidate.id} label="" />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Marketplace — references only, never canonical records */}
      {listings.length > 0 ? (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            On the Market
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Active eBay listings that look related — external references,
            not archive records. Listing imagery stays on eBay.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {listings.map((candidate) => {
              const value = candidate.value as {
                title?: string;
                url?: string;
                image?: string;
                price?: string;
                currency?: string;
                listingType?: string;
              };
              return (
                <Card key={candidate.id} className="overflow-hidden">
                  {value.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="aspect-square w-full bg-black/40 object-contain"
                    />
                  ) : null}
                  <CardContent className="space-y-1.5 p-3">
                    <p className="line-clamp-2 text-xs font-medium">{value.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {value.price ? `${value.currency === "USD" ? "$" : `${value.currency ?? ""} `}${value.price}` : ""}
                      </p>
                      <Badge variant="outline">{value.listingType ?? "Listing"}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Last checked {formatShortDate(candidate.fetchedAt.toISOString().slice(0, 10))}
                    </p>
                    <div className="flex gap-1.5">
                      {value.url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={value.url} target="_blank" rel="noreferrer">
                            <ExternalLink />
                            View listing
                          </a>
                        </Button>
                      ) : null}
                      <RejectButton candidateId={candidate.id} label="Hide" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          No pending candidates — run enrichment above, or everything found
          so far has been reviewed.
        </p>
      ) : null}
    </div>
  );
}
