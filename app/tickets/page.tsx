import Link from "next/link";
import { Ticket, Upload } from "lucide-react";

import { ephemera, getArtist, getShow, getVenue } from "@/lib/data";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Tickets" };

export default function TicketsPage() {
  const tickets = ephemera.filter((e) => e.kind === "ticket");

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle="The stub shoebox — every torn corner tells a story."
        actions={
          <Button>
            <Upload />
            Upload ticket
          </Button>
        }
      />
      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No ticket stubs yet"
          description="Scan or photograph your stubs to pin them to their shows."
          actionLabel="Upload ticket"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => {
            const show = getShow(ticket.showId);
            const artist = show ? getArtist(show.artistId) : undefined;
            const venue = show ? getVenue(show.venueId) : undefined;
            return (
              <Link
                key={ticket.id}
                href={show ? `/shows/${show.id}` : "/shows"}
                className="group block"
              >
                {/* stub-styled card: art on the left, perforation, details right */}
                <div className="flex overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-white/20">
                  <GradientArt
                    gradient={ticket.gradient}
                    imageUrl={ticket.imageUrl}
                    imageAlt={ticket.title}
                    className="w-20 shrink-0"
                  >
                    {ticket.imageUrl ? null : (
                      <div className="flex w-full items-center justify-center">
                        <Ticket className="h-6 w-6 text-white/85" />
                      </div>
                    )}
                  </GradientArt>
                  <div className="w-px shrink-0 self-stretch border-l border-dashed border-border" />
                  <div className="min-w-0 flex-1 p-4">
                    <p className="truncate text-sm font-semibold uppercase tracking-wide">
                      {artist?.name ?? "Unknown artist"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {venue?.name}
                      {show ? ` · ${formatShortDate(show.date)}` : ""}
                    </p>
                    {ticket.detail ? (
                      <p className="mt-2 truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {ticket.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
