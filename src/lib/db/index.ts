import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { migrations } from "./migrations.generated";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Promise<DB> };
const g = globalThis as unknown as { __brandrail?: Holder };
const holder: Holder = (g.__brandrail ??= {});

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    // Hosted Postgres (Neon on Vercel). prepare:false keeps it compatible with poolers.
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
    return drizzle(client, { schema }) as unknown as DB;
  }
  // Local development: embedded Postgres (PGlite) stored in ./.data
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite("./.data/pglite");
  return drizzle(client, { schema }) as unknown as DB;
}

async function migrate(db: DB) {
  await db.execute(sql`create table if not exists _brandrail_migrations (name text primary key, applied_at timestamptz not null default now())`);
  await db.transaction(async (tx) => {
    // Serialise concurrent cold starts on hosted Postgres.
    await tx.execute(sql`select pg_advisory_xact_lock(724501)`);
    const done = await tx.execute(sql`select name from _brandrail_migrations`);
    const rows = (done as unknown as { rows?: { name: string }[] }).rows ?? (done as unknown as { name: string }[]);
    const applied = new Set(rows.map((r) => r.name));
    for (const m of migrations) {
      if (applied.has(m.name)) continue;
      for (const stmt of m.statements) await tx.execute(sql.raw(stmt));
      await tx.execute(sql`insert into _brandrail_migrations (name) values (${m.name})`);
    }
  });
}

export function getDb(): Promise<DB> {
  holder.db ??= (async () => {
    const db = await connect();
    await migrate(db);
    return db;
  })().catch((err) => {
    holder.db = undefined;
    throw err;
  });
  return holder.db;
}

export { schema };
