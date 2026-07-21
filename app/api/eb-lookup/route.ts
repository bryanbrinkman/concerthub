import { NextResponse } from "next/server";

import { currentUserId } from "@/auth";
import {
  getExpressoBeansDetails,
  parseExpressoBeansUrl,
} from "@/lib/expressobeans";

/**
 * POST /api/eb-lookup { url }
 *
 * Parse a pasted Expresso Beans item link and return catalog facts
 * (edition size, dimensions, technique) to prefill the add-poster form.
 * Signed-in only; one cached page read per item — not a crawler.
 */
export const maxDuration = 20;

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const id = parseExpressoBeansUrl(String(body.url ?? ""));
  if (!id) {
    return NextResponse.json({
      details: null,
      error: "That doesn't look like an Expresso Beans item link.",
    });
  }

  const details = (await getExpressoBeansDetails(id)) ?? null;
  return NextResponse.json({
    details,
    error: details ? undefined : "Couldn't read that Expresso Beans page.",
  });
}
