"use client";

import * as React from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";

/**
 * Multiple-image input for the add-poster form. The first image is the
 * cover; the rest are detail shots. Uploads go straight to Cloudinary when
 * an unsigned preset is configured; pasting URLs always works. Each image
 * is submitted as a repeated hidden input (formData.getAll(name)).
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MultiImageField({
  name = "imageUrls",
  defaultUrls,
}: {
  name?: string;
  /** Prefill when editing an existing poster. */
  defaultUrls?: string[];
}) {
  const [urls, setUrls] = React.useState<string[]>(defaultUrls ?? []);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canUpload = Boolean(CLOUD && PRESET);

  const add = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrls((list) => (list.includes(trimmed) ? list : [...list, trimmed]));
  };

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("upload_preset", PRESET as string);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
          { method: "POST", body },
        );
        if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
        const data = (await res.json()) as { secure_url?: string };
        if (!data.secure_url) throw new Error("Upload returned no URL");
        add(data.secure_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}
      {/* A pasted-but-not-yet-added URL still submits with the form, so
          "paste then hit Save" works without clicking +. */}
      {draft.trim() && !urls.includes(draft.trim()) ? (
        <input type="hidden" name={name} value={draft.trim()} />
      ) : null}

      {urls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={index === 0 ? "Cover image" : `Detail ${index}`}
                className="h-20 w-16 rounded-md border border-border bg-black/40 object-contain"
              />
              {index === 0 ? (
                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] uppercase tracking-wider text-white/90">
                  cover
                </span>
              ) : null}
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => setUrls((list) => list.filter((u) => u !== url))}
                className="absolute -right-1.5 -top-1.5 cursor-pointer rounded-full bg-black/80 p-0.5 text-white/80 transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {canUpload ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span>
            {busy
              ? "Uploading…"
              : urls.length === 0
                ? "Upload the cover (add detail shots after)"
                : "Add another detail shot"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={onFileChange}
          />
        </label>
      ) : null}

      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
              setDraft("");
            }
          }}
          placeholder={
            canUpload ? "…or paste an image URL (res.cloudinary.com/…)" : "Paste an image URL (res.cloudinary.com/…)"
          }
          className={inputClass}
        />
        <button
          type="button"
          aria-label="Add image URL"
          onClick={() => {
            add(draft);
            setDraft("");
          }}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
