import Link from "next/link";
import { CalendarDays, ChevronLeft, MapPin } from "lucide-react";

import type { GradientKey } from "@/lib/types";
import type { PublicShow } from "@/lib/public";
import { BILLING_ROLE_LABELS } from "@/lib/billing";
import { formatDateRange, formatShowDate } from "@/lib/utils";
import {
  breadcrumbJsonLd,
  showJsonLd,
} from "@/lib/seo";
import { PosterArt } from "@/components/gradient-art";
import { TicketArt } from "@/components/ticket-art";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/json-ld";

/**
 * Read-only, fully server-rendered public view of a show/event — shown to
 * logged-out visitors, crawlers, and anyone viewing a show that isn't in
 * their own archive. All identifying content (title, performers, venue,
 * date, location) is in the initial HTML, plus MusicEvent + breadcrumb
 * JSON-LD. Owners get the richer interactive page instead.
 */
export function PublicShowView({ show }: { show: PublicShow }) {
  const isFestival =
    show.eventType === "festival" || show.eventType === "festival_day";
  const headliners = show.performers.filter(
    (p) => p.billingRole === "headliner" || p.billingRole === "co_headliner",
  );
  const title =
    show.name ??
    (headliners.length > 0
      ? headliners.map((p) => p.name).join(" + ")
      : show.primaryArtistName);
  const dateLabel = show.endDate
    ? formatDateRange(show.date, show.endDate)
    : formatShowDate(show.date);
  const path = `/shows/${show.id}`;

  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          showJsonLd({
            title,
            path,
            date: show.date,
            endDate: show.endDate,
            isFestival,
            performers: show.performers.map((p) => p.name),
            venueName: show.venueName,
            city: show.venueCity,
            region: show.venueRegion,
            country: show.venueCountry,
            image: show.posterImage,
          }),
          breadcrumbJsonLd([
            { name: "Shows", path: "/shows" },
            { name: title, path },
          ]),
        ]}
      />

      <Link
        href="/shows"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Show Database
      </Link>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[250px] lg:mx-0">
          {show.posterImage ? (
            <PosterArt
              gradient="midnight"
              imageUrl={show.posterImage}
              title={title}
            />
          ) : (
            <TicketArt
              seedId={show.id}
              gradient="midnight"
              artist={title}
              venue={show.venueName}
              cityLine={`${show.venueCity}${show.venueRegion ? `, ${show.venueRegion}` : ""}`}
              dateLine={dateLabel}
            />
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {show.name && headliners.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Featuring {headliners.map((p) => p.name).join(", ")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <Link
                  href={`/venues/${show.venueId}`}
                  className="font-medium hover:text-primary"
                >
                  {show.venueName}
                </Link>
                <br />
                <span className="text-muted-foreground">
                  {show.venueCity}
                  {show.venueRegion ? `, ${show.venueRegion}` : ""}
                  {show.venueCountry ? `, ${show.venueCountry}` : ""}
                </span>
              </span>
            </p>
            <p className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{dateLabel}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Lineup — crawlable performer links */}
      {show.performers.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            {isFestival ? "Lineup" : "On the bill"}
          </h2>
          <ul className="space-y-1">
            {show.performers.map((performer) => {
              const roleLabel =
                performer.billingRole === "headliner" ||
                performer.billingRole === "festival_performer" ||
                performer.billingRole === "unknown"
                  ? null
                  : BILLING_ROLE_LABELS[performer.billingRole];
              return (
                <li key={performer.artistId}>
                  <Link
                    href={`/artists/${performer.artistId}`}
                    className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                  >
                    <span className="font-medium group-hover:text-primary">
                      {performer.name}
                    </span>
                    {roleLabel ? (
                      <Badge variant="secondary">{roleLabel}</Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {show.posterId ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Poster</h2>
          <Link
            href={`/posters/${show.posterId}`}
            className="inline-block w-40 rounded-lg border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={show.posterImage}
              alt={`${title} concert poster`}
              className="aspect-[3/4] w-full rounded-lg bg-black/40 object-contain"
            />
          </Link>
        </section>
      ) : null}

      <p className="border-t border-border pt-5 text-sm text-muted-foreground">
        Were you at this show?{" "}
        <Link href="/login?mode=signup" className="text-primary hover:underline">
          Start your archive
        </Link>{" "}
        to add your poster, ticket, photos, and memories.
      </p>
    </div>
  );
}
