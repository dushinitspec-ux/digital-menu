import { sceneInput, scenePatch } from '@dm/shared';
import type { FastifyInstance } from 'fastify';
import { audit, requireOrg } from '../auth';
import type { Ctx } from '../context';
import { conflict, isUuid, notFound, parse } from '../http';
import { buildScenes, normalizeSettings } from '../manifest';

export function registerSceneRoutes(app: FastifyInstance, { sql, storage, realtime }: Ctx) {
  const P = '/api/orgs/:orgId';
  const idOf = (params: unknown) => {
    const id = (params as { id?: string }).id ?? '';
    if (!isUuid(id)) throw notFound();
    return id;
  };

  app.get(`${P}/scenes`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    const rows = await sql<{ settings: Record<string, unknown> }[]>`
      select id, name, template, settings, created_at, updated_at from scenes where org_id = ${ctx.org.id} order by created_at`;
    return rows.map((r) => ({ ...r, settings: normalizeSettings(r.settings) }));
  });

  app.post(`${P}/scenes`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const input = parse(sceneInput, req.body);
    const settings = normalizeSettings(input.settings);
    const [row] = await sql<{ id: string }[]>`
      insert into scenes (org_id, name, template, settings)
      values (${ctx.org.id}, ${input.name}, ${input.template}, ${sql.json(settings as never)}) returning *`;
    await audit(sql, ctx, 'create', 'scene', row!.id, { name: input.name });
    return reply.code(201).send(row);
  });

  app.patch(`${P}/scenes/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idOf(req.params);
    const input = parse(scenePatch, req.body);
    const [current] = await sql<{ settings: Record<string, unknown> }[]>`
      select settings from scenes where id = ${id} and org_id = ${ctx.org.id}`;
    if (!current) throw notFound();
    const settings = normalizeSettings({ ...normalizeSettings(current.settings), ...input.settings });
    const [row] = await sql`
      update scenes set name = coalesce(${input.name ?? null}, name), template = coalesce(${input.template ?? null}, template),
        settings = ${sql.json(settings as never)}, updated_at = now()
      where id = ${id} and org_id = ${ctx.org.id} returning *`;
    await audit(sql, ctx, 'update', 'scene', id, { name: input.name, template: input.template });
    realtime.orgChanged(ctx.org.id);
    return row;
  });

  app.delete(`${P}/scenes/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idOf(req.params);
    const [used] = await sql<{ name: string }[]>`
      select name from screens where org_id = ${ctx.org.id}
        and (schedule->>'defaultSceneId' = ${id}
             or exists (select 1 from jsonb_array_elements(schedule->'rules') r where r->>'sceneId' = ${id}))
      limit 1`;
    if (used) throw conflict('scene_in_use', { screen: used.name });
    const res = await sql`delete from scenes where id = ${id} and org_id = ${ctx.org.id}`;
    if (res.count === 0) throw notFound();
    await audit(sql, ctx, 'delete', 'scene', id);
    return { ok: true };
  });

  /** Сцена в том виде, в каком её получит плеер: для живого превью в панели. */
  app.get(`${P}/scenes/:id/preview`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    const id = idOf(req.params);
    const { locationId } = req.query as { locationId?: string };
    const loc = locationId && isUuid(locationId) ? locationId : null;
    const { scenes } = await buildScenes(sql, storage, ctx.org, [id], loc);
    const scene = scenes[id];
    if (!scene) throw notFound();
    return { scene, currency: ctx.org.currency, locale: ctx.org.locale };
  });
}
