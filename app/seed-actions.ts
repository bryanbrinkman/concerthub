"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import { seedDemoForUser } from "@/lib/demo-seed";

/** Browser-only replacement for scripts/seed-demo.ts: copy the demo
 * archive into the signed-in user's account. */
export async function seedDemoAction() {
  const userId = await currentUserId();
  const db = getDb();
  if (!userId || !db) return;

  await seedDemoForUser(db, userId);
  revalidatePath("/", "layout");
  redirect("/shows");
}
