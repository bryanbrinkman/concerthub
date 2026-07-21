"use client";

import * as React from "react";
import { Loader2, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Perspective correction for poster photos taken at an angle: drag four
 * corner pins onto the poster's corners and the image is flattened into a
 * true rectangle (projective square→quad mapping, bilinearly resampled on
 * a canvas — no external libraries). The result is handed back as a JPEG
 * blob for re-upload.
 */

interface Pin {
  x: number; // fraction of image width, 0..1
  y: number; // fraction of image height, 0..1
}

const INITIAL_PINS: Pin[] = [
  { x: 0.08, y: 0.08 }, // top-left
  { x: 0.92, y: 0.08 }, // top-right
  { x: 0.92, y: 0.92 }, // bottom-right
  { x: 0.08, y: 0.92 }, // bottom-left
];

const PIN_LABELS = ["Top left", "Top right", "Bottom right", "Bottom left"];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Flatten the quad marked by `pins` (TL,TR,BR,BL as image fractions) into a
 * rectangle. Heckbert square→quad coefficients give the inverse map: each
 * destination pixel (u,v ∈ [0,1]²) is pulled from its source position with
 * bilinear sampling.
 */
async function flattenImage(imageUrl: string, pins: Pin[]): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
    img.src = imageUrl;
  });

  // Source pixels (long side capped to bound memory/time).
  const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const cw = Math.max(1, Math.round(img.naturalWidth * scale));
  const ch = Math.max(1, Math.round(img.naturalHeight * scale));
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = cw;
  srcCanvas.height = ch;
  const sctx = srcCanvas.getContext("2d");
  if (!sctx) throw new Error("canvas unavailable");
  sctx.drawImage(img, 0, 0, cw, ch);
  const src = sctx.getImageData(0, 0, cw, ch);

  // Corners in source pixels: q0=TL, q1=TR, q2=BR, q3=BL.
  const q = pins.map((p) => ({ x: p.x * cw, y: p.y * ch }));

  // Output size from the quad's average edge lengths (true aspect).
  let W = Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2);
  let H = Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
  const outScale = Math.min(1, 1600 / Math.max(W, H));
  W = Math.max(50, Math.round(W * outScale));
  H = Math.max(50, Math.round(H * outScale));

  // Heckbert square→quad: (u,v) ∈ [0,1]² → source pixel.
  const d1x = q[1].x - q[2].x;
  const d1y = q[1].y - q[2].y;
  const d2x = q[3].x - q[2].x;
  const d2y = q[3].y - q[2].y;
  const sx = q[0].x - q[1].x + q[2].x - q[3].x;
  const sy = q[0].y - q[1].y + q[2].y - q[3].y;
  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    // Parallelogram — plain affine.
    a = q[1].x - q[0].x;
    b = q[3].x - q[0].x;
    c = q[0].x;
    d = q[1].y - q[0].y;
    e = q[3].y - q[0].y;
    f = q[0].y;
    g = 0;
    h = 0;
  } else {
    g = (sx * d2y - sy * d2x) / den;
    h = (d1x * sy - d1y * sx) / den;
    a = q[1].x - q[0].x + g * q[1].x;
    b = q[3].x - q[0].x + h * q[3].x;
    c = q[0].x;
    d = q[1].y - q[0].y + g * q[1].y;
    e = q[3].y - q[0].y + h * q[3].y;
    f = q[0].y;
  }

  const out = new ImageData(W, H);
  const sd = src.data;
  const od = out.data;
  const maxX = cw - 1.001;
  const maxY = ch - 1.001;
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const w = g * u + h * v + 1;
      let px = (a * u + b * v + c) / w;
      let py = (d * u + e * v + f) / w;
      if (px < 0) px = 0;
      else if (px > maxX) px = maxX;
      if (py < 0) py = 0;
      else if (py > maxY) py = maxY;
      const x0 = px | 0;
      const y0 = py | 0;
      const fx = px - x0;
      const fy = py - y0;
      const i00 = (y0 * cw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + cw * 4;
      const i11 = i01 + 4;
      const o = (y * W + x) * 4;
      for (let ch2 = 0; ch2 < 3; ch2++) {
        const top = sd[i00 + ch2] * (1 - fx) + sd[i10 + ch2] * fx;
        const bot = sd[i01 + ch2] * (1 - fx) + sd[i11 + ch2] * fx;
        od[o + ch2] = top * (1 - fy) + bot * fy;
      }
      od[o + 3] = 255;
    }
  }

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = W;
  dstCanvas.height = H;
  dstCanvas.getContext("2d")?.putImageData(out, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    dstCanvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("encode failed");
  return blob;
}

export function PerspectiveEditor({
  imageUrl,
  onApply,
  onClose,
}: {
  imageUrl: string;
  /** Receives the flattened JPEG; caller uploads + swaps the URL. */
  onApply: (blob: Blob) => Promise<void>;
  onClose: () => void;
}) {
  const [pins, setPins] = React.useState<Pin[]>(INITIAL_PINS);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);

  const pinFromEvent = (e: React.PointerEvent): Pin | null => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await flattenImage(imageUrl, pins);
      await onApply(blob);
      onClose();
    } catch {
      setError(
        "Couldn't process this image — its host may block editing. Try re-uploading the photo first.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Straighten poster photo"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="max-h-full w-full max-w-2xl space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Straighten this photo</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Drag the four pins onto the poster&apos;s corners, then flatten.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <div
            ref={frameRef}
            onPointerMove={(e) => {
              if (dragIndex === null) return;
              const p = pinFromEvent(e);
              if (!p) return;
              setPins((list) => list.map((old, i) => (i === dragIndex ? p : old)));
            }}
            onPointerUp={() => setDragIndex(null)}
            onPointerCancel={() => setDragIndex(null)}
            className="relative inline-block max-w-full touch-none select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Photo to straighten"
              draggable={false}
              className="max-h-[60vh] w-auto max-w-full rounded-md"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <polygon
                points={pins.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                fill="rgba(245,165,36,0.14)"
                stroke="#f5a524"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {pins.map((pin, index) => (
              <div
                key={index}
                role="button"
                aria-label={`${PIN_LABELS[index]} corner`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragIndex(index);
                }}
                onPointerMove={(e) => {
                  if (dragIndex !== index) return;
                  const p = pinFromEvent(e);
                  if (!p) return;
                  setPins((list) =>
                    list.map((old, i) => (i === index ? p : old)),
                  );
                }}
                onPointerUp={() => setDragIndex(null)}
                style={{
                  left: `${pin.x * 100}%`,
                  top: `${pin.y * 100}%`,
                  touchAction: "none",
                }}
                className="absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.6)] active:cursor-grabbing"
              />
            ))}
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void apply()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {busy ? "Flattening…" : "Flatten"}
          </Button>
        </div>
      </div>
    </div>
  );
}
