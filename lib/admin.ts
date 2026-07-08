import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin access: a single shared password (ADMIN_PASSWORD env var).
 * Logging in stores a derived token in an httpOnly cookie — never the
 * password itself, and nothing client-readable.
 */

export const ADMIN_COOKIE = "cc-admin";

export const adminEnabled = (): boolean => Boolean(process.env.ADMIN_PASSWORD);

/** Token = sha256(password : AUTH_SECRET) — rotating either invalidates. */
export function adminToken(): string {
  return createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
  const actual = Buffer.from(password);
  return (
    expected.length > 0 &&
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}
