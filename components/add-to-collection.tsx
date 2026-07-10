"use client";

import * as React from "react";
import Link from "next/link";
import { Check, FolderPlus, Loader2, Plus } from "lucide-react";

import { addPosterToCollectionAction } from "@/app/collection-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CollectionOption {
  id: string;
  name: string;
}

/**
 * Add a poster to one of the viewer's collections — a small popover that
 * calls the (owner-scoped) server action per pick. Only render for posters
 * the viewer owns; the action ignores anyone else's posters anyway.
 */
export function AddToCollection({
  posterId,
  collections,
  size = "sm",
}: {
  posterId: string;
  collections: CollectionOption[];
  size?: "default" | "sm";
}) {
  const [added, setAdded] = React.useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function add(collectionId: string) {
    if (added.has(collectionId) || pendingId) return;
    setPendingId(collectionId);
    try {
      const fd = new FormData();
      fd.set("collectionId", collectionId);
      fd.set("posterId", posterId);
      await addPosterToCollectionAction(fd);
      setAdded((s) => new Set(s).add(collectionId));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <details className="group relative">
      <summary
        className={cn(
          buttonVariants({ variant: "secondary", size }),
          "list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <FolderPlus />
        Add to collection
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-60 rounded-lg border border-border bg-card p-1 shadow-xl">
        {collections.length === 0 ? (
          <Link
            href="/collections"
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Create your first collection →
          </Link>
        ) : (
          <>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Add to…
            </p>
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={added.has(c.id) || pendingId === c.id}
                onClick={() => void add(c.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-60"
              >
                <span className="min-w-0 truncate">{c.name}</span>
                {pendingId === c.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : added.has(c.id) ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : null}
              </button>
            ))}
            <Link
              href="/collections"
              className="mt-0.5 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-primary transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              New collection
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
