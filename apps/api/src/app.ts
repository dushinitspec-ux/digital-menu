import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import { loadSessionUser, SESSION_COOKIE } from './auth';
import type { Config } from './config';
import type { Ctx } from './context';
import type { Db } from './db';
import { HttpError } from './http';
import { Realtime } from './realtime';
import { registerAuthRoutes } from './routes/auth';
import { registerCatalogRoutes } from './routes/catalog';
import { registerMediaRoutes } from './routes/media';
import { registerOrgRoutes } from './routes/org';
import { registerPlayerRoutes } from './routes/player';
import { registerSceneRoutes } from './routes/scenes';
import { registerScreenRoutes } from './routes/screens';
import { createStorage, IMMUTABLE_CACHE, type Storage } from './storage';

export interface AppDeps {
  sql: Db;
  storage?: Storage;
  realtime?: Realtime;
  logger?: boolean;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function buildApp(config: Config, deps: AppDeps) {
  const app = Fastify({
    logger: deps.logger === false ? false : { level: config.logLevel },
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });
  const storage = deps.storage ?? createStorage(config);
  const realtime = deps.realtime ?? new Realtime(deps.sql);
  const ctx: Ctx = { sql: deps.sql, config, storage, realtime };

  await app.register(cookie);
  await app.register(multipart);
  await app.register(rateLimit, { global: false });

  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    const url = req.url;
    if (!url.startsWith('/api/') || url.startsWith('/api/player/')) return;
    // Защита от CSRF: браузер не пошлёт этот заголовок с чужого сайта без CORS, а CORS мы не включаем.
    if (!SAFE_METHODS.has(req.method) && req.headers['x-dm-client'] !== '1') {
      throw new HttpError(403, 'csrf');
    }
    req.user = await loadSessionUser(deps.sql, req.cookies[SESSION_COOKIE]);
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ error: err.code, message: err.message, details: err.details });
    }
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'file_too_large' });
    if (err.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') return reply.code(400).send({ error: 'no_file' });
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ error: err.code ?? 'bad_request', message: err.message });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: 'internal' });
  });

  app.get('/api/health', async () => {
    await deps.sql`select 1`;
    return { ok: true, region: config.region };
  });

  registerAuthRoutes(app, ctx);
  registerOrgRoutes(app, ctx);
  registerCatalogRoutes(app, ctx);
  registerMediaRoutes(app, ctx);
  registerSceneRoutes(app, ctx);
  registerScreenRoutes(app, ctx);
  registerPlayerRoutes(app, ctx);

  // Медиа из локального хранилища (в продакшене их обычно отдаёт S3 + CDN).
  if (storage.localDir) {
    mkdirSync(storage.localDir, { recursive: true });
    await app.register(fastifyStatic, {
      root: storage.localDir,
      prefix: '/media/',
      decorateReply: false,
      immutable: true,
      maxAge: '365d',
      acceptRanges: true,
      setHeaders: (res) => res.header('cache-control', IMMUTABLE_CACHE),
    });
  }

  // Собранные панель и плеер. index.html и sw.js не кэшируются, ассеты с хэшем — навсегда.
  const spas: { prefix: string; dir: string }[] = [
    { prefix: '/admin/', dir: config.adminDist },
    { prefix: '/player/', dir: config.playerDist },
  ].filter((s) => existsSync(path.join(s.dir, 'index.html')));
  for (const spa of spas) {
    await app.register(fastifyStatic, {
      root: spa.dir,
      prefix: spa.prefix,
      decorateReply: spa === spas[0],
      wildcard: true,
      setHeaders: (res, filePath) => {
        const name = path.basename(filePath);
        if (name === 'index.html' || name === 'sw.js' || name.endsWith('.webmanifest')) {
          res.header('cache-control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.header('cache-control', IMMUTABLE_CACHE);
        }
      },
    });
  }

  app.get('/', async (_req, reply) => reply.redirect('/admin/'));

  app.setNotFoundHandler(async (req, reply) => {
    const spa = spas.find((s) => req.url.startsWith(s.prefix) || req.url === s.prefix.slice(0, -1));
    if (spa && req.method === 'GET' && !path.extname(req.url.split('?')[0]!)) {
      return reply.header('cache-control', 'no-cache').sendFile('index.html', spa.dir);
    }
    return reply.code(404).send({ error: 'not_found' });
  });

  app.addHook('onClose', async () => {
    await realtime.stop();
  });

  return { app, realtime, storage };
}
