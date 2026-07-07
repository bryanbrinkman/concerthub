import { ArrowLeftRight, Frame, Handshake, Mail } from "lucide-react";
import { eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { GradientKey } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PosterArt } from "@/components/gradient-art";
import { PosterGallery } from "@/components/poster-gallery";
import { EmptyState } from "@/components/empty-state";
import { toggleInterestAction } from "./actions";

export const metadata = { title: "Trading Post" };

/**
 * The community surface: every collector's owned prints in one gallery.
 * Others can express interest; owners see who raised a hand (name + email)
 * and arrange sales/trades off-site. No payments happen here.
 */
export default async function PrintsPage() {
  const db = getDb();
  const viewerId = await currentUserId();

  // Guarded so a missing table (migration not yet applied) degrades to an
  // empty gallery instead of a crash.
  async function safely<T>(query: PromiseLike<T>, fallback: T): Promise<T> {
    try {
      return await query;
    } catch (error) {
      console.warn("[prints] query failed:", error);
      return fallback;
    }
  }

  const posterRows = db
    ? await safely(
        db
          .select({
            id: t.posters.id,
            title: t.posters.title,
            designer: t.posters.designer,
            year: t.posters.year,
            imageUrl: t.posters.imageUrl,
            imageUrls: t.posters.imageUrls,
            gradient: t.posters.gradient,
            ownerId: t.posters.userId,
            ownerName: t.users.name,
            showDate: t.shows.date,
            artistName: t.artists.name,
            venueName: t.venues.name,
          })
          .from(t.posters)
          .innerJoin(t.users, eq(t.posters.userId, t.users.id))
          .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
          .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
          .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
          .where(eq(t.posters.owned, true)),
        [],
      )
    : [];

  const interestRows = db
    ? await safely(
        db
          .select({
            posterId: t.posterInterests.posterId,
            userId: t.posterInterests.userId,
            name: t.users.name,
            email: t.users.email,
          })
          .from(t.posterInterests)
          .innerJoin(t.users, eq(t.posterInterests.userId, t.users.id)),
        [],
      )
    : [];

  const interestByPoster = new Map<string, typeof interestRows>();
  for (const row of interestRows) {
    const list = interestByPoster.get(row.posterId) ?? [];
    list.push(row);
    interestByPoster.set(row.posterId, list);
  }

  return (
    <div>
      <PageHeader
        title="Trading Post"
        subtitle="Every collector's prints in one place. Raise a hand on a grail — owners get your contact info and you work it out off-site."
      />

      {posterRows.length === 0 ? (
        <EmptyState
          icon={Frame}
          title="No prints on the post yet"
          description={
            db
              ? "As collectors add posters to their archives, they show up here."
              : "The Trading Post needs the database configured."
          }
          actionLabel={db ? "Add a poster" : undefined}
          actionHref={db ? "/add/poster" : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {posterRows.map((poster) => {
            const interests = interestByPoster.get(poster.id) ?? [];
            const isOwner = viewerId != null && poster.ownerId === viewerId;
            const viewerInterested =
              viewerId != null &&
              interests.some((i) => i.userId === viewerId);

            const galleryImages = [
              ...(poster.imageUrl ? [poster.imageUrl] : []),
              ...(poster.imageUrls ?? []),
            ];

            return (
              <div key={poster.id} className="flex flex-col">
                {galleryImages.length > 0 ? (
                  <PosterGallery
                    images={galleryImages}
                    title={poster.title}
                    className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)]"
                  />
                ) : (
                  <PosterArt
                    gradient={(poster.gradient ?? "midnight") as GradientKey}
                    title={poster.title}
                    subtitle={poster.designer}
                    footer={String(poster.year)}
                    className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)]"
                  />
                )}
                <div className="mt-2.5 flex-1 space-y-1 px-0.5">
                  <p className="truncate text-sm font-medium">{poster.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {poster.designer} · {poster.year}
                  </p>
                  {poster.artistName ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {poster.artistName}
                      {poster.venueName ? ` · ${poster.venueName}` : ""}
                      {poster.showDate
                        ? ` · ${formatShortDate(poster.showDate)}`
                        : ""}
                    </p>
                  ) : null}
                  <p className="truncate text-xs text-muted-foreground">
                    From{" "}
                    <span className="text-foreground/80">
                      {poster.ownerName ?? "a collector"}
                    </span>
                    &apos;s collection
                  </p>
                </div>

                <div className="mt-2 space-y-2 px-0.5">
                  {interests.length > 0 ? (
                    <Badge variant="secondary">
                      <Handshake />
                      {interests.length}{" "}
                      {interests.length === 1 ? "collector" : "collectors"}{" "}
                      interested
                    </Badge>
                  ) : null}

                  {isOwner ? (
                    interests.length > 0 ? (
                      <details className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs">
                        <summary className="cursor-pointer font-medium">
                          See who&apos;s interested
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {interests.map((interest) => (
                            <li
                              key={interest.userId}
                              className="flex items-center gap-1.5"
                            >
                              <span className="truncate">
                                {interest.name ?? "Collector"}
                              </span>
                              {interest.email ? (
                                <a
                                  href={`mailto:${interest.email}?subject=${encodeURIComponent(`Your interest in "${poster.title}" on Concert Collect`)}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail className="h-3 w-3" />
                                  {interest.email}
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Your print — interest shows up here.
                      </p>
                    )
                  ) : viewerId ? (
                    <form action={toggleInterestAction}>
                      <input type="hidden" name="posterId" value={poster.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={viewerInterested ? "secondary" : "default"}
                        className="w-full"
                      >
                        <ArrowLeftRight />
                        {viewerInterested
                          ? "Interested ✓ — withdraw"
                          : "I'm interested"}
                      </Button>
                    </form>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled
                      title="Sign in to express interest"
                    >
                      Sign in to express interest
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 max-w-2xl text-xs text-muted-foreground">
        Concert Collect doesn&apos;t handle sales or payments. Expressing
        interest shares your name and email with the print&apos;s owner so
        the two of you can arrange a sale or trade off-site.
      </p>
    </div>
  );
}
