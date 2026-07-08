"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ListPlus, Plus, X } from "lucide-react";

/**
 * Bill editor for add/edit-show forms: any number of performers, each
 * with a billing role, reorderable. "Paste a lineup" bulk-adds one name
 * per line (festival flyers, Wikipedia lineups). Each row submits as
 * parallel performerName/performerRole fields — order = billing order.
 * Names not matching a known artist get a "new" chip so it's obvious
 * which rows will create performer records.
 */

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selectClass =
  "h-9 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROLE_OPTIONS: Array<[string, string]> = [
  ["co_headliner", "Co-headliner"],
  ["support", "Support"],
  ["opener", "Opener"],
  ["festival_performer", "Festival performer"],
  ["special_guest", "Special guest"],
  ["unknown", "Unknown billing"],
];

export interface LineupRowValue {
  name: string;
  role: string;
}

interface Row extends LineupRowValue {
  key: number;
}

export function LineupFields({
  defaultRows,
  knownNames,
  defaultBulkRole = "festival_performer",
}: {
  /** Prefill when editing an existing show. */
  defaultRows?: LineupRowValue[];
  /** Existing artist names — rows outside this set get a "new" chip. */
  knownNames?: string[];
  /** Role assigned to bulk-pasted names. */
  defaultBulkRole?: string;
}) {
  const nextKey = React.useRef(0);
  const makeRow = (name = "", role = "support"): Row => ({
    key: nextKey.current++,
    name,
    role,
  });
  const [rows, setRows] = React.useState<Row[]>(() =>
    (defaultRows ?? []).map((r) => makeRow(r.name, r.role)),
  );
  const [bulk, setBulk] = React.useState("");
  const known = React.useMemo(
    () => new Set((knownNames ?? []).map((n) => n.trim().toLowerCase())),
    [knownNames],
  );

  const update = (key: number, patch: Partial<LineupRowValue>) =>
    setRows((list) =>
      list.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  const move = (key: number, delta: -1 | 1) =>
    setRows((list) => {
      const i = list.findIndex((r) => r.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addBulk = () => {
    const names = bulk
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setRows((list) => {
      const have = new Set(list.map((r) => r.name.trim().toLowerCase()));
      const fresh = names.filter((n) => !have.has(n.toLowerCase()));
      return [...list, ...fresh.map((n) => makeRow(n, defaultBulkRole))];
    });
    setBulk("");
  };

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-1.5">
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Move up the bill"
              disabled={index === 0}
              onClick={() => move(row.key, -1)}
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Move down the bill"
              disabled={index === rows.length - 1}
              onClick={() => move(row.key, 1)}
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative min-w-0 flex-1">
            <input
              name="performerName"
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
              placeholder="Performer / band"
              className={inputClass}
            />
            {row.name.trim() && !known.has(row.name.trim().toLowerCase()) ? (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-primary/40 px-1.5 text-[10px] uppercase text-primary/90">
                new
              </span>
            ) : null}
          </div>
          <select
            name="performerRole"
            value={row.role}
            onChange={(e) => update(row.key, { role: e.target.value })}
            className={selectClass}
          >
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Remove from the bill"
            onClick={() =>
              setRows((list) => list.filter((r) => r.key !== row.key))
            }
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setRows((list) => [...list, makeRow()])}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
        >
          <Plus className="h-4 w-4" />
          {rows.length === 0 ? "Add a performer" : "Add another performer"}
        </button>
      </div>

      <details className="rounded-lg border border-dashed border-border px-3 py-2">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ListPlus className="h-4 w-4" />
          Paste a lineup (one name per line)
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"OutKast\nPhoenix\nJack White\nVampire Weekend\nSpoon"}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={addBulk}
            className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            Add {bulk.split(/[\n,]+/).filter((n) => n.trim()).length || ""} names
            to the bill
          </button>
          <p className="text-xs text-muted-foreground">
            Names marked “new” don't match an existing performer and will
            create one — double-check spelling before saving.
          </p>
        </div>
      </details>
    </div>
  );
}
