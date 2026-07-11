"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";

import { inviteCodeValid, signIn, signOut } from "@/auth";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { users } from "@/lib/db/schema";

export async function signInAction() {
  await signIn("google");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

/** Username/password sign-in from /login. */
export async function credentialsSignInAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    // signIn throws a redirect on success — only swallow real auth errors.
    if (error instanceof AuthError) redirect("/login?error=invalid");
    throw error;
  }
}

/** Create a username/password account from /login?mode=signup. */
export async function registerAction(formData: FormData) {
  const displayName = String(formData.get("username") ?? "").trim();
  const username = displayName.toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Invite-only while testing: a valid code is required to create an account.
  if (!inviteCodeValid(formData.get("inviteCode") as string))
    redirect("/login?mode=signup&error=code");
  if (!USERNAME_RE.test(displayName))
    redirect("/login?mode=signup&error=badname");
  if (password.length < 8) redirect("/login?mode=signup&error=weak");

  const db = getDb();
  if (!db) redirect("/login?mode=signup&error=unavailable");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));
  if (existing[0]) redirect("/login?mode=signup&error=taken");

  try {
    await db.insert(users).values({
      name: displayName,
      username,
      passwordHash: await hashPassword(password),
    });
  } catch {
    // Unique-index race with a concurrent signup for the same name.
    redirect("/login?mode=signup&error=taken");
  }

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=invalid");
    throw error;
  }
}
