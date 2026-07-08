import Link from "next/link";
import { ArrowLeftRight, Frame, Heart, Library, Plus, Tag } from "lucide-react";

import { posterState } from "@/lib/archive";

import { getArchive } from "@/lib/archive";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const archive = await getArchive();
  const { collections } = archive;
  const stateCount = (state: string) =>
    archive.posters.filter((p) => posterState(p) === state).length;
  const smart = [
    { label: "My Posters", icon: Frame, count: archive.posters.filter((p) => posterState(p) !== "want").length, href: "/posters" },
    { label: "Wantlist", icon: Heart, count: stateCount("want"), href: "/posters?state=want" },
    { label: "For Trade", icon: ArrowLeftRight, count: stateCount("trade"), href: "/posters?state=trade" },
    { label: "For Sale", icon: Tag, count: stateCount("sell"), href: "/posters?state=sell" },
  ];
  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Curated groupings — binders, wishlists, and tour runs."
        actions={
          <Button>
            <Plus />
            New collection
          </Button>
        }
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
          description="Group shows and ephemera into binders, wishlists, or tour runs."
          actionLabel="New collection"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="overflow-hidden transition-colors hover:border-white/20"
            >
              <GradientArt gradient={collection.gradient} className="h-24">
                <div className="flex w-full items-end p-4">
                  <Library className="h-5 w-5 text-white/85" />
                </div>
              </GradientArt>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{collection.name}</p>
                  <Badge variant="secondary">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {collection.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
