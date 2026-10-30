import { randomUUID } from 'node:crypto';
import { menuItemVariants, regionForCountry, type Locale, type MenuFile, type Region, type SceneSettings, type ScreenSchedule } from '@dm/shared';
import type { Db, Tx } from './db';
import { processImage } from './media-processing';
import { hashPassword } from './security';
import type { Storage } from './storage';

// Заводит сеть из файла меню (menus/<сеть>/menu.json): организацию, владельца, точки, категории,
// позиции с фото и сцены. Повторный импорт с replace меняет меню и сцены, не трогая точки и экраны.

export interface ImportOwner {
  email: string;
  name: string;
  /** Нужен, только если такого пользователя ещё нет. */
  password?: string;
  locale?: Locale;
}

export interface ImportOptions {
  region: Region;
  owner: ImportOwner;
  replace?: boolean;
  /** Читает фото позиции по пути из файла меню. */
  readImage?: (path: string) => Promise<Buffer>;
}

export interface ImportResult {
  orgId: string;
  created: boolean;
  locations: number;
  categories: number;
  items: number;
  images: number;
  scenes: number;
  screensUpdated: number;
}

export class ImportError extends Error {}

/** Так помечены в медиатеке фото, загруженные импортом: «menu:photos/latte.webp». */
const MENU_MEDIA_PREFIX = 'menu:';

export async function importMenu(sql: Db, storage: Storage, menu: MenuFile, opts: ImportOptions): Promise<ImportResult> {
  // Данные клиента живут в контуре его страны — так же, как при регистрации через панель.
  if (regionForCountry(menu.org.country) !== opts.region) {
    throw new ImportError(`${menu.org.country} belongs to the "${regionForCountry(menu.org.country)}" region, this database is "${opts.region}"`);
  }
  const email = opts.owner.email.trim().toLowerCase();
  const uploaded: string[] = [];
  const removeAfterCommit: string[] = [];
  try {
    const result = await sql.begin(async (tx) => {
      let [user] = await tx<{ id: string }[]>`select id from users where email = ${email}`;
      if (!user) {
        if (!opts.owner.password || opts.owner.password.length < 8) {
          throw new ImportError(`User ${email} does not exist: pass a password (8+ characters) to create it`);
        }
        [user] = await tx<{ id: string }[]>`
          insert into users (email, name, password_hash, locale)
          values (${email}, ${opts.owner.name}, ${await hashPassword(opts.owner.password)}, ${opts.owner.locale ?? 'en'})
          returning id`;
      }

      const [existing] = await tx<{ id: string }[]>`
        select o.id from organizations o
        join memberships m on m.org_id = o.id and m.user_id = ${user!.id} and m.role = 'owner'
        where o.name = ${menu.org.name}`;
      if (existing && !opts.replace) {
        throw new ImportError(`"${menu.org.name}" already exists for ${email}: use replace to overwrite its menu`);
      }

      let orgId: string;
      const oldSceneNames = new Map<string, string>();
      if (existing) {
        orgId = existing.id;
        await tx`update organizations set country = ${menu.org.country}, business_type = ${menu.org.businessType},
                   currency = ${menu.org.currency}, locale = ${menu.org.locale} where id = ${orgId}`;
        for (const s of await tx<{ id: string; name: string }[]>`select id, name from scenes where org_id = ${orgId}`) {
          oldSceneNames.set(s.id, s.name);
        }
        await tx`delete from scenes where org_id = ${orgId}`;
        await tx`delete from categories where org_id = ${orgId}`;
      } else {
        const [org] = await tx<{ id: string }[]>`
          insert into organizations (name, region, country, business_type, currency, locale)
          values (${menu.org.name}, ${opts.region}, ${menu.org.country}, ${menu.org.businessType}, ${menu.org.currency}, ${menu.org.locale})
          returning id`;
        orgId = org!.id;
        await tx`insert into memberships (org_id, user_id, role) values (${orgId}, ${user!.id}, 'owner')`;
      }

      // Точки только добавляются: к существующим уже привязаны экраны.
      const known = new Map((await tx<{ id: string; name: string }[]>`select id, name from locations where org_id = ${orgId}`).map((l) => [l.name, l.id]));
      const locationIds = new Map<string, string>();
      let locations = 0;
      for (const l of menu.locations) {
        let id = known.get(l.name);
        if (!id) {
          const [row] = await tx<{ id: string }[]>`
            insert into locations (org_id, name, address, timezone) values (${orgId}, ${l.name}, ${l.address}, ${l.timezone}) returning id`;
          id = row!.id;
          locations++;
        }
        if (l.key) locationIds.set(l.key, id);
      }

      const categoryIds = new Map<string, string>();
      let items = 0;
      let images = 0;
      for (const [ci, c] of menu.categories.entries()) {
        const [row] = await tx<{ id: string }[]>`
          insert into categories (org_id, name, name_secondary, variant_labels, sort)
          values (${orgId}, ${c.name}, ${c.nameSecondary}, ${c.variantLabels}::text[], ${ci})
          returning id`;
        categoryIds.set(c.key, row!.id);
        for (const [ii, item] of c.items.entries()) {
          let imageId: string | null = null;
          if (item.image) {
            if (!opts.readImage) throw new ImportError(`"${item.name}" has an image but no image reader was given`);
            imageId = await storeImage(tx, storage, orgId, item.image, await opts.readImage(item.image), uploaded);
            images++;
          }
          const [itemRow] = await tx<{ id: string }[]>`
            insert into items (org_id, category_id, name, name_secondary, description, portion, price, variants, badges,
                               image_id, sold_out, sort)
            values (${orgId}, ${row!.id}, ${item.name}, ${item.nameSecondary}, ${item.description}, ${item.portion},
                    ${item.price}, ${tx.json(menuItemVariants(item, c.variantLabels) as never)}, ${item.badges}::text[],
                    ${imageId}, ${item.soldOut}, ${ii})
            returning id`;
          // Цены и стоп-лист отдельных точек — тем же механизмом, что и правки точки в панели.
          const overrides = new Map<string, { price: number | null; soldOut: boolean | null }>();
          for (const [loc, price] of Object.entries(item.locationPrices)) overrides.set(loc, { price, soldOut: null });
          for (const loc of item.unavailableAt) overrides.set(loc, { price: overrides.get(loc)?.price ?? null, soldOut: true });
          for (const [loc, o] of overrides) {
            await tx`insert into item_location_overrides (item_id, location_id, price, sold_out)
                     values (${itemRow!.id}, ${locationIds.get(loc)!}, ${o.price}, ${o.soldOut})`;
          }
          items++;
        }
      }

      const sceneIds = new Map<string, string>();
      for (const s of menu.scenes) {
        const settings: Partial<SceneSettings> = { ...s.settings, categoryIds: s.categories.map((k) => categoryIds.get(k)!) };
        const [row] = await tx<{ id: string }[]>`
          insert into scenes (org_id, name, template, settings)
          values (${orgId}, ${s.name}, ${s.template}, ${tx.json(settings as never)}) returning id`;
        sceneIds.set(s.name, row!.id);
      }

      const screensUpdated = await relinkSchedules(tx, orgId, oldSceneNames, sceneIds);

      // Фото прошлых импортов, которые больше нигде не используются, — удаляем, чтобы повторный импорт
      // не плодил копии в медиатеке. Загруженное через панель (без префикса menu:) не трогаем.
      const stale = await tx<{ storageKey: string; thumbKey: string | null }[]>`
        delete from media m
        where m.org_id = ${orgId} and m.original_name like ${MENU_MEDIA_PREFIX + '%'}
          and not exists (select 1 from items i where i.image_id = m.id)
          and not exists (select 1 from scenes s where s.org_id = m.org_id and s.settings->>'backgroundMediaId' = m.id::text)
        returning storage_key, thumb_key`;
      removeAfterCommit.push(...stale.flatMap((m) => (m.thumbKey ? [m.storageKey, m.thumbKey] : [m.storageKey])));
      const details = { source: 'menu-file', replace: Boolean(existing), categories: menu.categories.length, items, scenes: menu.scenes.length };
      await tx`insert into audit_log (org_id, user_id, action, entity, entity_id, details)
               values (${orgId}, ${user!.id}, 'import', 'organization', ${orgId}, ${tx.json(details)})`;

      return { orgId, created: !existing, locations, categories: menu.categories.length, items, images, scenes: menu.scenes.length, screensUpdated };
    });
    await Promise.all(removeAfterCommit.map((key) => storage.remove(key).catch(() => {})));
    return result;
  } catch (err) {
    // Транзакция откатилась — файлы, загруженные в хранилище по пути, больше никому не нужны.
    await Promise.all(uploaded.map((key) => storage.remove(key).catch(() => {})));
    throw err;
  }
}

async function storeImage(tx: Tx, storage: Storage, orgId: string, name: string, input: Buffer, uploaded: string[]) {
  let processed;
  try {
    processed = await processImage(input);
  } catch {
    throw new ImportError(`Cannot read image ${name}`);
  }
  const id = randomUUID();
  const key = `${orgId}/${id}.webp`;
  const thumbKey = `${orgId}/${id}-thumb.webp`;
  await storage.put(key, processed.main, 'image/webp');
  uploaded.push(key);
  await storage.put(thumbKey, processed.thumb, 'image/webp');
  uploaded.push(thumbKey);
  await tx`
    insert into media (id, org_id, kind, storage_key, thumb_key, mime, size_bytes, width, height, original_name)
    values (${id}, ${orgId}, 'image', ${key}, ${thumbKey}, 'image/webp', ${processed.main.length},
            ${processed.width}, ${processed.height}, ${(MENU_MEDIA_PREFIX + name).slice(0, 200)})`;
  return id;
}

/**
 * Сцены пересозданы с новыми id — расписания экранов переводим на сцены с теми же названиями.
 * Сцена, которой больше нет, выпадает из расписания; экран без сцены по умолчанию получает первую сцену файла.
 */
async function relinkSchedules(tx: Tx, orgId: string, oldNames: Map<string, string>, newIds: Map<string, string>) {
  const fallback = newIds.values().next().value ?? null;
  const map = (id: string | null) => (id && oldNames.has(id) ? (newIds.get(oldNames.get(id)!) ?? null) : null);
  const screens = await tx<{ id: string; schedule: ScreenSchedule }[]>`select id, schedule from screens where org_id = ${orgId}`;
  for (const screen of screens) {
    const rules = screen.schedule.rules.flatMap((r) => {
      const sceneId = map(r.sceneId);
      return sceneId ? [{ ...r, sceneId }] : [];
    });
    const schedule: ScreenSchedule = { defaultSceneId: map(screen.schedule.defaultSceneId) ?? fallback, rules };
    await tx`update screens set schedule = ${tx.json(schedule as never)} where id = ${screen.id}`;
  }
  return screens.length;
}
