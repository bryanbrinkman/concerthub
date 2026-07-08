"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Minus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Drives an enrichment run: one POST /api/enrich per provider, all in
 * parallel, with live per-provider progress. When every provider
 * settles, the server components re-render with the new candidates.
 */

export interface RunnerProvider {
  name: string;
  label: string;
  /** Names of missing env vars (never values) — shown as "not configured". */
  missing: string[];
}

type Phase = "idle" | "running" | "done" | "error" | "skipped" | "unavailable";

interface ProviderState {
  phase: Phase;
  count: number;
  note?: string;
}

export function EnrichRunner({
  showId,
  providers,
  autoStart,
}: {
  showId: string;
  providers: RunnerProvider[];
  /** Kick off immediately (first visit with no candidates yet). */
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [states, setStates] = React.useState<Record<string, ProviderState>>(
    () =>
      Object.fromEntries(
        providers.map((p) => [
          p.name,
          p.missing.length > 0
            ? {
                phase: "unavailable" as Phase,
                count: 0,
                note: `Add ${p.missing.join(" + ")} to enable`,
              }
            : { phase: "idle" as Phase, count: 0 },
        ]),
      ),
  );
  const [running, setRunning] = React.useState(false);
  const startedRef = React.useRef(false);

  const start = React.useCallback(async () => {
    if (running) return;
    setRunning(true);
    const runnable = providers.filter((p) => p.missing.length === 0);
    setStates((prev) => ({
      ...prev,
      ...Object.fromEntries(
        runnable.map((p) => [p.name, { phase: "running" as Phase, count: 0 }]),
      ),
    }));
    await Promise.all(
      runnable.map(async (p) => {
        try {
          const res = await fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ showId, provider: p.name }),
          });
          const data = (await res.json()) as {
            status?: Phase;
            count?: number;
            note?: string;
            error?: string;
          };
          setStates((prev) => ({
            ...prev,
            [p.name]: {
              phase: (data.status as Phase) ?? "error",
              count: data.count ?? 0,
              note: data.note ?? data.error,
            },
          }));
        } catch {
          setStates((prev) => ({
            ...prev,
            [p.name]: { phase: "error", count: 0, note: "Request failed" },
          }));
        }
      }),
    );
    setRunning(false);
    router.refresh();
  }, [providers, router, running, showId]);

  React.useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void start();
    }
  }, [autoStart, start]);

  const icon = (state: ProviderState) => {
    switch (state.phase) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "done":
        return <Check className="h-4 w-4 text-emerald-400" />;
      case "skipped":
        return <Check className="h-4 w-4 text-muted-foreground" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "unavailable":
        return <Minus className="h-4 w-4 text-muted-foreground/60" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground/60" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Provider progress</p>
        <Button size="sm" onClick={() => void start()} disabled={running}>
          <Sparkles />
          {running ? "Enriching…" : "Run enrichment"}
        </Button>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {providers.map((p) => {
          const state = states[p.name];
          return (
            <li
              key={p.name}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                state.phase === "unavailable" && "opacity-60",
              )}
            >
              {icon(state)}
              <span className="font-medium">{p.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {state.phase === "done"
                  ? `${state.count} candidate${state.count === 1 ? "" : "s"}`
                  : state.phase === "skipped"
                    ? (state.note ?? "cached")
                    : state.phase === "running"
                      ? "searching…"
                      : (state.note ?? "")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
