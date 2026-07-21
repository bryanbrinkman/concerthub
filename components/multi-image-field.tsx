"use client";

import * as React from "react";
import { ImagePlus, Link2, Loader2, Plus, Wand2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { PerspectiveEditor } from "@/components/perspective-editor";

/**
 * Multiple-image input for the poster forms. The first image is the
 * cover; the rest are detail shots. Two ways to add:
 *  - Upload: drag & drop, click to pick, or paste an image from the
 *    clipboard — files go straight to Cloudinary (unsigned preset).
 *  - URL: paste an image link (always available).
 * Each image submits as a repeated hidden input (formData.getAll(name)).
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
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showUrl, setShowUrl] = React.useState(false);
  // Which image URL is open in the straighten (perspective) editor.
  const [editing, setEditing] = React.useState<string | null>(null);
  const canUpload = Boolean(CLOUD && PRESET);

  const add = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrls((list) => (list.includes(trimmed) ? list : [...list, trimmed]));
  };

  const uploadOne = React.useCallback(async (file: File): Promise<string> => {
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
    return data.secure_url;
  }, []);

  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        for (const file of images) {
          add(await uploadOne(file));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [uploadOne],
  );

  /** Flattened result from the straighten editor: upload it and swap it in
   * for the original, keeping list order (cover stays cover). */
  const applyFlattened = React.useCallback(
    async (blob: Blob) => {
      const original = editing;
      if (!original) return;
      const flatUrl = await uploadOne(
        new File([blob], "straightened.jpg", { type: "image/jpeg" }),
      );
      setUrls((list) => list.map((u) => (u === original ? flatUrl : u)));
    },
    [editing, uploadOne],
  );

  // Paste an image straight from the clipboard while the field is focused.
  const onPaste = (e: React.ClipboardEvent) => {
    if (!canUpload) return;
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      void uploadFiles(files);
    }
  };

  return (
    <div className="space-y-2" onPaste={onPaste}>
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}
      {/* A pasted-but-not-yet-added URL still submits, so "paste then Save"
          works without clicking +. */}
      {draft.trim() && !urls.includes(draft.trim()) ? (
        <input type="hidden" name={name} value={draft.trim()} />
      ) : null}

      {/* Thumbnails */}
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
              {canUpload ? (
                <button
                  type="button"
                  aria-label="Straighten this photo"
                  title="Photo taken at an angle? Pin the corners and flatten it."
                  onClick={() => setEditing(url)}
                  className="absolute -bottom-1.5 -right-1.5 cursor-pointer rounded-full bg-black/80 p-1 text-white/80 transition-colors hover:text-primary"
                >
                  <Wand2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {editing ? (
        <PerspectiveEditor
          imageUrl={editing}
          onApply={applyFlattened}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {/* Upload dropzone */}
      {canUpload ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-5 text-center text-sm transition-colors",
            dragging
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-white/25 hover:text-foreground",
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span>
            {busy ? (
              "Uploading…"
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {urls.length === 0 ? "Upload the cover" : "Add a detail shot"}
                </span>{" "}
                — drop an image, click to browse, or paste
              </>
            )}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              void uploadFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {/* URL fallback (always available; primary when uploads are off) */}
      {canUpload && !showUrl ? (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
          or paste an image URL
        </button>
      ) : null}
      {!canUpload || showUrl ? (
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
            placeholder="Paste an image URL (https://…)"
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
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
