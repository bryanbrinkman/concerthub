import Link from "next/link";
import {
  CreditCard,
  Image as ImageIcon,
  Package,
  Plus,
  Shirt,
  Ticket,
  Trash2,
  Upload,
  Watch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { deleteEphemeraAction } from "@/app/manage-actions";

import type { EphemeraItem, EphemeraKind } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

const KIND_ICONS: Record<EphemeraKind, LucideIcon> = {
  ticket: Ticket,
  laminate: CreditCard,
  wristband: Watch,
  poster: ImageIcon,
  apparel: Shirt,
  other: Package,
};

/** "My Ephemera" — the physical stuff saved from a show. */
export function EphemeraGrid({
  items,
  addHref,
  canEdit,
}: {
  items: EphemeraItem[];
  /** Link to the add-ephemera form; when unset the CTA is decorative. */
  addHref?: string;
  /** Viewer owns this archive — show delete controls. */
  canEdit?: boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No artifacts yet"
        description="No artifacts have been added yet. Add a ticket, shirt, photo, setlist, or memory from this show."
        actionLabel="Add artifacts"
        actionHref={addHref}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>My Ephemera</CardTitle>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind];
          return (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-secondary/40 transition-colors hover:border-white/20"
            >
              {canEdit ? (
                <form
                  action={deleteEphemeraAction}
                  className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${item.title}`}
                    title="Delete"
                    className="cursor-pointer rounded-full bg-black/60 p-1.5 text-white/80 transition-colors hover:bg-black/80 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : null}
              <GradientArt
                gradient={item.gradient}
                imageUrl={item.imageUrl}
                imageAlt={item.title}
                className="aspect-square"
              >
                {item.imageUrl ? null : (
                  <div className="flex w-full items-center justify-center">
                    <Icon className="h-6 w-6 text-white/70 drop-shadow" />
                  </div>
                )}
              </GradientArt>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {item.detail}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        {/* upload slot */}
        {addHref ? (
          <Link
            href={addHref}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="px-2 text-center text-[11px]">Upload ephemera</span>
          </Link>
        ) : (
          <button
            type="button"
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="px-2 text-center text-[11px]">Upload ephemera</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
