import { NextResponse } from "next/server";

import { currentUserId } from "@/auth";
import { lookupSetlistPreview } from "@/lib/setlistfm";

/**
 * POST /api/setlist-lookup { artistName, date }
 *
 * Best setlist.fm match for an artist on a date — powers the add-show
 * wizard's "we found your show" step. Signed-in only (the setlist.fm key
 * stays server-side; this is not an open proxy).
 */
export const maxDuration = 20;

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { artistName?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const artistName = String(body.artistName ?? "").trim();
  const date = String(body.date ?? "").trim();
  if (!artistName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ match: null });
  }

  const match = await lookupSetlistPreview(artistName, date);
  return NextResponse.json({ match });
}
