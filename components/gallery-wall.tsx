"use client";

import * as React from "react";
import { Check, LayoutGrid, Loader2, Minus, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Gallery wall: posters hung on a light wall, salon style. The editor is
 * an order-based sortable grid — drag a piece onto another and they swap,
 * and the whole wall re-tidies around the new order. Positions are
 * percentages so a layout scales from phone to desktop. Also renders
 * read-only (from saved positions) for public profiles.
 */

export interface WallPosterItem {
  posterId: string;
  imageUrl: string;
  title: string;
  /** Physical print width in inches (from edition dimensions), if known. */
  widthIn?: number;
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
/** Fallback poster aspect until the real image dimensions are known. */
const POSTER_ASPECT = 0.75;
/** The floor line (height-%). Art may never cross it. */
const FLOOR_Y = 90;
/** Bottom margin above the floor + top margin. */
const ART_BOTTOM = FLOOR_Y - 2;
const ART_TOP = 4;
/** Gallery midline the arrangement anchors to (slightly above center,
 * like eye-level hanging). */
const MIDLINE = 44;
/** The wall represents this many physical inches across — an 18" print
 * hangs at 18/160 of the wall width, so sizes are true relative to each
 * other. */
const WALL_INCHES = 160;
/** Default physical width when a print has no dimensions recorded. */
const DEFAULT_WIDTH_IN = 18;

/** Wall width-% for a print, from its physical size. */
export const wallWidthFor = (item: WallPosterItem): number =>
  Math.min(
    MAX_W,
    Math.max(MIN_W, ((item.widthIn ?? DEFAULT_WIDTH_IN) / WALL_INCHES) * 100),
  );

/**
 * Salon-style auto arrangement: uniform physical spacing, columns
 * anchored on the midline, whole composition centered on the wall.
 * Order in = order out (left-to-right, top-to-bottom within a column), so
 * reordering the item list re-tidies the wall. `aspectOf` supplies each
 * poster's real width/height ratio; `widthOf` supplies its wall width
 * (physical size, or a per-poster override).
 */
export function autoArrangeWall(
  items: WallPosterItem[],
  aspectOf: (posterId: string) => number = () => POSTER_ASPECT,
  widthOf: (item: WallPosterItem) => number = wallWidthFor,
): WallSlot[] {
  const gapX = 2.2;
  // Same physical distance vertically as horizontally.
  const gapY = gapX * WALL_ASPECT;
  const heightOf = (w: number, aspect: number) => (w / aspect) * WALL_ASPECT;
  const maxColumnH = ART_BOTTOM - ART_TOP;
  // A single piece can never be taller than the whole art band — a very
  // tall/narrow print is width-clamped so it fits instead of clipping the
  // floor or its neighbors.
  const fit = (w: number, aspect: number): { w: number; h: number } => {
    let height = heightOf(w, aspect);
    if (height > maxColumnH) {
      w = (w * maxColumnH) / height;
      height = maxColumnH;
    }
    return { w, h: height };
  };

  interface ColumnEntry { item: WallPosterItem; w: number; h: number }

  const build = (scale: number) => {
    const columns: Array<{ entries: ColumnEntry[]; w: number; h: number }> = [];
    let index = 0;
    while (index < items.length) {
      const entries: ColumnEntry[] = [];
      let columnH = 0;
      // Organic column heights: vary the target height per column so rows
      // don't line up into a grid. Deterministic from the leading poster.
      const maxThisColumn = 2 + Math.round(rand01(items[index].posterId) * 1);
      while (index < items.length && entries.length < maxThisColumn) {
        // True-to-size: width from physical dimensions, height-clamped.
        const rawW = Math.max(4.5, widthOf(items[index]) * scale);
        const { w, h } = fit(rawW, aspectOf(items[index].posterId));
        if (entries.length > 0 && columnH + gapY + h > maxColumnH) break;
        entries.push({ item: items[index], w, h });
        columnH += (entries.length > 1 ? gapY : 0) + h;
        index++;
      }
      columns.push({
        entries,
        w: Math.max(...entries.map((e) => e.w)),
        h: columnH,
      });
    }
    const totalW =
      columns.reduce((sum, c) => sum + c.w, 0) + gapX * (columns.length - 1);
    return { columns, totalW };
  };

  let { columns, totalW } = build(1);
  if (totalW > 94) {
    ({ columns, totalW } = build(Math.max(0.35, 94 / totalW)));
  }

  // Center the whole composition horizontally on the wall.
  const slots: WallSlot[] = [];
  let x = Math.max(1, (100 - totalW) / 2);
  for (const column of columns) {
    // Vertical anchor: near the eye-level midline, then a deterministic
    // stagger within the column's slack so the wall reads salon-hung, not
    // gridded — bounded so nothing crosses the top or the floor.
    const lo = ART_TOP;
    const hi = Math.max(ART_TOP, ART_BOTTOM - column.h);
    const centered = Math.min(hi, Math.max(lo, MIDLINE - column.h / 2));
    const slack = hi - lo;
    const jitter = (rand01(`${column.entries[0].item.posterId}y`) - 0.5) * slack * 0.7;
    let y = Math.min(hi, Math.max(lo, centered + jitter));
    for (const entry of column.entries) {
      slots.push({
        posterId: entry.item.posterId,
        x: x + (column.w - entry.w) / 2,
        y,
        w: entry.w,
        z: slots.length + 1,
      });
      y += entry.h + gapY;
    }
    x += column.w + gapX;
  }
  return slots;
}

/** Deterministic 0–1 pseudo-random from a string (stable across renders;
 * Math.random is unavailable here and would reshuffle every paint). */
function rand01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Reading order (left-to-right by column, then top-to-bottom) from saved
 * positions, so an existing layout re-derives a stable item order. */
function orderFromSlots(slots: WallSlot[]): string[] {
  return [...slots]
    .sort((a, b) => (Math.abs(a.x - b.x) > 4 ? a.x - b.x : a.y - b.y))
    .map((s) => s.posterId);
}

/** Read-only wall (public profiles): render saved positions as-is. */
function StaticWall({
  items,
  layout,
}: {
  items: WallPosterItem[];
  layout: WallSlot[];
}) {
  const itemById = new Map(items.map((item) => [item.posterId, item]));
  const slots = layout.filter((s) => itemById.has(s.posterId));
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/10 aspect-[8/5]"
      style={{
        background: `linear-gradient(180deg, #efedea 0%, #e7e4df ${FLOOR_Y - 0.5}%, #cfccc6 ${FLOOR_Y}%, #b9b6b0 100%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
      {slots.map((slot) => {
        const item = itemById.get(slot.posterId);
        if (!item) return null;
        return (
          <div
            key={slot.posterId}
            style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, zIndex: slot.z }}
            className="absolute"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="w-full border-[3px] border-white bg-white shadow-[0_9px_22px_-6px_rgba(0,0,0,0.5)] ring-1 ring-black/15"
            />
          </div>
        );
      })}
    </div>
  );
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

  if (!editable) {
    const layout =
      initialLayout && initialLayout.length > 0
        ? initialLayout
        : autoArrangeWall(items);
    return <StaticWall items={items} layout={layout} />;
  }

  return <EditableWall items={items} itemById={itemById} initialLayout={initialLayout} onSave={onSave} />;
}

function EditableWall({
  items,
  itemById,
  initialLayout,
  onSave,
}: {
  items: WallPosterItem[];
  itemById: Map<string, WallPosterItem>;
  initialLayout?: WallSlot[];
  onSave?: (layout: WallSlot[]) => Promise<void>;
}) {
  // The wall is an ordered list of poster ids. Positions are DERIVED from
  // that order via autoArrangeWall, so any reorder re-tidies the wall.
  const [order, setOrder] = React.useState<string[]>(() => {
    const saved = (initialLayout ?? []).filter((s) => itemById.has(s.posterId));
    return saved.length > 0
      ? orderFromSlots(saved)
      : items.map((i) => i.posterId);
  });
  // Per-poster width override (the +/- control); otherwise physical size.
  const [sizeOverride, setSizeOverride] = React.useState<Map<string, number>>(
    new Map(),
  );
  const [selected, setSelected] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);

  const wallRef = React.useRef<HTMLDivElement>(null);
  const pointerOffset = React.useRef({ x: 0, y: 0 });
  const lastSwap = React.useRef<string | null>(null);

  // Measured image aspects (drive tidy heights); recompute layout when new
  // measurements land.
  const aspects = React.useRef(new Map<string, number>());
  const [measured, setMeasured] = React.useState(0);
  const aspectOf = React.useCallback(
    (posterId: string) => aspects.current.get(posterId) ?? POSTER_ASPECT,
    [],
  );
  const widthOf = React.useCallback(
    (item: WallPosterItem) => sizeOverride.get(item.posterId) ?? wallWidthFor(item),
    [sizeOverride],
  );

  const onWall = React.useMemo(
    () => order.map((id) => itemById.get(id)).filter((i): i is WallPosterItem => Boolean(i)),
    [order, itemById],
  );

  // Positions derived from order + sizes. Recomputed on any of those (or a
  // new measurement) — this is what makes the wall reflow on reorder.
  const layout = React.useMemo(
    () => {
      const slots = autoArrangeWall(onWall, aspectOf, widthOf);
      return new Map(slots.map((s) => [s.posterId, s]));
    },
    // measured is a dep so tidy heights refine as art loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onWall, widthOf, measured],
  );
  const hPctOf = (slot: WallSlot) => (slot.w / aspectOf(slot.posterId)) * WALL_ASPECT;

  const markDirty = () => setDirty(true);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, posterId: string) => {
    const wall = wallRef.current;
    const slot = layout.get(posterId);
    if (!wall || !slot) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = wall.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    pointerOffset.current = { x: px - slot.x, y: py - slot.y };
    lastSwap.current = null;
    setDragId(posterId);
    setDragPos({ x: slot.x, y: slot.y });
    setSelected(posterId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const wall = wallRef.current;
    if (!dragId || !wall) return;
    const rect = wall.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const dragged = layout.get(dragId);
    const dragW = dragged?.w ?? 15;
    const dragH = dragged ? hPctOf(dragged) : 20;
    // The dragged piece follows the pointer (clamped to wall + floor).
    setDragPos({
      x: Math.min(100 - dragW, Math.max(0, px - pointerOffset.current.x)),
      y: Math.min(Math.max(0, ART_BOTTOM - dragH), Math.max(0, py - pointerOffset.current.y)),
    });

    // Which other piece is the pointer over? Swap with it, once per hover.
    let over: string | null = null;
    for (const [id, slot] of layout) {
      if (id === dragId) continue;
      const h = hPctOf(slot);
      if (px >= slot.x && px <= slot.x + slot.w && py >= slot.y && py <= slot.y + h) {
        over = id;
        break;
      }
    }
    if (over && over !== lastSwap.current) {
      lastSwap.current = over;
      setOrder((list) => {
        const from = list.indexOf(dragId);
        const to = list.indexOf(over as string);
        if (from < 0 || to < 0) return list;
        const next = [...list];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
      markDirty();
    } else if (!over) {
      lastSwap.current = null;
    }
  };

  const onPointerUp = () => {
    // Release: the piece animates from its free drag position into its
    // (possibly new) tidy slot.
    setDragId(null);
    setDragPos(null);
    lastSwap.current = null;
  };

  const resize = (posterId: string, delta: number) => {
    const item = itemById.get(posterId);
    if (!item) return;
    const current = sizeOverride.get(posterId) ?? wallWidthFor(item);
    const next = Math.min(MAX_W, Math.max(MIN_W, current + delta));
    setSizeOverride((map) => new Map(map).set(posterId, next));
    markDirty();
  };

  const removeFromWall = (posterId: string) => {
    setOrder((list) => list.filter((id) => id !== posterId));
    setSelected(null);
    markDirty();
  };

  const offWall = items.filter((item) => !order.includes(item.posterId));

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(autoArrangeWall(onWall, aspectOf, widthOf));
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void save()} disabled={!dirty || saving || !onSave}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          {saving ? "Saving…" : savedFlash ? "Saved" : "Save wall"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOrder(items.map((i) => i.posterId));
            setSizeOverride(new Map());
            markDirty();
          }}
        >
          <LayoutGrid />
          Tidy wall
        </Button>
        {selected && order.includes(selected) ? (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <span className="max-w-32 truncate px-1 text-xs text-muted-foreground">
              {itemById.get(selected)?.title}
            </span>
            <Button variant="ghost" size="icon" aria-label="Smaller" onClick={() => resize(selected, -2)}>
              <Minus />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Bigger" onClick={() => resize(selected, 2)}>
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Take off the wall"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeFromWall(selected)}
            >
              <X />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Drag a poster onto another to swap them — the wall re-tidies itself.
          </p>
        )}
      </div>

      {/* The wall */}
      <div
        ref={wallRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full select-none overflow-hidden rounded-xl border border-white/10 aspect-[8/5]"
        style={{
          background: `linear-gradient(180deg, #efedea 0%, #e7e4df ${FLOOR_Y - 0.5}%, #cfccc6 ${FLOOR_Y}%, #b9b6b0 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
        {onWall.map((item, index) => {
          const slot = layout.get(item.posterId);
          if (!slot) return null;
          const isDragging = dragId === item.posterId;
          const pos = isDragging && dragPos ? dragPos : slot;
          return (
            <div
              key={item.posterId}
              onPointerDown={(e) => onPointerDown(e, item.posterId)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${slot.w}%`,
                zIndex: isDragging ? 999 : index + 1,
                touchAction: "none",
                transition: isDragging
                  ? "none"
                  : "left 0.3s cubic-bezier(0.22, 1, 0.36, 1), top 0.3s cubic-bezier(0.22, 1, 0.36, 1), width 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className={cn(
                "absolute cursor-grab active:cursor-grabbing",
                isDragging && "scale-[1.04] shadow-2xl",
                selected === item.posterId &&
                  !isDragging &&
                  "outline outline-2 outline-offset-2 outline-[#8b5cf6]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title}
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    aspects.current.set(item.posterId, img.naturalWidth / img.naturalHeight);
                    setMeasured((n) => n + 1);
                  }
                }}
                className="w-full border-[3px] border-white bg-white shadow-[0_9px_22px_-6px_rgba(0,0,0,0.5)] ring-1 ring-black/15"
              />
            </div>
          );
        })}
        {onWall.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            An empty wall — add posters below.
          </p>
        ) : null}
      </div>

      {/* Off-wall tray */}
      {offWall.length > 0 ? (
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
                  setOrder((list) => [...list, item.posterId]);
                  setSelected(item.posterId);
                  markDirty();
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
