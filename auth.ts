import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

/**
 * Auth is on only when every required env var exists; otherwise the app
 * serves the read-only demo archive. Required: DATABASE_URL, AUTH_SECRET,
 * AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (see .env.example).
 */
export const authEnabled = Boolean(
  process.env.DATABASE_URL &&
    process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET,
);

const db = getDb();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers: [Google],
  trustHost: true,
  callbacks: {
    session({ session, user }) {
      // Expose the DB user id to server code (database session strategy).
      (session.user as { id?: string }).id = user.id;
      return session;
    },
  },
});

/** The signed-in user's id, or undefined (signed out / auth disabled). */
export async function currentUserId(): Promise<string | undefined> {
  if (!authEnabled) return undefined;
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id;
}
