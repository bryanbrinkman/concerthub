"use client";

import * as React from "react";
import { ImagePlus, Loader2 } from "lucide-react";

/**
 * Image input for add-item forms.
 *
 * If NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 * are configured (an *unsigned* upload preset), files upload straight from
 * the browser to Cloudinary and the resulting URL is submitted. Pasting an
 * image URL always works, with or without Cloudinary.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ImageField({ name = "imageUrl" }: { name?: string }) {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canUpload = Boolean(CLOUD && PRESET);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
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
      setUrl(data.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {canUpload ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span>{busy ? "Uploading…" : "Upload a photo or scan"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={onFileChange}
          />
        </label>
      ) : null}
      <input
        type="url"
        name={name}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={
          canUpload ? "…or paste an image URL" : "Paste an image URL (https://…)"
        }
        className={inputClass}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Preview"
          className="max-h-48 rounded-lg border border-border object-contain"
        />
      ) : null}
    </div>
  );
}
