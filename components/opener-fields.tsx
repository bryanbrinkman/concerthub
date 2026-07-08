"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

/**
 * Repeated text inputs for a show's support acts. Each row submits as an
 * "openers" field (formData.getAll); the server upserts every name as a
 * full artist row, so openers appear in the Artists section too.
 */

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface OpenerRow {
  key: number;
  name: string;
}

export function OpenerFields({
  name = "openers",
  defaultNames,
}: {
  name?: string;
  /** Prefill when editing an existing show. */
  defaultNames?: string[];
}) {
  const nextKey = React.useRef(0);
  const makeRow = (value = ""): OpenerRow => ({
    key: nextKey.current++,
    name: value,
  });
  const [rows, setRows] = React.useState<OpenerRow[]>(() =>
    (defaultNames ?? []).map(makeRow),
  );

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-2">
          <input
            name={name}
            value={row.name}
            onChange={(e) =>
              setRows((list) =>
                list.map((r) =>
                  r.key === row.key ? { ...r, name: e.target.value } : r,
                ),
              )
            }
            placeholder={index === 0 ? "e.g. Death Cab for Cutie" : "Another opener"}
            className={inputClass}
          />
          <button
            type="button"
            aria-label="Remove opener"
            onClick={() =>
              setRows((list) => list.filter((r) => r.key !== row.key))
            }
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((list) => [...list, makeRow()])}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
      >
        <Plus className="h-4 w-4" />
        {rows.length === 0 ? "Add an opener" : "Add another opener"}
      </button>
    </div>
  );
}
