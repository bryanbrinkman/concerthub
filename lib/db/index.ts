import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Neon + Drizzle client, created lazily so the app still boots (in demo
 * mode) when DATABASE_URL isn't configured.
 */

type DbClient = ReturnType<typeof createDb>;

function createDb() {
  const sql = neon(process.env.DATABASE_URL as string);
  return drizzle(sql, { schema });
}

let _db: DbClient | null | undefined;

export function getDb(): DbClient | null {
  if (_db === undefined) {
    _db = process.env.DATABASE_URL ? createDb() : null;
  }
  return _db;
}

export type Db = DbClient;
