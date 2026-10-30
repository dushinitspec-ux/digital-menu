import { buildApp } from './app';
import { loadConfig } from './config';
import { createDb, migrate } from './db';

const config = loadConfig();
const sql = createDb(config.databaseUrl);
const { app, realtime } = await buildApp(config, { sql });

await migrate(sql, (msg) => app.log.info(msg));
await realtime.start();
await app.listen({ port: config.port, host: config.host });
app.log.info(`region=${config.region} public=${config.publicUrl}`);

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
