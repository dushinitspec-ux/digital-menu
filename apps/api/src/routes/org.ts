import { locationInput, memberInput, memberPatch, orgUpdateInput } from '@dm/shared';
import type { FastifyInstance } from 'fastify';
import { audit, requireOrg } from '../auth';
import type { Ctx } from '../context';
import { conflict, HttpError, isUuid, notFound, parse } from '../http';
import { hashPassword } from '../security';

export function registerOrgRoutes(app: FastifyInstance, { sql, realtime }: Ctx) {
  const P = '/api/orgs/:orgId';

  app.get(P, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    return { ...ctx.org, role: ctx.role };
  });

  app.patch(P, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const input = parse(orgUpdateInput, req.body);
    if (Object.keys(input).length === 0) return ctx.org;
    const [org] = await sql`update organizations set ${sql(input)} where id = ${ctx.org.id} returning *`;
    await audit(sql, ctx, 'update', 'organization', ctx.org.id, input);
    realtime.orgChanged(ctx.org.id);
    return org;
  });

  // --- Точки ---

  app.get(`${P}/locations`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    return sql`select * from locations where org_id = ${ctx.org.id} order by created_at`;
  });

  app.post(`${P}/locations`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const input = parse(locationInput, req.body);
    const [row] = await sql<{ id: string }[]>`
      insert into locations (org_id, name, address, timezone)
      values (${ctx.org.id}, ${input.name}, ${input.address}, ${input.timezone}) returning *`;
    await audit(sql, ctx, 'create', 'location', row!.id, { name: input.name });
    return reply.code(201).send(row);
  });

  app.patch(`${P}/locations/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const { id } = req.params as { id: string };
    const input = parse(locationInput.partial(), req.body);
    if (!isUuid(id)) throw notFound();
    const [row] = Object.keys(input).length
      ? await sql`update locations set ${sql(input)} where id = ${id} and org_id = ${ctx.org.id} returning *`
      : await sql`select * from locations where id = ${id} and org_id = ${ctx.org.id}`;
    if (!row) throw notFound();
    await audit(sql, ctx, 'update', 'location', id, input);
    realtime.orgChanged(ctx.org.id);
    return row;
  });

  app.delete(`${P}/locations/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const { id } = req.params as { id: string };
    if (!isUuid(id)) throw notFound();
    const [total] = await sql<{ count: number }[]>`
      select count(*)::int as count from locations where org_id = ${ctx.org.id}`;
    if ((total?.count ?? 0) <= 1) throw conflict('last_location');
    const [screen] = await sql`select 1 from screens where location_id = ${id}`;
    if (screen) throw conflict('location_has_screens');
    const res = await sql`delete from locations where id = ${id} and org_id = ${ctx.org.id}`;
    if (res.count === 0) throw notFound();
    await audit(sql, ctx, 'delete', 'location', id);
    return { ok: true };
  });

  // --- Команда ---

  app.get(`${P}/members`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    return sql`
      select u.id, u.email, u.name, m.role, m.created_at, u.last_login_at
      from memberships m join users u on u.id = m.user_id
      where m.org_id = ${ctx.org.id} order by m.created_at`;
  });

  // Без почтовой рассылки на старте: владелец задаёт сотруднику начальный пароль и передаёт его сам.
  app.post(`${P}/members`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const input = parse(memberInput, req.body);
    const passwordHash = await hashPassword(input.password);
    const member = await sql.begin(async (tx) => {
      const [existing] = await tx<{ id: string }[]>`select id from users where email = ${input.email}`;
      let userId = existing?.id;
      if (userId) {
        const [already] = await tx`select 1 from memberships where org_id = ${ctx.org.id} and user_id = ${userId}`;
        if (already) throw conflict('already_member');
        // Существующему пользователю пароль не меняем.
      } else {
        const [created] = await tx<{ id: string }[]>`
          insert into users (email, name, password_hash, locale)
          values (${input.email}, ${input.name}, ${passwordHash}, ${ctx.org.locale}) returning id`;
        userId = created!.id;
      }
      await tx`insert into memberships (org_id, user_id, role) values (${ctx.org.id}, ${userId}, ${input.role})`;
      await audit(tx, ctx, 'create', 'member', userId, { email: input.email, role: input.role });
      return { id: userId, email: input.email, name: input.name, role: input.role, existingUser: Boolean(existing) };
    });
    return reply.code(201).send(member);
  });

  app.patch(`${P}/members/:userId`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const { userId } = req.params as { userId: string };
    const input = parse(memberPatch, req.body);
    if (!isUuid(userId)) throw notFound();
    const [current] = await sql<{ role: string }[]>`
      select role from memberships where org_id = ${ctx.org.id} and user_id = ${userId}`;
    if (!current) throw notFound();
    if (current.role === 'owner') throw new HttpError(409, 'cannot_change_owner');
    await sql`update memberships set role = ${input.role} where org_id = ${ctx.org.id} and user_id = ${userId}`;
    await audit(sql, ctx, 'update', 'member', userId, input);
    return { ok: true };
  });

  app.delete(`${P}/members/:userId`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    const { userId } = req.params as { userId: string };
    if (!isUuid(userId)) throw notFound();
    const [current] = await sql<{ role: string }[]>`
      select role from memberships where org_id = ${ctx.org.id} and user_id = ${userId}`;
    if (!current) throw notFound();
    if (current.role === 'owner') throw new HttpError(409, 'cannot_remove_owner');
    await sql.begin(async (tx) => {
      await tx`delete from memberships where org_id = ${ctx.org.id} and user_id = ${userId}`;
      // Удалённый сотрудник теряет доступ сразу: закрываем его сессии, если других организаций у него нет.
      await tx`delete from sessions where user_id = ${userId}
        and not exists (select 1 from memberships where user_id = ${userId})`;
      await audit(tx, ctx, 'delete', 'member', userId);
    });
    return { ok: true };
  });

  app.get(`${P}/audit`, async (req) => {
    const ctx = await requireOrg(sql, req, 'admin');
    return sql`
      select a.id, a.action, a.entity, a.entity_id, a.details, a.created_at, u.name as user_name
      from audit_log a left join users u on u.id = a.user_id
      where a.org_id = ${ctx.org.id}
      order by a.created_at desc limit 200`;
  });
}
