"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * ⌘K command palette. Opens via Cmd/Ctrl-K or the sidebar Search button
 * (which dispatches a "cc-open-search" event). Searches the viewer's
 * archive (shows/artists/venues) plus app pages, all provided serialized
 * from the layout.
 */

export interface SearchItem {
  label: string;
  sublabel?: string;
  href: string;
  group: string;
}

const MAX_RESULTS = 12;

export function SearchPalette({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("cc-open-search", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cc-open-search", onOpenEvent);
    };
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // focus after the overlay renders
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Multi-token match: every word must appear somewhere in the item, so
  // "Rilo Kiley Capitol Theatre" and "Killer Acid poster" both resolve.
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = (i: SearchItem) =>
    `${i.label} ${i.sublabel ?? ""} ${i.group}`.toLowerCase();
  const results = (
    tokens.length === 0
      ? items.filter((i) => i.group === "Pages")
      : items.filter((i) => {
          const hay = haystack(i);
          return tokens.every((token) => hay.includes(token));
        })
  ).slice(0, MAX_RESULTS);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                go(results[activeIndex].href);
              }
            }}
            placeholder="Search shows, posters, artists, venues…"
            className="h-11 w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing matches &quot;{query}&quot;
            </p>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.group}-${item.href}-${item.label}`}
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full cursor-pointer items-baseline gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-accent" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.sublabel ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.sublabel}
                  </span>
                ) : null}
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
