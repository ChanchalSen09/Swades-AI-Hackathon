import { env } from "@my-better-t-app/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export function createDb() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
      ...(env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : {}),
    },
  });

  return drizzle({ client: pool, schema });
}

export const db = createDb();

export * from "./schema";
