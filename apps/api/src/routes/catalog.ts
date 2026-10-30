import { categoryInput, categoryPatch, itemInput, itemOverrideInput, itemPatch, reorderInput } from '@dm/shared';
import type { FastifyInstance } from 'fastify';
import { audit, requireOrg } from '../auth';
import type { Ctx } from '../context';
import type { Tx } from '../db';
import { HttpError, isUuid, notFound, parse } from '../http';

async function assertInOrg(sql: Tx, table: 'categories' | 'media' | 'locations', id: string, orgId: string) {
  const [row] = await sql`select 1 from ${sql(table)} where id = ${id} and org_id = ${orgId}`;
  if (!row) throw new HttpError(400, 'validation', `Unknown ${table} id`);
}

const idParam = (params: unknown, key = 'id') => {
  const id = (params as Record<string, string>)[key] ?? '';
  if (!isUuid(id)) throw notFound();
  return id;
};

export function registerCatalogRoutes(app: FastifyInstance, { sql, storage, realtime }: Ctx) {
  const P = '/api/orgs/:orgId';

  /** Всё меню организации одним запросом: панель редактирует его как таблицу. */
  app.get(`${P}/catalog`, async (req) => {
    const ctx = await requireOrg(sql, req, 'viewer');
    const categories = await sql`
      select id, name, name_secondary, compliance, variant_labels, sort
      from categories where org_id = ${ctx.org.id} order by sort, created_at`;
    const items = await sql<Record<string, unknown>[]>`
      select i.id, i.category_id, i.name, i.name_secondary, i.description, i.portion, i.price, i.variants, i.badges,
             i.image_id, i.sold_out, i.hidden, i.sort, i.updated_at, m.storage_key, m.thumb_key
      from items i left join media m on m.id = i.image_id
      where i.org_id = ${ctx.org.id} order by i.sort, i.created_at`;
    const overrides = await sql`
      select o.item_id, o.location_id, o.sold_out, o.price
      from item_location_overrides o join items i on i.id = o.item_id
      where i.org_id = ${ctx.org.id}`;
    return {
      categories,
      items: items.map(({ storageKey, thumbKey, ...i }) => ({
        ...i,
        imageUrl: thumbKey ? storage.url(thumbKey as string) : storageKey ? storage.url(storageKey as string) : null,
      })),
      overrides,
    };
  });

  // --- Категории ---

  app.post(`${P}/categories`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const input = parse(categoryInput, req.body);
    const [row] = await sql<{ id: string }[]>`
      insert into categories (org_id, name, name_secondary, compliance, variant_labels, sort)
      values (${ctx.org.id}, ${input.name}, ${input.nameSecondary}, ${input.compliance}, ${input.variantLabels}::text[],
              (select coalesce(max(sort) + 1, 0) from categories where org_id = ${ctx.org.id}))
      returning *`;
    await audit(sql, ctx, 'create', 'category', row!.id, { name: input.name });
    realtime.orgChanged(ctx.org.id);
    return reply.code(201).send(row);
  });

  app.patch(`${P}/categories/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idParam(req.params);
    const input = parse(categoryPatch, req.body);
    const patch: Record<string, unknown> = { ...input };
    if (input.variantLabels) patch.variantLabels = sql`${input.variantLabels}::text[]`;
    const [row] = Object.keys(patch).length
      ? await sql`update categories set ${sql(patch)} where id = ${id} and org_id = ${ctx.org.id} returning *`
      : await sql`select * from categories where id = ${id} and org_id = ${ctx.org.id}`;
    if (!row) throw notFound();
    await audit(sql, ctx, 'update', 'category', id, input);
    realtime.orgChanged(ctx.org.id);
    return row;
  });

  app.delete(`${P}/categories/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idParam(req.params);
    const res = await sql`delete from categories where id = ${id} and org_id = ${ctx.org.id}`;
    if (res.count === 0) throw notFound();
    await audit(sql, ctx, 'delete', 'category', id);
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });

  app.post(`${P}/categories/reorder`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const { ids } = parse(reorderInput, req.body);
    await sql`
      update categories c set sort = t.ord - 1
      from unnest(${ids}::uuid[]) with ordinality as t(id, ord)
      where c.id = t.id and c.org_id = ${ctx.org.id}`;
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });

  // --- Позиции ---

  app.post(`${P}/items`, async (req, reply) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const input = parse(itemInput, req.body);
    await assertInOrg(sql, 'categories', input.categoryId, ctx.org.id);
    if (input.imageId) await assertInOrg(sql, 'media', input.imageId, ctx.org.id);
    const [row] = await sql<{ id: string }[]>`
      insert into items (org_id, category_id, name, name_secondary, description, portion, price, variants, badges,
                         image_id, sold_out, hidden, sort)
      values (${ctx.org.id}, ${input.categoryId}, ${input.name}, ${input.nameSecondary}, ${input.description},
              ${input.portion}, ${input.price}, ${sql.json(input.variants)}, ${input.badges}::text[], ${input.imageId},
              ${input.soldOut}, ${input.hidden},
              (select coalesce(max(sort) + 1, 0) from items where category_id = ${input.categoryId}))
      returning *`;
    await audit(sql, ctx, 'create', 'item', row!.id, { name: input.name });
    realtime.orgChanged(ctx.org.id);
    return reply.code(201).send(row);
  });

  app.patch(`${P}/items/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idParam(req.params);
    const input = parse(itemPatch, req.body);
    if (input.categoryId) await assertInOrg(sql, 'categories', input.categoryId, ctx.org.id);
    if (input.imageId) await assertInOrg(sql, 'media', input.imageId, ctx.org.id);
    const patch: Record<string, unknown> = { ...input, updatedAt: sql`now()` };
    if (input.variants) patch.variants = sql.json(input.variants);
    if (input.badges) patch.badges = sql`${input.badges}::text[]`;
    const [row] = await sql`update items set ${sql(patch)} where id = ${id} and org_id = ${ctx.org.id} returning *`;
    if (!row) throw notFound();
    await audit(sql, ctx, 'update', 'item', id, input);
    realtime.orgChanged(ctx.org.id);
    return row;
  });

  app.delete(`${P}/items/:id`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idParam(req.params);
    const res = await sql`delete from items where id = ${id} and org_id = ${ctx.org.id}`;
    if (res.count === 0) throw notFound();
    await audit(sql, ctx, 'delete', 'item', id);
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });

  app.post(`${P}/categories/:id/items/reorder`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const categoryId = idParam(req.params);
    const { ids } = parse(reorderInput, req.body);
    await sql`
      update items i set sort = t.ord - 1
      from unnest(${ids}::uuid[]) with ordinality as t(id, ord)
      where i.id = t.id and i.org_id = ${ctx.org.id} and i.category_id = ${categoryId}`;
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });

  /** Стоп-лист и цена в отдельной точке сети. Оба поля null — вернуть общие значения. */
  app.put(`${P}/items/:id/locations/:locationId`, async (req) => {
    const ctx = await requireOrg(sql, req, 'editor');
    const id = idParam(req.params);
    const locationId = idParam(req.params, 'locationId');
    const input = parse(itemOverrideInput, req.body);
    const [item] = await sql`select 1 from items where id = ${id} and org_id = ${ctx.org.id}`;
    if (!item) throw notFound();
    await assertInOrg(sql, 'locations', locationId, ctx.org.id);
    if (input.soldOut === null && input.price === null) {
      await sql`delete from item_location_overrides where item_id = ${id} and location_id = ${locationId}`;
    } else {
      await sql`
        insert into item_location_overrides (item_id, location_id, sold_out, price)
        values (${id}, ${locationId}, ${input.soldOut}, ${input.price})
        on conflict (item_id, location_id) do update
          set sold_out = excluded.sold_out, price = excluded.price, updated_at = now()`;
    }
    await audit(sql, ctx, 'update', 'item_location', id, { locationId, ...input });
    realtime.orgChanged(ctx.org.id);
    return { ok: true };
  });
}
