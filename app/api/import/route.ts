import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import { importPageForUser } from "@/lib/import";

export const maxDuration = 60;

/**
 * Chunked import endpoint: imports ONE page (~20 shows) of a setlist.fm
 * attendance history per call. The client (components/import-runner.tsx)
 * loops pages and renders live progress.
 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) {
    return NextResponse.json({ error: "Sign in to import." }, { status: 401 });
  }

  let body: { username?: string; page?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const username = String(body.username ?? "").trim();
  const page = Math.max(1, Number(body.page) || 1);
  if (!username) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

  const result = await importPageForUser(db, userId, username, page);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Import failed." },
      { status: 502 },
    );
  }

  revalidatePath("/", "layout");
  return NextResponse.json(result);
}
