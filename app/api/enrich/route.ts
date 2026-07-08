import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { runProviderForShow } from "@/lib/enrich/engine";

/**
 * POST /api/enrich { showId, provider }
 *
 * Runs ONE enrichment provider for ONE show the caller has in their
 * archive. The Enrich Show UI fires these in parallel (one request per
 * provider) — progressive enrichment without long-running jobs, which
 * Vercel's serverless runtime can't hold. All provider credentials stay
 * server-side; this endpoint never proxies arbitrary URLs.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { showId?: string; provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { showId, provider } = body;
  if (!showId || !provider) {
    return NextResponse.json(
      { error: "showId and provider are required." },
      { status: 400 },
    );
  }

  // Only shows in the caller's archive can be enriched (also stops the
  // endpoint being used to probe arbitrary ids).
  const owns = await db
    .select({ showId: t.userShows.showId })
    .from(t.userShows)
    .where(and(eq(t.userShows.userId, userId), eq(t.userShows.showId, showId)));
  if (!owns[0]) {
    return NextResponse.json({ error: "Show not in your archive." }, { status: 403 });
  }

  const summary = await runProviderForShow(db, userId, showId, provider);
  return NextResponse.json(summary, {
    status: summary.status === "error" ? 502 : 200,
  });
}
