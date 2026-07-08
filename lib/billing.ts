/**
 * Lineup & billing helpers — pure functions over the Show model.
 *
 * Shows are the canonical spine; a show's bill is the show_performer
 * list (Show.performers). Legacy single-artist shows have no performers
 * array and fall back to Show.artistId as an implicit headliner, so all
 * of these work before AND after the 0006 migration.
 */

import type { BillingRole, Show, ShowPerformer } from "@/lib/types";

export const HEADLINE_ROLES: ReadonlyArray<BillingRole> = [
  "headliner",
  "co_headliner",
];
export const SUPPORT_ROLES: ReadonlyArray<BillingRole> = [
  "support",
  "opener",
  "special_guest",
];

export const BILLING_ROLE_LABELS: Record<BillingRole, string> = {
  headliner: "Headliner",
  co_headliner: "Co-headliner",
  support: "Support",
  opener: "Opener",
  festival_performer: "Festival performer",
  special_guest: "Special guest",
  unknown: "On the bill",
};

/** The full bill in billing order (legacy shows: the single artist). */
export function lineupOf(show: Show): ShowPerformer[] {
  const performers = show.performers ?? [];
  if (performers.length > 0) {
    return [...performers].sort((a, b) => a.billingOrder - b.billingOrder);
  }
  return [{ artistId: show.artistId, billingRole: "headliner", billingOrder: 1 }];
}

export const headlinersOf = (show: Show): ShowPerformer[] =>
  lineupOf(show).filter((p) => HEADLINE_ROLES.includes(p.billingRole));

export const supportsOf = (show: Show): ShowPerformer[] =>
  lineupOf(show).filter((p) => SUPPORT_ROLES.includes(p.billingRole));

export const isFestival = (show: Show): boolean =>
  show.eventType === "festival" || show.eventType === "festival_day";

/**
 * Display title for a show/event.
 *  - Explicit event name always wins ("Governors Ball 2014 — Day 2").
 *  - One headliner: "Radiohead". Support never changes the title.
 *  - Co-headliners: "The Postal Service + Death Cab for Cutie".
 *  - No clear headliner: first two billed + "+ N more".
 */
export function showTitle(
  show: Show,
  nameOf: (artistId: string) => string | undefined,
): string {
  if (show.name) return show.name;
  const lineup = lineupOf(show);
  const names = (list: ShowPerformer[]) =>
    list.map((p) => nameOf(p.artistId)).filter((n): n is string => Boolean(n));

  const headNames = names(lineup.filter((p) => HEADLINE_ROLES.includes(p.billingRole)));
  if (headNames.length > 0) return headNames.join(" + ");

  const all = names(lineup);
  if (all.length === 0) return "Unknown artist";
  if (all.length <= 3) return all.join(" + ");
  return `${all.slice(0, 2).join(" + ")} + ${all.length - 2} more`;
}
