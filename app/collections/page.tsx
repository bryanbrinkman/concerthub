import Link from "next/link";
import { ArrowLeftRight, Frame, Heart, Library, LogIn, Tag } from "lucide-react";
import { eq, inArray } from "drizzle-orm";

import { getArchive, posterState } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";
import { NewCollectionForm } from "@/components/new-collection-form";
import { ShareButton } from "@/components/share-button";

export const metadata = { title: "Collections" };

/** Personal page: the viewer's own smart groupings + custom binders. */
export default async function CollectionsPage() {
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to build collections"
        description="Collections are personal groupings of your own archive — binders, wishlists, tour runs. Sign in or create an account from the sidebar first."
      />
    );
  }

  const stateCount = (state: string) =>
    archive.posters.filter((p) => posterState(p) === state).length;
  const smart = [
    { label: "My Posters", icon: Frame, count: archive.posters.filter((p) => posterState(p) !== "want").length, href: "/my-posters" },
    { label: "Wantlist", icon: Heart, count: stateCount("want"), href: "/my-posters?state=want" },
    { label: "For Trade", icon: ArrowLeftRight, count: stateCount("trade"), href: "/my-posters?state=trade" },
    { label: "For Sale", icon: Tag, count: stateCount("sell"), href: "/my-posters?state=sell" },
  ];

  // Live membership: counts + up to 3 cover thumbnails per collection.
  const collections = archive.collections;
  const posterById = new Map(archive.posters.map((p) => [p.id, p]));
  const membership = new Map<string, { count: number; covers: string[] }>();
  const db = getDb();
  if (db && collections.length > 0) {
    try {
      const rows = await db
        .select({
          collectionId: t.collectionPosters.collectionId,
          posterId: t.collectionPosters.posterId,
        })
        .from(t.collectionPosters)
        .where(
          inArray(
            t.collectionPosters.collectionId,
            collections.map((c) => c.id),
          ),
        );
      for (const row of rows) {
        const entry = membership.get(row.collectionId) ?? { count: 0, covers: [] };
        entry.count += 1;
        const img = posterById.get(row.posterId)?.imageUrl;
        if (img && entry.covers.length < 3) entry.covers.push(img);
        membership.set(row.collectionId, entry);
      }
    } catch (error) {
      console.warn("[collections] membership query failed (migration pending?):", error);
    }
  }

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Curated groupings — binders, wishlists, and tour runs."
        actions={<NewCollectionForm />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {smart.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card className="h-full transition-colors hover:border-white/20">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {collections.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No collections yet"
          description="Create a collection, then add posters to it from any poster record. Group your prints into binders, wishlists, or tour runs."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const info = membership.get(collection.id) ?? { count: 0, covers: [] };
            return (
              <Card
                key={collection.id}
                className="flex h-full flex-col overflow-hidden transition-colors hover:border-white/20"
              >
                <Link href={`/collections/${collection.id}`} className="block">
                  {info.covers.length > 0 ? (
                    <div className="flex h-24 gap-0.5 bg-black/40">
                      {info.covers.map((cover) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={cover}
                          src={cover}
                          alt=""
                          loading="lazy"
                          className="h-full flex-1 object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <GradientArt gradient={collection.gradient} className="h-24">
                      <div className="flex w-full items-end p-4">
                        <Library className="h-5 w-5 text-white/85" />
                      </div>
                    </GradientArt>
                  )}
                  <CardContent className="space-y-2 p-5 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{collection.name}</p>
                      <Badge variant="secondary">
                        {info.count} {info.count === 1 ? "poster" : "posters"}
                      </Badge>
                    </div>
                    {collection.description ? (
                      <p className="text-xs text-muted-foreground">
                        {collection.description}
                      </p>
                    ) : null}
                  </CardContent>
                </Link>
                <div className="mt-auto flex items-center gap-3 px-5 pb-4">
                  <ShareButton path={`/c/${collection.id}`} label="Share" />
                  <Link
                    href={`/collections/${collection.id}`}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
