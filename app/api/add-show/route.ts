import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import { createShow, type CreateShowInput } from "@/lib/show-create";

/**
 * POST /api/add-show — create a show from the stepped wizard and return
 * its id (so the wizard can offer "add a poster" next). Same creation
 * path as the classic add-show server action.
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: Partial<CreateShowInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const artistName = String(body.artistName ?? "").trim();
  const venueName = String(body.venueName ?? "").trim();
  const date = String(body.date ?? "").trim();
  if (!artistName || !venueName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Artist, venue, and date are required." },
      { status: 400 },
    );
  }

  try {
    const showId = await createShow(db, userId, {
      artistName,
      venueName,
      city: body.city,
      region: body.region,
      country: body.country,
      date,
      showTime: body.showTime,
      eventType: body.eventType,
      eventName: body.eventName,
      endDate: body.endDate,
      tourName: body.tourName,
      lineup: Array.isArray(body.lineup)
        ? body.lineup
            .filter((e) => e && typeof e.name === "string")
            .map((e) => ({ name: String(e.name), role: String(e.role || "support") }))
        : undefined,
      setlistFmUrl: body.setlistFmUrl,
      favorite: Boolean(body.favorite),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ showId });
  } catch (error) {
    console.warn("[add-show] failed:", error);
    return NextResponse.json({ error: "Couldn't add the show." }, { status: 500 });
  }
}
