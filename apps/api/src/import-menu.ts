// Импорт меню сети из файла в базу контура:
//   OWNER_PASSWORD=… pnpm --filter @dm/api import-menu -- ../../menus/understone/menu.json \
//     --owner-email owner@example.com --owner-name "Имя" [--owner-locale ru] [--replace]
// Пароль нужен, только если владельца ещё нет. Переменные окружения — те же, что у API (.env).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { localeSchema, menuFileSchema } from '@dm/shared';
import { z } from 'zod';
import { loadConfig } from './config';
import { createDb, migrate } from './db';
import { importMenu, ImportError } from './menu-import';
import { notifyOrgChanged } from './realtime';
import { createStorage } from './storage';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'owner-email': { type: 'string' },
    'owner-name': { type: 'string' },
    'owner-locale': { type: 'string', default: 'ru' },
    replace: { type: 'boolean', default: false },
  },
});

const cwd = process.env.INIT_CWD ?? process.cwd();
if (positionals.length !== 1 || !args['owner-email']) {
  console.error('Usage: import-menu <menu.json> --owner-email <email> [--owner-name <name>] [--owner-locale ru|en|tr] [--replace]');
  process.exit(1);
}
const file = path.resolve(cwd, positionals[0]!);
const parsed = menuFileSchema.safeParse(JSON.parse(await readFile(file, 'utf8')));
if (!parsed.success) {
  console.error(`${path.relative(cwd, file)} is invalid:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const config = loadConfig();
const sql = createDb(config.databaseUrl, { max: 2 });
try {
  await migrate(sql, (msg) => console.log(msg));
  const storage = createStorage(config);
  const menuDir = path.dirname(file);
  const result = await importMenu(sql, storage, parsed.data, {
    region: config.region,
    owner: {
      email: args['owner-email'],
      name: args['owner-name'] ?? args['owner-email'],
      password: process.env.OWNER_PASSWORD,
      locale: localeSchema.parse(args['owner-locale']),
    },
    replace: args.replace,
    readImage: (p) => {
      const full = path.resolve(menuDir, p);
      if (!full.startsWith(menuDir + path.sep)) throw new ImportError(`Image ${p} is outside the menu folder`);
      return readFile(full);
    },
  });
  await notifyOrgChanged(sql, result.orgId);
  console.log(
    `${result.created ? 'Created' : 'Updated'} "${parsed.data.org.name}" (${result.orgId}): ` +
      `${result.categories} categories, ${result.items} items, ${result.images} photos, ${result.scenes} scenes, ` +
      `${result.locations} new locations, ${result.screensUpdated} screens relinked`,
  );
} catch (err) {
  if (!(err instanceof ImportError)) throw err;
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
