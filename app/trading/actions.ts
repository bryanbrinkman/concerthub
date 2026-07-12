"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

/**
 * Toggle "I'm interested" on another collector's print. Expressing interest
 * shares your name/email with the owner (shown on their Trading Post view)
 * so the two of you can arrange a sale or trade off-site.
 */
export async function toggleInterestAction(formData: FormData) {
  const posterId = String(formData.get("posterId") ?? "").trim();
  if (!posterId) return;

  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) return;

  const poster = await db
    .select({ ownerId: t.posters.userId, title: t.posters.title })
    .from(t.posters)
    .where(eq(t.posters.id, posterId));
  // No self-interest: owners already have the print.
  if (!poster[0] || poster[0].ownerId === userId) return;

  const existing = await db
    .select({ id: t.posterInterests.id })
    .from(t.posterInterests)
    .where(
      and(
        eq(t.posterInterests.posterId, posterId),
        eq(t.posterInterests.userId, userId),
      ),
    );

  if (existing[0]) {
    await db
      .delete(t.posterInterests)
      .where(eq(t.posterInterests.id, existing[0].id));
  } else {
    await db
      .insert(t.posterInterests)
      .values({ posterId, userId })
      .onConflictDoNothing();

    // Notify the owner (no-op unless RESEND_API_KEY is configured).
    const [owner] = await db
      .select({ email: t.users.email, name: t.users.name })
      .from(t.users)
      .where(eq(t.users.id, poster[0].ownerId));
    const [interested] = await db
      .select({ email: t.users.email, name: t.users.name })
      .from(t.users)
      .where(eq(t.users.id, userId));
    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        subject: `Someone's interested in your "${poster[0].title}" print`,
        html: `<p>${interested?.name ?? "A collector"} raised a hand on your <strong>${poster[0].title}</strong> print on Concert Collect.</p><p>Reply to them at ${interested?.email ?? "(no email on file)"} to work out a sale or trade — Concert Collect doesn't handle payments.</p><p><a href="https://concertcollect.com/trading">See your prints on the Trading Post</a></p>`,
      });
    }
  }

  revalidatePath("/trading");
}
