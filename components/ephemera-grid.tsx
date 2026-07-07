import {
  CreditCard,
  Image as ImageIcon,
  Package,
  Plus,
  Shirt,
  Ticket,
  Upload,
  Watch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
export function EphemeraGrid({ items }: { items: EphemeraItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No ephemera yet"
        description="Ticket stubs, wristbands, laminates, posters — scan or photograph what you kept."
        actionLabel="Upload ephemera"
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
              className="group overflow-hidden rounded-xl border border-border bg-secondary/40 transition-colors hover:border-primary/40"
            >
              <GradientArt gradient={item.gradient} className="aspect-square">
                <div className="flex w-full items-center justify-center">
                  <Icon className="h-7 w-7 text-white/80 drop-shadow" />
                </div>
              </GradientArt>
              <div className="p-2.5">
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
        <button
          type="button"
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
          <span className="px-2 text-center text-[11px]">Upload ephemera</span>
        </button>
      </CardContent>
    </Card>
  );
}
