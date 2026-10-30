import { createHash } from 'node:crypto';
import {
  DEFAULT_SCENE_SETTINGS,
  type Badge,
  type CategoryView,
  type ItemView,
  type MediaView,
  type PlayerManifest,
  type SceneSettings,
  type SceneView,
  type ScreenSchedule,
  type TemplateId,
  type Variant,
} from '@dm/shared';
import type { OrgRow } from './auth';
import type { Db } from './db';
import type { Storage } from './storage';

interface MediaRow {
  id: string;
  kind: 'image' | 'video';
  storageKey: string;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
}

export function mediaView(storage: Storage, m: MediaRow): MediaView {
  return {
    id: m.id,
    kind: m.kind,
    url: storage.url(m.storageKey),
    thumbUrl: m.thumbKey ? storage.url(m.thumbKey) : null,
    width: m.width,
    height: m.height,
  };
}

export const normalizeSettings = (raw: Partial<SceneSettings> | null): SceneSettings => ({ ...DEFAULT_SCENE_SETTINGS, ...raw });

interface SceneRow {
  id: string;
  name: string;
  template: TemplateId;
  settings: Partial<SceneSettings>;
}

interface ItemRow {
  id: string;
  categoryId: string;
  name: string;
  nameSecondary: string;
  description: string;
  portion: string;
  price: number | null;
  variants: Variant[];
  badges: Badge[];
  imageId: string | null;
  soldOut: boolean;
  oSoldOut: boolean | null;
  oPrice: number | null;
}

/**
 * Собирает сцены в том виде, в каком их рисует плеер: категории в порядке сцены, позиции с учётом
 * стоп-листа и цен точки. Для табачных категорий (15-ФЗ) — алфавитный порядок, без фото и бейджей.
 */
export async function buildScenes(
  sql: Db,
  storage: Storage,
  org: Pick<OrgRow, 'id' | 'locale'>,
  sceneIds: string[],
  locationId: string | null,
): Promise<{ scenes: Record<string, SceneView>; media: string[] }> {
  if (sceneIds.length === 0) return { scenes: {}, media: [] };
  const sceneRows = await sql<SceneRow[]>`
    select id, name, template, settings from scenes where org_id = ${org.id} and id = any(${sceneIds}::uuid[])`;
  const settingsById = new Map(sceneRows.map((s) => [s.id, normalizeSettings(s.settings)]));
  const categoryIds = [...new Set([...settingsById.values()].flatMap((s) => s.categoryIds))];

  const categories = await sql<{ id: string; name: string; nameSecondary: string; compliance: 'none' | 'tobacco'; variantLabels: string[] }[]>`
    select id, name, name_secondary, compliance, variant_labels from categories
    where org_id = ${org.id} and id = any(${categoryIds}::uuid[])`;
  const items = await sql<ItemRow[]>`
    select i.id, i.category_id, i.name, i.name_secondary, i.description, i.portion, i.price, i.variants,
           i.badges, i.image_id, i.sold_out, o.sold_out as o_sold_out, o.price as o_price
    from items i
    left join item_location_overrides o on o.item_id = i.id and o.location_id = ${locationId}::uuid
    where i.org_id = ${org.id} and i.category_id = any(${categoryIds}::uuid[]) and not i.hidden
    order by i.sort, i.created_at`;

  const mediaIds = [
    ...new Set([
      ...items.map((i) => i.imageId),
      ...[...settingsById.values()].map((s) => s.backgroundMediaId),
    ].filter((id): id is string => Boolean(id))),
  ];
  const mediaRows = mediaIds.length
    ? await sql<MediaRow[]>`select id, kind, storage_key, thumb_key, width, height from media
        where org_id = ${org.id} and id = any(${mediaIds}::uuid[]) and status = 'ready'`
    : [];
  const mediaById = new Map(mediaRows.map((m) => [m.id, mediaView(storage, m)]));
  const used = new Set<string>();

  const collator = new Intl.Collator(org.locale);
  const categoryViews = new Map<string, CategoryView>();
  for (const c of categories) {
    const tobacco = c.compliance === 'tobacco';
    const views: ItemView[] = items
      .filter((i) => i.categoryId === c.id)
      .map((i) => {
        const image = tobacco || !i.imageId ? null : (mediaById.get(i.imageId) ?? null);
        return {
          id: i.id,
          name: i.name,
          nameSecondary: i.nameSecondary,
          description: i.description,
          portion: i.portion,
          price: i.oPrice ?? i.price,
          variants: i.variants ?? [],
          badges: tobacco ? [] : i.badges,
          image,
          soldOut: i.oSoldOut ?? i.soldOut,
        };
      });
    if (tobacco) views.sort((a, b) => collator.compare(a.name, b.name));
    categoryViews.set(c.id, {
      id: c.id,
      name: c.name,
      nameSecondary: c.nameSecondary,
      compliance: c.compliance,
      variantLabels: c.variantLabels,
      items: views,
    });
  }

  const scenes: Record<string, SceneView> = {};
  for (const s of sceneRows) {
    const settings = settingsById.get(s.id)!;
    const background = settings.backgroundMediaId ? (mediaById.get(settings.backgroundMediaId) ?? null) : null;
    if (background) used.add(background.url);
    const cats = settings.categoryIds.map((id) => categoryViews.get(id)).filter((c): c is CategoryView => Boolean(c));
    if (settings.showImages) {
      for (const c of cats) for (const i of c.items) if (i.image) used.add(i.image.thumbUrl ?? i.image.url);
    }
    scenes[s.id] = { id: s.id, name: s.name, template: s.template, settings, background, categories: cats };
  }
  return { scenes, media: [...used] };
}

interface ScreenRow {
  id: string;
  orgId: string;
  name: string;
  orientation: 'landscape' | 'portrait';
  schedule: ScreenSchedule;
  locationId: string;
  locationName: string;
  timezone: string;
  orgName: string;
  currency: OrgRow['currency'];
  locale: OrgRow['locale'];
}

export async function loadScreenByToken(sql: Db, tokenHash: string) {
  const [row] = await sql<ScreenRow[]>`
    select s.id, s.org_id, s.name, s.orientation, s.schedule, s.location_id,
           l.name as location_name, l.timezone, o.name as org_name, o.currency, o.locale
    from screens s
    join locations l on l.id = s.location_id
    join organizations o on o.id = s.org_id
    where s.device_token_hash = ${tokenHash}`;
  return row ?? null;
}

export type PlayerScreen = NonNullable<Awaited<ReturnType<typeof loadScreenByToken>>>;

export async function buildManifest(sql: Db, storage: Storage, screen: PlayerScreen): Promise<PlayerManifest> {
  const schedule = screen.schedule;
  const sceneIds = [...new Set([schedule.defaultSceneId, ...schedule.rules.map((r) => r.sceneId)].filter((id): id is string => Boolean(id)))];
  const { scenes, media } = await buildScenes(sql, storage, { id: screen.orgId, locale: screen.locale }, sceneIds, screen.locationId);
  const content = {
    screen: { id: screen.id, name: screen.name, orientation: screen.orientation },
    location: { id: screen.locationId, name: screen.locationName, timezone: screen.timezone },
    org: { name: screen.orgName, currency: screen.currency, locale: screen.locale },
    schedule,
    scenes,
    media,
  };
  const version = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16);
  return { version, generatedAt: new Date().toISOString(), ...content };
}
