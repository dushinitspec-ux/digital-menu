#!/usr/bin/env node
/**
 * Сквозной тест «как у владельца кофейни»: регистрация в панели, подключение ТВ по коду,
 * правка цены и стопа с доставкой на экран за секунды, запуск экрана без интернета.
 *
 *   pnpm build && pnpm e2e
 *
 * Нужны PostgreSQL (E2E_DATABASE_URL, база будет очищена) и Playwright с Chromium
 * (`npm i -g playwright && npx playwright install chromium`).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const DB = process.env.E2E_DATABASE_URL ?? 'postgres://dm:dm@127.0.0.1:5432/digital_menu_test';
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(root, 'e2e/output');
const MAX_UPDATE_MS = 3000;

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const { execSync } = await import('node:child_process');
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
  }
}

for (const f of ['apps/api/dist/index.js', 'apps/admin/dist/index.html', 'apps/player/dist/index.html']) {
  if (!existsSync(path.join(root, f))) {
    console.error(`Missing ${f}. Run "pnpm build" first.`);
    process.exit(1);
  }
}
mkdirSync(OUT, { recursive: true });

// Чистая база.
const pgPath = createRequire(path.join(root, 'apps/api/package.json')).resolve('postgres');
const { default: postgres } = await import(pgPath);
const sql = postgres(DB, { max: 1, onnotice: () => {} });
await sql`drop schema public cascade`;
await sql`create schema public`;
await sql.end();

const server = spawn(process.execPath, ['dist/index.js'], {
  cwd: path.join(root, 'apps/api'),
  env: {
    ...process.env,
    DATABASE_URL: DB,
    REGION: 'ru',
    PUBLIC_URL: BASE,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'warn',
    STORAGE_DIR: mkdtempSync(path.join(tmpdir(), 'dm-e2e-')),
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const steps = [];
const step = async (name, fn) => {
  const started = Date.now();
  try {
    const note = await fn();
    steps.push({ name, ok: true, ms: Date.now() - started, note });
    console.log(`  ✓ ${name}${note ? ` — ${note}` : ''}`);
  } catch (err) {
    steps.push({ name, ok: false });
    console.log(`  ✗ ${name}\n    ${err.message.split('\n')[0]}`);
    throw err;
  }
};

let browser;
let exitCode = 0;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) break;
    } catch {}
    if (i > 60) throw new Error('API did not start');
    await new Promise((r) => setTimeout(r, 250));
  }

  const { chromium } = await loadPlaywright();
  browser = await chromium.launch();
  const owner = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'ru-RU' })).newPage();
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvContext.newPage();
  const errors = [];
  owner.on('pageerror', (e) => errors.push(`admin: ${e.message}`));
  tv.on('pageerror', (e) => errors.push(`player: ${e.message}`));

  console.log('e2e:');
  await step('владелец регистрирует кофейню', async () => {
    await owner.goto(`${BASE}/admin/register`);
    await owner.getByLabel('Ваше имя').fill('Анна');
    await owner.getByLabel('Название заведения').fill('Кофейня «Зерно»');
    await owner.getByRole('button', { name: 'Кофейня' }).click();
    await owner.getByLabel('E-mail').fill(`owner-${Date.now()}@example.com`);
    await owner.getByLabel('Пароль').fill('secret-password');
    await owner.getByRole('button', { name: 'Создать аккаунт' }).click();
    await owner.waitForURL('**/admin/screens');
  });

  let code = '';
  await step('телевизор показывает код подключения', async () => {
    await tv.goto(`${BASE}/player/`);
    await tv.waitForFunction(() => /\d{3} \d{3}/.test(document.querySelector('.pp-code')?.textContent ?? ''));
    code = (await tv.locator('.pp-code').innerText()).replace(/\D/g, '');
    return code;
  });

  await step('владелец вводит код — на ТВ появляется меню', async () => {
    await owner.getByRole('button', { name: 'Добавить экран' }).first().click();
    await owner.getByLabel('Код с экрана телевизора').fill(code);
    await owner.getByLabel('Название экрана').fill('ТВ над баром');
    await owner.locator('.sheet-foot').getByRole('button', { name: 'Добавить' }).click();
    await owner.waitForURL('**/admin/screens/*');
    await tv.waitForSelector('.dm-scene.is-shown', { timeout: 15000 });
    await tv.waitForFunction(() => document.body.innerText.includes('Капучино'));
  });

  await step(`новая цена на экране быстрее ${MAX_UPDATE_MS} мс`, async () => {
    await owner.getByRole('link', { name: 'Меню' }).first().click();
    const espresso = owner.locator('.item-row', { hasText: 'Эспрессо' });
    await espresso.locator('.price-btn').click();
    await espresso.locator('.price-input').fill('175');
    const started = Date.now();
    await espresso.locator('.price-input').press('Enter');
    await tv.waitForFunction(() => document.body.innerText.includes('175'), null, { timeout: MAX_UPDATE_MS });
    return `${Date.now() - started} мс`;
  });

  await step('позиция на стопе помечается на экране', async () => {
    await owner.locator('.item-row', { hasText: 'Капучино' }).getByRole('switch').click();
    await tv.waitForSelector('.dm-item.is-soldout', { timeout: MAX_UPDATE_MS });
  });

  await step('экран запускается без интернета из кэша', async () => {
    await tv.waitForTimeout(9000); // плеер докладывает оболочку в кэш Service Worker
    await tvContext.setOffline(true);
    await tv.reload();
    await tv.waitForSelector('.dm-scene.is-shown', { timeout: 15000 });
    await tv.waitForFunction(() => document.body.innerText.includes('175'));
    await tv.waitForTimeout(2500); // дождаться анимации появления
    await tv.screenshot({ path: path.join(OUT, 'tv-offline.png') });
    await tvContext.setOffline(false);
  });

  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  console.log(`\nall ${steps.length} steps passed`);
} catch (err) {
  exitCode = 1;
  console.error(`\nFAILED: ${err.message}`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
process.exit(exitCode);
