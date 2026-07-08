import { ExternalLink, ShoppingBag } from "lucide-react";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Cached marketplace references for a show ("On the Market"). Reads only
 * what enrichment already stored — never calls eBay on page load. Purely
 * external references; listing imagery is never copied into the archive.
 */
export async function OnTheMarket({ showId }: { showId: string }) {
  const db = getDb();
  if (!db) return null;

  let listings: Array<{
    id: string;
    fetchedAt: Date;
    value: Record<string, unknown>;
  }> = [];
  try {
    listings = await db
      .select({
        id: t.dataCandidates.id,
        fetchedAt: t.dataCandidates.fetchedAt,
        value: t.dataCandidates.value,
      })
      .from(t.dataCandidates)
      .where(
        and(
          eq(t.dataCandidates.showId, showId),
          eq(t.dataCandidates.kind, "marketplace"),
          eq(t.dataCandidates.status, "pending"),
        ),
      )
      .limit(4);
  } catch {
    return null; // enrichment tables not migrated yet
  }
  if (listings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          On the Market
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {listings.map((listing) => {
          const value = listing.value as {
            title?: string;
            url?: string;
            price?: string;
            currency?: string;
          };
          return (
            <a
              key={listing.id}
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate text-xs group-hover:text-primary">
                {value.title}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {value.price
                  ? `${value.currency === "USD" ? "$" : ""}${value.price}`
                  : ""}
              </span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
          );
        })}
        <p className="px-2 text-[10px] text-muted-foreground">
          eBay references from enrichment — last checked{" "}
          {formatShortDate(listings[0].fetchedAt.toISOString().slice(0, 10))}.
        </p>
      </CardContent>
    </Card>
  );
}
