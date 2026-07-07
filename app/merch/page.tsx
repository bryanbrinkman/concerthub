import Link from "next/link";
import { Shirt, Upload } from "lucide-react";

import { findArtist, findShow, getArchive } from "@/lib/archive";
import { formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Merch" };

export default async function MerchPage() {
  const archive = await getArchive();
  const merch = archive.ephemera.filter(
    (e) => e.kind === "apparel" || e.kind === "other",
  );

  return (
    <div>
      <PageHeader
        title="Merch"
        subtitle="Tees, hats, and the rest of the merch-table damage."
        actions={
          <Button asChild>
            <Link href="/add/ephemera?kind=apparel">
              <Upload />
              Add merch
            </Link>
          </Button>
        }
      />
      {merch.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="No merch archived"
          description="Add the tour tee before it fades — size, print, and which show it came from."
          actionLabel="Add merch"
          actionHref="/add/ephemera?kind=apparel"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {merch.map((item) => {
            const show = findShow(archive, item.showId);
            const artist = show ? findArtist(archive, show.artistId) : undefined;
            return (
              <Link
                key={item.id}
                href={show ? `/shows/${show.id}` : "/shows"}
                className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-white/20"
              >
                <GradientArt
                  gradient={item.gradient}
                  imageUrl={item.imageUrl}
                  imageAlt={item.title}
                  className="aspect-square"
                >
                  {item.imageUrl ? null : (
                    <div className="flex w-full items-center justify-center">
                      <Shirt className="h-8 w-8 text-white/85" />
                    </div>
                  )}
                </GradientArt>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {artist?.name}
                    {show ? ` · ${formatShortDate(show.date)}` : ""}
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
