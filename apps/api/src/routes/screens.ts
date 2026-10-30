import { claimScreenInput, screenPatch } from '@dm/shared';
import type { FastifyInstance } from 'fastify';
import { audit, requireOrg } from '../auth';
import type { Ctx } from '../context';
import { HttpError, isUuid, notFound, parse } from '../http';

/** Экран считается в сети, если пульс приходил не позже этого срока (плеер шлёт его раз в минуту). */
const ONLINE_WINDOW_SEC = 150;

export function registerScreenRoutes(app: FastifyInstance, { sql, realtime }: Ctx) {
  const P = '/api/orgs/:orgId';
  const idOf = (params: unknown) => {
    const id = (params as { id?: string }).id ?? '';
    if (!isUuid(id)) throw notFound();
    return id;
  };

  app.get(`${P}/screens`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    const rows = await sql<{ id: string; recentlySeen: boolean }[]>`
      select s.id, s.name, s.location_id, l.name as location_name, s.orientation, s.schedule, s.paired_at,
             s.last_seen_at, s.last_status, s.created_at,
             coalesce(s.last_seen_at > now() - make_interval(secs => ${ONLINE_WINDOW_SEC}), false) as recently_seen
      from screens s join locations l on l.id = s.location_id
      where s.org_id = ${ctx.org.id} order by l.created_at, s.created_at`;
    return rows.map(({ recentlySeen, ...s }) => ({ ...s, online: recentlySeen || realtime.isConnected(ctx.org.id, s.id) }));
  });

  /** Владелец вводит код с экрана телевизора — экран привязывается к точке. */
  app.post(`${P}/screens/claim`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const input = parse(claimScreenInput, req.body);
    const [location] = await sql`select 1 from locations where id = ${input.locationId} and org_id = ${ctx.org.id}`;
    if (!location) throw new HttpError(400, 'validation', 'Unknown location');
    const screen = await sql.begin(async (tx) => {
      const [pairing] = await tx<{ id: string; tokenHash: string }[]>`
        select id, token_hash from screen_pairings
        where code = ${input.code} and screen_id is null and expires_at > now()
        for update`;
      if (!pairing) throw new HttpError(404, 'invalid_code');
      const [firstScene] = await tx<{ id: string }[]>`
        select id from scenes where org_id = ${ctx.org.id} order by created_at limit 1`;
      const schedule = { defaultSceneId: firstScene?.id ?? null, rules: [] };
      const [row] = await tx<{ id: string }[]>`
        insert into screens (org_id, location_id, name, schedule, device_token_hash, paired_at)
        values (${ctx.org.id}, ${input.locationId}, ${input.name}, ${tx.json(schedule)}, ${pairing.tokenHash}, now())
        returning id, name, location_id, orientation, schedule, paired_at`;
      await tx`update screen_pairings set screen_id = ${row!.id} where id = ${pairing.id}`;
      await audit(tx, ctx, 'create', 'screen', row!.id, { name: input.name });
      return row!;
    });
    return reply.code(201).send(screen);
  });

  app.patch(`${P}/screens/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const id = idOf(req.params);
    const input = parse(screenPatch, req.body);
    if (input.locationId) {
      const [loc] = await sql`select 1 from locations where id = ${input.locationId} and org_id = ${ctx.org.id}`;
      if (!loc) throw new HttpError(400, 'validation', 'Unknown location');
    }
    if (input.schedule) {
      const sceneIds = [input.schedule.defaultSceneId, ...input.schedule.rules.map((r) => r.sceneId)].filter(
        (s): s is string => Boolean(s),
      );
      const unique = [...new Set(sceneIds)];
      const [found] = await sql<{ count: number }[]>`
        select count(*)::int as count from scenes where org_id = ${ctx.org.id} and id = any(${unique}::uuid[])`;
      if (found?.count !== unique.length) throw new HttpError(400, 'validation', 'Unknown scene in schedule');
    }
    const patch: Record<string, unknown> = { ...input };
    if (input.schedule) patch.schedule = sql.json(input.schedule);
    const [row] = Object.keys(patch).length
      ? await sql`update screens set ${sql(patch)} where id = ${id} and org_id = ${ctx.org.id}
          returning id, name, location_id, orientation, schedule`
      : await sql`select id, name, location_id, orientation, schedule from screens where id = ${id} and org_id = ${ctx.org.id}`;
    if (!row) throw notFound();
    await audit(sql, ctx, 'update', 'screen', id, { name: input.name, locationId: input.locationId });
    realtime.orgChanged(ctx.org.id);
    return row;
  });

  app.delete(`${P}/screens/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const id = idOf(req.params);
    const res = await sql`delete from screens where id = ${id} and org_id = ${ctx.org.id}`;
    if (res.count === 0) throw notFound();
    await realtime.screenEvent(ctx.org.id, id, { type: 'unpaired' });
    await audit(sql, ctx, 'delete', 'screen', id);
    return { ok: true };
  });

  /** Удалённая перезагрузка плеера — первое, что делает поддержка. */
  app.post(`${P}/screens/:id/reload`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idOf(req.params);
    const [row] = await sql`select 1 from screens where id = ${id} and org_id = ${ctx.org.id}`;
    if (!row) throw notFound();
    await realtime.screenEvent(ctx.org.id, id, { type: 'reload' });
    return { ok: true };
  });
}
