import { Library, Plus } from "lucide-react";

import { collections } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Collections" };

export default function CollectionsPage() {
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
