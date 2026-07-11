import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

/**
 * Auth is on when the core env vars exist (DATABASE_URL + AUTH_SECRET);
 * otherwise the app serves the read-only demo archive. Google sign-in
 * additionally needs AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET — without them,
 * username/password login still works.
 */
export const authEnabled = Boolean(
  process.env.DATABASE_URL && process.env.AUTH_SECRET,
);

/** Google OAuth is offered only when its env vars are configured. */
export const googleEnabled = Boolean(
  authEnabled &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET,
);

/** Names (never values) of required env vars absent at runtime — surfaced
 * in the sidebar while auth is unconfigured to make setup debuggable. */
export function missingAuthEnv(): string[] {
  return ["DATABASE_URL", "AUTH_SECRET"].filter(
    (name) => !process.env[name],
  );
}

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
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      name: "Username & password",
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!username || !password || !db) return null;
        const [row] = await db
          .select()
          .from(users)
          .where(eq(users.username, username));
        if (!row?.passwordHash) return null;
        if (!(await verifyPassword(password, row.passwordHash))) return null;
        return {
          id: row.id,
          name: row.name ?? row.username,
          email: row.email,
          image: row.image,
        };
      },
    }),
  ],
  // JWT sessions: required for the Credentials provider (database
  // sessions only work with OAuth). The adapter still stores users and
  // Google account links.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) (session.user as { id?: string }).id = token.sub;
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
