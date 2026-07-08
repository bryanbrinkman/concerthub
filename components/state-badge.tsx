import type { PosterState } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<PosterState, string> = {
  own: "In collection",
  want: "Wantlist",
  trade: "For Trade",
  sell: "For Sale",
};

const VARIANTS: Record<PosterState, "success" | "outline" | "secondary" | "default"> = {
  own: "success",
  want: "outline",
  trade: "secondary",
  sell: "default",
};

/** Collection-state chip: Own / Want / For Trade / For Sale. */
export function StateBadge({ state }: { state: PosterState }) {
  return <Badge variant={VARIANTS[state]}>{LABELS[state]}</Badge>;
}
