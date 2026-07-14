import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, LogIn, Plus, Trash2, X } from "lucide-react";
import { eq } from "drizzle-orm";

import { getArchive } from "@/lib/archive";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import {
  addPosterToCollectionAction,
  deleteCollectionAction,
  removePosterFromCollectionAction,
} from "@/app/collection-actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ShareButton } from "@/components/share-button";

export const metadata = { title: "Collection" };

export default async function CollectionDetailPage({
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
        title="Sign in to view collections"
        description="Collections are personal — sign in or create an account from the sidebar first."
      />
    );
  }

  const collection = archive.collections.find((c) => c.id === id);
  if (!collection) notFound();

  // Live membership from the join table.
  let memberIds: string[] = [];
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select({ posterId: t.collectionPosters.posterId })
        .from(t.collectionPosters)
        .where(eq(t.collectionPosters.collectionId, id));
      memberIds = rows.map((r) => r.posterId);
    } catch (error) {
      console.warn("[collection] membership query failed (migration pending?):", error);
    }
  }
  const memberSet = new Set(memberIds);
  const members = archive.posters.filter((p) => memberSet.has(p.id));
  const available = archive.posters.filter((p) => !memberSet.has(p.id));

  return (
    <div className="space-y-6">
      <Link
        href="/collections"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Collections
      </Link>

      <PageHeader
        title={collection.name}
        subtitle={
          collection.description ||
          `${members.length} ${members.length === 1 ? "poster" : "posters"} in this collection.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ShareButton path={`/c/${collection.id}`} label="Share collection" />
            <form action={deleteCollectionAction}>
              <input type="hidden" name="collectionId" value={collection.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
                Delete collection
              </Button>
            </form>
          </div>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nothing in this collection yet"
          description="Add posters from your archive below."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {members.map((poster) => (
            <div key={poster.id} className="group relative">
              <Link href={`/posters/${poster.id}`} className="block">
                {poster.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster.imageUrl}
                    alt={poster.title}
                    loading="lazy"
                    className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                    {poster.title}
                  </div>
                )}
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {poster.title} · {poster.year}
                </p>
              </Link>
              <form action={removePosterFromCollectionAction} className="absolute right-1.5 top-1.5">
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="posterId" value={poster.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${poster.title}`}
                  title="Remove from collection"
                  className="cursor-pointer rounded-full bg-black/60 p-1.5 text-white/80 opacity-0 transition-opacity hover:bg-black/80 hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Add posters from the rest of your archive */}
      {available.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">Add posters</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {available.map((poster) => (
              <form
                key={poster.id}
                action={addPosterToCollectionAction}
                className="group relative"
              >
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="posterId" value={poster.id} />
                <button
                  type="submit"
                  title={`Add ${poster.title}`}
                  className="block w-full cursor-pointer text-left"
                >
                  {poster.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster.imageUrl}
                      alt={poster.title}
                      loading="lazy"
                      className="aspect-[3/4] w-full rounded-md border border-white/10 bg-black/40 object-contain opacity-70 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-border bg-secondary p-1 text-center font-mono text-[9px] uppercase text-muted-foreground">
                      {poster.title}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
