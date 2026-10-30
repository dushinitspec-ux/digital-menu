import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres, { type ISql, type Sql } from 'postgres';

export type Db = Sql;
export type Tx = ISql;

export function createDb(url: string, options: { max?: number } = {}): Db {
  return postgres(url, {
    max: options.max ?? 10,
    transform: postgres.camel,
    onnotice: () => {},
  });
}

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

/** Применяет SQL-миграции из apps/api/migrations по порядку имён, каждую в своей транзакции. */
export async function migrate(sql: Db, log: (msg: string) => void = () => {}): Promise<string[]> {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(migrationsDir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    log(`applied migration ${file}`);
    done.push(file);
  }
  return done;
}

export const json = (value: unknown) => JSON.stringify(value);
