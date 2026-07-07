import type { ReactNode } from "react";

/** Shared styling for the add-item forms. */
export const inputClass =
  "h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const selectClass = `${inputClass} appearance-none`;

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-[11px] text-muted-foreground/80">{hint}</span>
      ) : null}
    </label>
  );
}
