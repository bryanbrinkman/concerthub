"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Gallery wall: posters pinned to a light wall, salon style. Drag with
 * mouse or touch to rearrange; coordinates are percentages so the same
 * layout scales from phone to desktop. Also renders read-only for
 * public profiles.
 */

export interface WallPosterItem {
  posterId: string;
  imageUrl: string;
  title: string;
}

export interface WallSlot {
  posterId: string;
  /** % of wall width. */
  x: number;
  /** % of wall height. */
  y: number;
  /** Width as % of wall width. */
  w: number;
  /** Stacking order. */
  z: number;
}

const MIN_W = 6;
const MAX_W = 38;
/** Wall aspect (w/h) — used to convert widths into height-% for layout. */
const WALL_ASPECT = 1.6;
/** Assumed poster aspect for auto-arrange math (real images render true). */
const POSTER_ASPECT = 0.75;

/** Salon-style auto arrangement clustered around the wall's midline. */
export function autoArrangeWall(items: WallPosterItem[]): WallSlot[] {
  const widths = [12, 16, 20, 13, 17, 10, 21, 14];
  const gapX = 2.5;
  const gapY = 4;
  // Height-% of an item of width w% (poster aspect assumed 3:4):
  // h% = (w / posterAspect) * wallAspect.
  const heightOf = (w: number) => (w / POSTER_ASPECT) * WALL_ASPECT;

  const layout = (scale: number): { slots: WallSlot[]; xEnd: number } => {
    const slots: WallSlot[] = [];
    let x = 3;
    let index = 0;
    while (index < items.length) {
      // 1–3 posters per column, until the column would overflow.
      const column: Array<{ item: WallPosterItem; w: number; h: number }> = [];
      let columnH = 0;
      while (index < items.length && column.length < 3) {
        const w = Math.max(MIN_W, widths[index % widths.length] * scale);
        const h = heightOf(w);
        if (column.length > 0 && columnH + gapY + h > 82) break;
        column.push({ item: items[index], w, h });
        columnH += (column.length > 1 ? gapY : 0) + h;
        index++;
      }
      let y = Math.max(3, 50 - columnH / 2);
      const columnW = Math.max(...column.map((c) => c.w));
      for (const entry of column) {
        slots.push({
          posterId: entry.item.posterId,
          x: x + (columnW - entry.w) / 2,
          y,
          w: entry.w,
          z: slots.length + 1,
        });
        y += entry.h + gapY;
      }
      x += columnW + gapX;
    }
    return { slots, xEnd: x };
  };

  const first = layout(1);
  if (first.xEnd <= 98) return first.slots;
  return layout(Math.max(0.4, 95 / first.xEnd)).slots;
}

export function GalleryWall({
  items,
  initialLayout,
  editable,
  onSave,
}: {
  /** Every poster available for the wall (with artwork). */
  items: WallPosterItem[];
  initialLayout?: WallSlot[];
  editable?: boolean;
  /** Server action persisting the layout (signed-in editors only). */
  onSave?: (layout: WallSlot[]) => Promise<void>;
}) {
  const itemById = React.useMemo(
    () => new Map(items.map((item) => [item.posterId, item])),
    [items],
  );
  const [slots, setSlots] = React.useState<WallSlot[]>(() => {
    const valid = (initialLayout ?? []).filter((slot) =>
      itemById.has(slot.posterId),
    );
    return valid.length > 0 ? valid : autoArrangeWall(items);
  });
  const [selected, setSelected] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);

  const wallRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    posterId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const update = (posterId: string, patch: Partial<WallSlot>) => {
    setSlots((list) =>
      list.map((slot) =>
        slot.posterId === posterId ? { ...slot, ...patch } : slot,
      ),
    );
    setDirty(true);
  };
  const maxZ = () => slots.reduce((max, s) => Math.max(max, s.z), 0);

  const onPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    slot: WallSlot,
  ) => {
    if (!editable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      posterId: slot.posterId,
      startX: e.clientX,
      startY: e.clientY,
      origX: slot.x,
      origY: slot.y,
    };
    setSelected(slot.posterId);
    update(slot.posterId, { z: maxZ() + 1 });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const wall = wallRef.current;
    if (!state || !wall) return;
    const rect = wall.getBoundingClientRect();
    const slot = slots.find((s) => s.posterId === state.posterId);
    if (!slot) return;
    const dx = ((e.clientX - state.startX) / rect.width) * 100;
    const dy = ((e.clientY - state.startY) / rect.height) * 100;
    update(state.posterId, {
      x: Math.min(100 - slot.w, Math.max(0, state.origX + dx)),
      y: Math.min(94, Math.max(0, state.origY + dy)),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const selectedSlot = slots.find((s) => s.posterId === selected);
  const offWall = items.filter(
    (item) => !slots.some((slot) => slot.posterId === item.posterId),
  );

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(slots);
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {editable ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving || !onSave}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {saving ? "Saving…" : savedFlash ? "Saved" : "Save wall"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSlots(autoArrangeWall(items));
              setDirty(true);
            }}
          >
            <LayoutGrid />
            Tidy wall
          </Button>
          {selectedSlot ? (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
              <span className="max-w-32 truncate px-1 text-xs text-muted-foreground">
                {itemById.get(selectedSlot.posterId)?.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Smaller"
                onClick={() =>
                  update(selectedSlot.posterId, {
                    w: Math.max(MIN_W, selectedSlot.w - 2),
                  })
                }
              >
                <Minus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Bigger"
                onClick={() =>
                  update(selectedSlot.posterId, {
                    w: Math.min(MAX_W, selectedSlot.w + 2),
                  })
                }
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Bring forward"
                onClick={() => update(selectedSlot.posterId, { z: maxZ() + 1 })}
              >
                <ArrowUpToLine />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Send backward"
                onClick={() =>
                  update(selectedSlot.posterId, {
                    z: Math.max(0, selectedSlot.z - 2),
                  })
                }
              >
                <ArrowDownToLine />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Take off the wall"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setSlots((list) =>
                    list.filter((s) => s.posterId !== selectedSlot.posterId),
                  );
                  setSelected(null);
                  setDirty(true);
                }}
              >
                <X />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drag posters to arrange them. Tap one to resize or layer it.
            </p>
          )}
        </div>
      ) : null}

      {/* The wall */}
      <div
        ref={wallRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full select-none overflow-hidden rounded-xl border border-white/10 aspect-[8/5]"
        style={{
          background:
            "linear-gradient(180deg, #efedea 0%, #e7e4df 78%, #cfccc6 78.5%, #b9b6b0 100%)",
        }}
      >
        {/* soft gallery lighting */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
        {slots.map((slot) => {
          const item = itemById.get(slot.posterId);
          if (!item) return null;
          const isSelected = editable && selected === slot.posterId;
          return (
            <div
              key={slot.posterId}
              onPointerDown={(e) => onPointerDown(e, slot)}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                zIndex: slot.z,
                touchAction: "none",
              }}
              className={cn(
                "absolute",
                editable && "cursor-grab active:cursor-grabbing",
                isSelected && "outline outline-2 outline-offset-2 outline-[#8b5cf6]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title}
                draggable={false}
                className="w-full shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)]"
              />
            </div>
          );
        })}
        {slots.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            An empty wall — add posters below.
          </p>
        ) : null}
      </div>

      {/* Off-wall tray */}
      {editable && offWall.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Not on the wall — tap to hang:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {offWall.map((item) => (
              <button
                key={item.posterId}
                type="button"
                title={item.title}
                onClick={() => {
                  setSlots((list) => [
                    ...list,
                    {
                      posterId: item.posterId,
                      x: 42,
                      y: 30,
                      w: 15,
                      z: maxZ() + 1,
                    },
                  ]);
                  setSelected(item.posterId);
                  setDirty(true);
                }}
                className="shrink-0 cursor-pointer overflow-hidden rounded-md opacity-70 ring-1 ring-border transition-opacity hover:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-16 w-12 bg-black/40 object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
