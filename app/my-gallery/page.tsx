import { Frame } from "lucide-react";
import { eq } from "drizzle-orm";

import { getArchive } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { enrichPosters } from "@/lib/expressobeans";
import { parsePosterWidthIn } from "@/lib/utils";
import { saveGalleryAction } from "@/app/gallery-actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ShareButton } from "@/components/share-button";
import {
  GalleryWall,
  type WallPosterItem,
  type WallSlot,
} from "@/components/gallery-wall";

export const metadata = { title: "My Gallery" };

/**
 * The gallery wall editor: hang your collection on a wall, drag it
 * around, save the arrangement. The saved wall also renders on your
 * public profile.
 */
export default async function MyGalleryPage() {
  const archive = await getArchive();
  const enriched = await enrichPosters(archive.posters);

  const items: WallPosterItem[] = enriched
    .filter((poster) => poster.resolvedImageUrl)
    .map((poster) => ({
      posterId: poster.id,
      imageUrl: poster.resolvedImageUrl as string,
      title: poster.title,
      widthIn: parsePosterWidthIn(poster.editions[0]?.dimensions),
    }));

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Frame}
        title="Nothing to hang yet"
        description="The gallery wall shows posters that have artwork. Add prints with images and they'll appear here, ready to arrange."
        actionLabel="Add a poster"
        actionHref="/add/poster"
      />
    );
  }

  // Saved layout (signed-in users).
  let initialLayout: WallSlot[] | undefined;
  const db = getDb();
  if (db && archive.userId) {
    try {
      const [row] = await db
        .select({ layout: t.galleryWalls.layout })
        .from(t.galleryWalls)
        .where(eq(t.galleryWalls.userId, archive.userId));
      initialLayout = row?.layout;
    } catch (error) {
      console.warn("[gallery] layout read failed (migration pending?):", error);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Gallery"
        subtitle={
          archive.demo
            ? "Arrange the demo collection — sign in to build and save your own wall."
            : "Your collection, hung salon-style. Drag to arrange, tap to resize, save when it feels right — it shows on your public profile too."
        }
        actions={
          archive.userId ? (
            <ShareButton path={`/u/${archive.userId}`} label="Share my wall" />
          ) : undefined
        }
      />
      <GalleryWall
        items={items}
        initialLayout={initialLayout}
        editable
        onSave={archive.demo ? undefined : saveGalleryAction}
      />
    </div>
  );
}
