import { buildApp } from './app';
import { ensureBootstrapAccount } from './bootstrap';
import { loadConfig } from './config';
import { createDb, migrate } from './db';

const config = loadConfig();
const sql = createDb(config.databaseUrl);
const { app, realtime } = await buildApp(config, { sql });

// База в docker compose может подняться позже приложения — ждём её до минуты, а не падаем.
for (let attempt = 1; ; attempt++) {
  try {
    await migrate(sql, (msg) => app.log.info(msg));
    break;
  } catch (err) {
    if (attempt >= 30) throw err;
    app.log.warn(`database not ready (${(err as Error).message}), retry ${attempt}/30`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await ensureBootstrapAccount(sql, config, (msg) => app.log.warn(msg));
await realtime.start();
await app.listen({ port: config.port, host: config.host });
// Видно при любом уровне логов: по этой строке понятно, что можно открывать браузер.
console.log(`\nDigital Menu запущен (${config.region.toUpperCase()}):\n  панель  ${config.publicUrl}/admin/\n  экран   ${config.publicUrl}/player/\n`);

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
