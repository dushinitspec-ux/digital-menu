#!/usr/bin/env node
// Записывает ролики меню в MP4 (H.264, 30 fps, 1920×1080 или 1080×1920).
// Страница из dist/ рисует меню тем же рендерером, что и ТВ-плеер. Время страницы — подменные часы
// Playwright, CSS-анимации ставятся на паузу и выставляются на момент каждого кадра, поэтому ролик
// плавный при любой скорости машины.
//
//   pnpm --filter @dm/video render -- ../../menus/understone/menu.json --orientation both
//
// Нужны ffmpeg в PATH и Chromium для Playwright (npx playwright install chromium).

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.env.INIT_CWD ?? process.cwd();

const USAGE = `Usage: render.mjs <menu.json> [options]
  --out <dir>             куда сложить ролики (по умолчанию apps/video/output)
  --orientation <o>       landscape | portrait | both (по умолчанию landscape)
  --only <id,...>         снять только эти ролики (список — с --list)
  --fps <n>               кадров в секунду (по умолчанию 30)
  --seconds <n>           обрезать каждый ролик до n секунд
  --list                  только показать, какие ролики есть в меню`;

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    orientation: { type: 'string', default: 'landscape' },
    only: { type: 'string' },
    fps: { type: 'string', default: '30' },
    seconds: { type: 'string' },
    list: { type: 'boolean', default: false },
  },
});

if (positionals.length !== 1) {
  console.error(USAGE);
  process.exit(1);
}
const menuPath = path.resolve(cwd, positionals[0]);
const outDir = path.resolve(cwd, args.out ?? path.join(here, 'output'));
const fps = Number(args.fps);
const orientations = args.orientation === 'both' ? ['landscape', 'portrait'] : [args.orientation];
if (!orientations.every((o) => o === 'landscape' || o === 'portrait') || !(fps > 0)) {
  console.error(USAGE);
  process.exit(1);
}
const SIZE = { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 } };

const menu = JSON.parse(await readFile(menuPath, 'utf8'));
const distDir = path.join(here, 'dist');
const assetsDir = path.dirname(menuPath);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Раздаёт сборку страницы и фото из папки меню (/menu-assets/…). Только чтение, только внутри этих папок. */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const [root, rel] = url.pathname.startsWith('/menu-assets/')
    ? [assetsDir, decodeURIComponent(url.pathname.slice('/menu-assets/'.length))]
    : [distDir, decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1))];
  const file = path.resolve(root, rel);
  try {
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw new Error('not found');
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();

async function openPage(orientation, job) {
  const context = await browser.newContext({ viewport: SIZE[orientation], deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.error(`  page error: ${err.message}`));
  page.on('console', (msg) => msg.type() === 'error' && console.error(`  console: ${msg.text()}`));
  await page.addInitScript((input) => {
    window.__DM_INPUT__ = input;
  }, { menu, job, orientation, assetBase: `${base}menu-assets/` });
  // Часы ставим до загрузки и сразу останавливаем: без pauseAt они идут в реальном времени,
  // а так все setTimeout/setInterval/requestAnimationFrame страницы срабатывают только по runFor.
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1000);
  await page.goto(base);
  return page;
}

/** Ждём значение со страницы, опрашивая её реальным временем: таймеры страницы заморожены. */
async function waitForValue(page, read, timeoutMs = 60_000) {
  const started = Date.now();
  for (;;) {
    const value = await page.evaluate(read);
    if (value !== undefined && value !== null) return value;
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for the page');
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function record(page, file, durationMs) {
  const frames = Math.round((durationMs / 1000) * fps);
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-level', '4.2',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      file,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = once(ffmpeg, 'close');
  const posterAt = Math.min(frames - 1, Math.round(fps * 4));
  let elapsed = 0;
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    const t = Math.round((f * 1000) / fps);
    if (t > elapsed) {
      await page.clock.runFor(t - elapsed);
      elapsed = t;
    }
    await page.evaluate((now) => window.__DM_TICK__(now), t);
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (f === posterAt) await writeFile(file.replace(/\.mp4$/, '.jpg'), jpeg);
    if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, 'drain');
    if (f % (fps * 5) === 0) process.stdout.write(`\r  ${Math.round((f / frames) * 100)}%`);
  }
  ffmpeg.stdin.end();
  const [code] = await done;
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  process.stdout.write(`\r  ${frames} frames in ${Math.round((Date.now() - started) / 1000)}s\n`);
}

try {
  const planPage = await openPage('landscape', null);
  const plan = await waitForValue(planPage, () => window.__DM_PLAN__);
  await planPage.context().close();
  if (plan.error) throw new Error(`Menu file is invalid:\n${plan.error}`);

  const only = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null;
  if (args.list) {
    for (const job of plan.jobs) console.log(`${job.id}\t${job.title}`);
  } else {
    await mkdir(outDir, { recursive: true });
    for (const orientation of orientations) {
      for (const job of plan.jobs.filter((j) => !only || only.has(j.id))) {
        const page = await openPage(orientation, job.id);
        const ready = await waitForValue(page, () => window.__DM_READY__ ?? window.__DM_PLAN__?.error);
        if (typeof ready === 'string') throw new Error(ready);
        const durationMs = args.seconds ? Math.min(ready, Number(args.seconds) * 1000) : ready;
        const file = path.join(outDir, `${job.id}-${orientation}.mp4`);
        console.log(`${job.title} · ${orientation} · ${Math.round(durationMs / 1000)}s → ${path.relative(cwd, file)}`);
        await record(page, file, durationMs);
        await page.context().close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
