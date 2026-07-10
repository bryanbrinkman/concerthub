import { NextResponse } from "next/server";

import { currentUserId } from "@/auth";
import { searchConcerts } from "@/lib/setlistfm";

/**
 * GET /api/setlist-search?artist=…&year=…&city=…&p=…
 *
 * Universal concert search over setlist.fm — powers the add-show wizard's
 * "find any show" step. Signed-in only (the setlist.fm key stays server-
 * side; this is not an open proxy).
 */
export const maxDuration = 20;

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const artistName = (searchParams.get("artist") ?? "").trim();
  if (!artistName) {
    return NextResponse.json({ results: [], total: 0, page: 1, itemsPerPage: 20 });
  }

  const result = await searchConcerts({
    artistName,
    year: searchParams.get("year") ?? undefined,
    cityName: searchParams.get("city") ?? undefined,
    page: Number(searchParams.get("p")) || 1,
  });
  return NextResponse.json(result);
}
