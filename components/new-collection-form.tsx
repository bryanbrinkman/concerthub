"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { createCollectionAction } from "@/app/collection-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** "New collection" toggle → inline create form (posts to a server action). */
export function NewCollectionForm() {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus />
        New collection
      </Button>
    );
  }

  return (
    <Card className="w-full sm:w-80">
      <CardContent className="p-3">
        <form action={createCollectionAction} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">New collection</p>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            name="name"
            required
            autoFocus
            maxLength={80}
            placeholder="e.g. Foil variants, 2024 tour…"
            className={inputClass}
          />
          <input
            name="description"
            maxLength={240}
            placeholder="Description (optional)"
            className={inputClass}
          />
          <Button type="submit" size="sm" className="w-full">
            Create collection
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
