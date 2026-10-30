import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, migrate } from '../src/db';
import { Realtime } from '../src/realtime';

export const TEST_DB = process.env.DATABASE_URL_TEST ?? 'postgres://dm:dm@127.0.0.1:5432/digital_menu_test';

export async function setupApp(region: 'ru' | 'eu' = 'ru', extraEnv: Record<string, string> = {}) {
  const storageDir = await mkdtemp(path.join(tmpdir(), 'dm-storage-'));
  const config = loadConfig({
    DATABASE_URL: TEST_DB,
    REGION: region,
    PUBLIC_URL: 'http://localhost:3000',
    OTHER_REGION_URL: region === 'ru' ? 'https://eu.example.com' : 'https://ru.example.com',
    STORAGE_DIR: storageDir,
    ADMIN_DIST: '/nonexistent',
    PLAYER_DIST: '/nonexistent',
    LOG_LEVEL: 'silent',
    AUTH_RATE_LIMIT: '1000',
    ...extraEnv,
  });
  const sql = createDb(TEST_DB, { max: 5 });
  await sql`drop schema public cascade`;
  await sql`create schema public`;
  await migrate(sql);
  const realtime = new Realtime(sql, 20);
  const { app, storage } = await buildApp(config, { sql, realtime, logger: false });
  await realtime.start();
  await app.ready();
  return {
    app,
    sql,
    storage,
    config,
    async close() {
      await app.close();
      await sql.end({ timeout: 1 });
    },
  };
}

type App = Awaited<ReturnType<typeof setupApp>>['app'];

/** Клиент панели: хранит cookie сессии и шлёт анти-CSRF заголовок, как настоящая SPA. */
export function client(app: App) {
  let cookie = '';
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, body?: unknown) => {
    const res = await app.inject({
      method,
      url,
      headers: { 'x-dm-client': '1', ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { payload: body as Record<string, unknown> } : {}),
    });
    const setCookie = res.cookies.find((c) => c.name === 'dm_session');
    if (setCookie) cookie = `dm_session=${setCookie.value}`;
    return { status: res.statusCode, body: res.body ? safeJson(res.body) : null, headers: res.headers };
  };
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, body: unknown = {}) => call('POST', url, body),
    patch: (url: string, body: unknown) => call('PATCH', url, body),
    put: (url: string, body: unknown) => call('PUT', url, body),
    del: (url: string) => call('DELETE', url),
    get cookie() {
      return cookie;
    },
  };
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const registration = (over: Record<string, unknown> = {}) => ({
  email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
  password: 'secret-password',
  name: 'Анна',
  orgName: 'Кофейня на Мясницкой',
  businessType: 'coffee',
  locale: 'ru',
  country: 'RU',
  timezone: 'Europe/Moscow',
  ...over,
});
