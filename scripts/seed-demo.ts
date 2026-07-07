/**
 * Copy the demo archive (lib/data.ts) into a real user's account.
 *
 * Usage:
 *   1. Sign in to the app once so your user row exists.
 *   2. DATABASE_URL=postgres://... npm run db:seed-demo -- you@example.com
 *      (DATABASE_URL is also read from .env.local if present.)
 *
 * Idempotent: rows reuse the seed ids / unique keys, so re-runs no-op.
 */

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import * as schema from "../lib/db/schema";
import { seedDemoForUser } from "../lib/demo-seed";

const t = schema;

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — rely on the environment */
  }
}

async function main() {
  loadEnvLocal();
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run db:seed-demo -- you@example.com");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const db = drizzle(neon(process.env.DATABASE_URL), { schema });

  const userRows = await db
    .select({ id: t.users.id })
    .from(t.users)
    .where(eq(t.users.email, email));
  const user = userRows[0];
  if (!user) {
    throw new Error(
      `No user with email ${email} — sign in to the app once first.`,
    );
  }

  await seedDemoForUser(db, user.id);
  console.log(`Seeded demo archive for ${email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
