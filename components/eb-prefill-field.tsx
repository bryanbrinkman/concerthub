"use client";

import * as React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form-controls";

interface EbDetails {
  id: number;
  runSize?: number;
  widthIn?: number;
  heightIn?: number;
  technique?: string;
}

/**
 * Paste an Expresso Beans item link → fetch its catalog facts → fill the
 * surrounding form's edition-size / dimension / technique inputs (only the
 * ones still empty, so nothing the user typed is clobbered). Also records
 * the EB item id on the poster via a hidden input.
 */
export function EbPrefillField() {
  const [url, setUrl] = React.useState("");
  const [ebId, setEbId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  async function lookup() {
    if (!url.trim()) return;
    setBusy(true);
    setMessage(null);
    setOk(false);
    try {
      const res = await fetch("/api/eb-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        details: EbDetails | null;
        error?: string;
      };
      if (!data.details) {
        setMessage(data.error ?? "Couldn't read that page.");
        return;
      }

      // Fill sibling fields by name — empty ones only.
      const form = rootRef.current?.closest("form");
      const filled: string[] = [];
      const fill = (name: string, value: string | number | undefined, label: string) => {
        if (value === undefined || value === null || value === "") return;
        const el = form?.elements.namedItem(name);
        if (
          (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
          el.value.trim() === ""
        ) {
          el.value = String(value);
          filled.push(label);
        }
      };
      fill("runSize", data.details.runSize, "edition size");
      fill("widthIn", data.details.widthIn, "width");
      fill("heightIn", data.details.heightIn, "height");
      fill("technique", data.details.technique, "technique");

      setEbId(data.details.id);
      setOk(true);
      setMessage(
        filled.length > 0
          ? `Filled in ${filled.join(", ")} — double-check before saving.`
          : "Linked the EB record, but couldn't read edition/size from the page.",
      );
    } catch {
      setMessage("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="space-y-1.5">
      {ebId ? <input type="hidden" name="expressoBeansId" value={ebId} /> : null}
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void lookup();
            }
          }}
          placeholder="https://www.expressobeans.com/public/detail.php/…"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !url.trim()}
          onClick={() => void lookup()}
        >
          {busy ? <Loader2 className="animate-spin" /> : ok ? <Check /> : <Sparkles />}
          {busy ? "Reading…" : "Fill details"}
        </Button>
      </div>
      {message ? (
        <p className={`text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
