import { heartbeatInput, type PlayerEvent } from '@dm/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Ctx } from '../context';
import { HttpError, isUuid, notFound, parse, unauthorized } from '../http';
import { buildManifest, loadScreenByToken } from '../manifest';
import { pairingCode, sha256 } from '../security';

const PAIRING_TTL_MIN = 30;
const KEEPALIVE_MS = 25_000;

const pairingInput = z.object({ token: z.string().min(32).max(200) });

function bearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const token = (req.query as { token?: string }).token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * API телевизора. Экран авторизуется своим токеном: его генерирует сам плеер при сопряжении,
 * сервер хранит только SHA-256.
 */
export function registerPlayerRoutes(app: FastifyInstance, { sql, storage, realtime }: Ctx) {
  async function screenFromRequest(req: FastifyRequest) {
    const token = bearer(req);
    if (!token) throw unauthorized();
    const screen = await loadScreenByToken(sql, sha256(token));
    if (!screen) throw unauthorized();
    return screen;
  }

  app.post('/api/player/pairings', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = parse(pairingInput, req.body);
    const tokenHash = sha256(token);
    await sql`delete from screen_pairings where expires_at < now() - interval '1 day'`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = pairingCode();
      try {
        const [row] = await sql<{ id: string; expiresAt: Date }[]>`
          insert into screen_pairings (code, token_hash, expires_at)
          values (${code}, ${tokenHash}, now() + make_interval(mins => ${PAIRING_TTL_MIN}))
          on conflict (token_hash) do update set expires_at = excluded.expires_at
          returning id, code, expires_at`;
        return reply.code(201).send(row);
      } catch (err) {
        // Совпадение активного кода с чужим — пробуем другой. Просроченные неиспользованные коды освобождаем.
        if ((err as { code?: string }).code !== '23505') throw err;
        await sql`delete from screen_pairings where screen_id is null and expires_at < now()`;
      }
    }
    throw new HttpError(503, 'pairing_unavailable');
  });

  app.get('/api/player/pairings/:id', async (req) => {
    const { id } = req.params as { id: string };
    const token = bearer(req);
    if (!isUuid(id) || !token) throw notFound();
    const [row] = await sql<{ screenId: string | null; expired: boolean }[]>`
      select screen_id, expires_at < now() as expired from screen_pairings
      where id = ${id} and token_hash = ${sha256(token)}`;
    if (!row) throw notFound();
    if (row.screenId) {
      const screen = await loadScreenByToken(sql, sha256(token));
      if (screen) return { status: 'claimed', screenId: screen.id };
    }
    return { status: row.expired ? 'expired' : 'pending' };
  });

  app.get('/api/player/manifest', async (req, reply) => {
    const screen = await screenFromRequest(req);
    const manifest = await buildManifest(sql, storage, screen);
    const etag = `"${manifest.version}"`;
    reply.header('cache-control', 'no-cache').header('etag', etag);
    if (req.headers['if-none-match'] === etag) return reply.code(304).send();
    return manifest;
  });

  app.post('/api/player/heartbeat', async (req) => {
    const screen = await screenFromRequest(req);
    const status = parse(heartbeatInput, req.body);
    await sql`update screens set last_seen_at = now(), last_status = ${sql.json({ ...status, ip: req.ip })}
      where id = ${screen.id}`;
    return { ok: true, serverTime: new Date().toISOString() };
  });

  /** Server-Sent Events: экран узнаёт об изменениях за доли секунды и сам перечитывает манифест. */
  app.get('/api/player/events', async (req, reply) => {
    const screen = await screenFromRequest(req);
    await sql`update screens set last_seen_at = now() where id = ${screen.id}`;
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write('retry: 5000\n\n');
    const write = (event: PlayerEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const client = { orgId: screen.orgId, screenId: screen.id, send: write };
    realtime.add(client);
    write({ type: 'manifest' });
    const keepalive = setInterval(() => res.write(': ping\n\n'), KEEPALIVE_MS);
    req.raw.on('close', () => {
      clearInterval(keepalive);
      realtime.remove(client);
    });
  });
}
