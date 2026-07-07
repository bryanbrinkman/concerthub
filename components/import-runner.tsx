"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Runs a chunked setlist.fm import with live progress: calls
 * /api/import once per ~20-show page and renders a progress bar.
 */
export function ImportRunner({
  username,
  total,
}: {
  username: string;
  total: number;
}) {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [imported, setImported] = React.useState(0);
  const [failed, setFailed] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setImported(0);
    setFailed(0);
    let page = 1;
    let count = 0;
    let failures = 0;
    let itemsPerPage = 20;
    const MAX_PAGES = 100; // runaway backstop

    try {
      while (page <= MAX_PAGES) {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, page }),
        });
        const data = (await res.json()) as {
          imported?: number;
          failed?: number;
          itemsPerPage?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        count += data.imported ?? 0;
        failures += data.failed ?? 0;
        itemsPerPage = data.itemsPerPage ?? itemsPerPage;
        setImported(count);
        setFailed(failures);
        if (page * itemsPerPage >= total) break;
        page += 1;
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setRunning(false);
    }
  }

  const progress = total > 0 ? Math.min(100, Math.round(((imported + failed) / total) * 100)) : 0;

  if (done) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Imported {imported} of {total} shows
          {failed > 0 ? ` (${failed} skipped)` : ""}
        </p>
        <a href="/shows" className="text-xs text-primary hover:underline">
          View your shows →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={run} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Download />}
        {running
          ? `Importing… ${imported + failed} / ${total}`
          : `Import all ${total} shows`}
      </Button>
      {running ? (
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
