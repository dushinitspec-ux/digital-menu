import { createDb, migrate } from './db';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = createDb(url, { max: 1 });
const applied = await migrate(sql, (msg) => console.log(msg));
console.log(applied.length ? `done: ${applied.length} migration(s)` : 'database is up to date');
await sql.end();
