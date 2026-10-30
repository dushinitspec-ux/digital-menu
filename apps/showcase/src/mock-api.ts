import {
  categoryInput,
  categoryPatch,
  claimScreenInput,
  DEFAULT_SCENE_SETTINGS,
  itemInput,
  itemOverrideInput,
  itemPatch,
  locationInput,
  loginInput,
  memberInput,
  memberPatch,
  orgUpdateInput,
  REGION_DEFAULTS,
  regionForCountry,
  registerInput,
  reorderInput,
  sceneInput,
  scenePatch,
  screenPatch,
  type Badge,
  type BusinessType,
  type CategoryView,
  type Currency,
  type ItemView,
  type Locale,
  type MediaView,
  type Orientation,
  type PlayerManifest,
  type Region,
  type Role,
  type SceneSettings,
  type SceneView,
  type ScreenSchedule,
  type TemplateId,
  type Variant,
} from '@dm/shared';
import type { z } from 'zod';
import { loadMenu, type Business } from '../../demo/src/data';

/*
 * Сервер в браузере: те же маршруты /api/…, те же zod-схемы и правила, что у настоящего API,
 * только данные лежат в памяти и localStorage. Панель работает без изменений, а окно ТВ
 * получает манифест и события напрямую.
 */

const STORE_KEY = 'dm.showcase.v1';
const ONLINE_MS = 150_000;
export const DEMO_LOGIN = { email: 'demo@digital-menu.app', password: 'demo-password' };

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  locale: Locale;
  lastLoginAt: string | null;
}
interface Org {
  id: string;
  name: string;
  region: Region;
  country: string;
  businessType: BusinessType;
  currency: Currency;
  locale: Locale;
  createdAt: string;
}
interface Member {
  orgId: string;
  userId: string;
  role: Role;
  createdAt: string;
}
interface Loc {
  id: string;
  orgId: string;
  name: string;
  address: string;
  timezone: string;
  createdAt: string;
}
interface Cat {
  id: string;
  orgId: string;
  name: string;
  nameSecondary: string;
  compliance: 'none' | 'tobacco';
  variantLabels: string[];
  sort: number;
}
interface Item {
  id: string;
  orgId: string;
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
  hidden: boolean;
  sort: number;
}
interface Override {
  itemId: string;
  locationId: string;
  soldOut: boolean | null;
  price: number | null;
}
interface Media {
  id: string;
  orgId: string;
  kind: 'image' | 'video';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  status: 'ready';
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}
interface Scene {
  id: string;
  orgId: string;
  name: string;
  template: TemplateId;
  settings: SceneSettings;
  createdAt: string;
}
interface Screen {
  id: string;
  orgId: string;
  locationId: string;
  name: string;
  orientation: Orientation;
  schedule: ScreenSchedule;
  token: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
  lastStatus: Record<string, unknown> | null;
  createdAt: string;
}
interface Pairing {
  id: string;
  code: string;
  token: string;
  screenId: string | null;
  expiresAt: number;
}
interface Audit {
  id: number;
  orgId: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface Db {
  users: User[];
  orgs: Org[];
  members: Member[];
  sessionUserId: string | null;
  locations: Loc[];
  categories: Cat[];
  items: Item[];
  overrides: Override[];
  media: Media[];
  scenes: Scene[];
  screens: Screen[];
  pairings: Pairing[];
  audit: Audit[];
  /** Токен устройства «телевизора» в окне справа внизу. */
  tvToken: string;
}

export type TvEvent = { type: 'manifest' } | { type: 'reload'; screenId: string } | { type: 'unpaired'; screenId: string };

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const now = () => new Date().toISOString();
const randomToken = () => `${uuid()}${uuid()}`.replace(/-/g, '');

function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw new HttpError(400, 'validation', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

function businessMenu(type: BusinessType): Business {
  if (type === 'coffee' || type === 'cafe') return 'coffee';
  if (type === 'hookah') return 'hookah';
  return 'bar';
}

export class MockApi {
  db: Db;
  private listeners = new Set<(e: TvEvent) => void>();
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private auditSeq = 1;

  constructor() {
    this.db = this.load() ?? this.fresh();
    this.auditSeq = this.db.audit.reduce((m, a) => Math.max(m, a.id), 0) + 1;
    // Отложенное сохранение не должно теряться при закрытии или перезагрузке вкладки.
    window.addEventListener('pagehide', () => this.flush());
  }

  // --- Хранение ---

  private load(): Db | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw) as Db;
      // blob:-ссылки на видео не переживают перезагрузку страницы.
      db.media = db.media.filter((m) => !m.url.startsWith('blob:'));
      return db;
    } catch {
      return null;
    }
  }

  private save() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 300);
  }

  private flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.db));
    } catch {
      // переполнение (большие фото) или запрет хранилища — демо работает в памяти
    }
  }

  reset() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      // ничего
    }
    this.db = this.fresh();
    this.save();
  }

  /** Демо-аккаунт: кофейня с меню, вход выполнен, один телевизор уже подключён. */
  private fresh(): Db {
    const db: Db = {
      users: [],
      orgs: [],
      members: [],
      sessionUserId: null,
      locations: [],
      categories: [],
      items: [],
      overrides: [],
      media: [],
      scenes: [],
      screens: [],
      pairings: [],
      audit: [],
      tvToken: randomToken(),
    };
    this.db = db;
    const { user, org } = this.createAccount({
      email: DEMO_LOGIN.email,
      password: DEMO_LOGIN.password,
      name: 'Анна',
      orgName: 'Кофейня «Зерно»',
      businessType: 'coffee',
      locale: 'ru',
      country: 'RU',
      timezone: 'Europe/Moscow',
    });
    db.sessionUserId = user.id;
    const scenes = db.scenes.filter((s) => s.orgId === org.id);
    db.screens.push({
      id: uuid(),
      orgId: org.id,
      locationId: db.locations[0]!.id,
      name: 'ТВ у кассы',
      orientation: 'landscape',
      schedule: {
        defaultSceneId: scenes[0]!.id,
        rules: scenes[1] ? [{ id: 'breakfast', days: [1, 2, 3, 4, 5], start: '08:00', end: '11:00', sceneId: scenes[1].id }] : [],
      },
      token: db.tvToken,
      pairedAt: now(),
      lastSeenAt: now(),
      lastStatus: null,
      createdAt: now(),
    });
    return db;
  }

  private createAccount(input: z.output<typeof registerInput> & { password: string }) {
    const db = this.db;
    const region = regionForCountry(input.country);
    const user: User = { id: uuid(), email: input.email, name: input.name, password: input.password, locale: input.locale, lastLoginAt: now() };
    const org: Org = {
      id: uuid(),
      name: input.orgName,
      region,
      country: input.country,
      businessType: input.businessType,
      currency: REGION_DEFAULTS[region].currency,
      locale: input.locale,
      createdAt: now(),
    };
    db.users.push(user);
    db.orgs.push(org);
    db.members.push({ orgId: org.id, userId: user.id, role: 'owner', createdAt: now() });
    db.locations.push({ id: uuid(), orgId: org.id, name: input.orgName, address: '', timezone: input.timezone, createdAt: now() });

    const menu = loadMenu(region === 'ru' ? 'ru' : 'eu', businessMenu(input.businessType));
    const catIds = menu.categories.map((c, ci) => {
      const id = uuid();
      db.categories.push({ id, orgId: org.id, name: c.name, nameSecondary: '', compliance: c.compliance, variantLabels: c.variantLabels, sort: ci });
      c.items.forEach((it, ii) =>
        db.items.push({
          id: uuid(),
          orgId: org.id,
          categoryId: id,
          name: it.name,
          nameSecondary: '',
          description: it.description,
          portion: it.portion,
          price: it.price,
          variants: it.variants,
          badges: it.badges,
          imageId: null,
          soldOut: false,
          hidden: false,
          sort: ii,
        }),
      );
      return id;
    });
    for (const s of menu.scenes) {
      db.scenes.push({
        id: uuid(),
        orgId: org.id,
        name: s.name,
        template: menu.template,
        settings: { ...DEFAULT_SCENE_SETTINGS, title: s.title, subtitle: s.subtitle, categoryIds: s.categories.map((i) => catIds[i]!) },
        createdAt: now(),
      });
    }
    return { user, org };
  }

  // --- События для экрана ---

  subscribe(fn: (e: TvEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: TvEvent) {
    for (const fn of this.listeners) fn(e);
  }

  /** Как NOTIFY на сервере: серия правок склеивается в одно событие. */
  private changed() {
    this.save();
    if (this.changeTimer) return;
    this.changeTimer = setTimeout(() => {
      this.changeTimer = null;
      this.emit({ type: 'manifest' });
    }, 120);
  }

  // --- HTTP ---

  async handle(method: string, path: string, body: unknown): Promise<{ status: number; data: unknown }> {
    try {
      const data = await this.route(method, path, body);
      if (method !== 'GET') this.save();
      return { status: method === 'POST' && data && typeof data === 'object' && 'created' in data ? 201 : 200, data: data && typeof data === 'object' && 'created' in data ? (data as { created: unknown }).created : data };
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, data: { error: err.code, details: err.details } };
      console.error(err);
      return { status: 500, data: { error: 'internal' } };
    }
  }

  private user() {
    const user = this.db.users.find((u) => u.id === this.db.sessionUserId);
    if (!user) throw new HttpError(401, 'unauthorized');
    return user;
  }

  private org(orgId: string, min: Role) {
    const user = this.user();
    const m = this.db.members.find((x) => x.orgId === orgId && x.userId === user.id);
    const org = this.db.orgs.find((o) => o.id === orgId);
    if (!m || !org) throw new HttpError(404, 'not_found');
    if (RANK[m.role] < RANK[min]) throw new HttpError(403, 'forbidden');
    return { org, role: m.role, user };
  }

  private audit(orgId: string, user: User, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
    this.db.audit.unshift({ id: this.auditSeq++, orgId, userName: user.name, action, entity, entityId, details, createdAt: now() });
    this.db.audit = this.db.audit.slice(0, 300);
  }

  private find<T extends { id: string; orgId: string }>(list: T[], id: string, orgId: string): T {
    const row = list.find((x) => x.id === id && x.orgId === orgId);
    if (!row) throw new HttpError(404, 'not_found');
    return row;
  }

  private mediaUrl(id: string | null) {
    const m = id ? this.db.media.find((x) => x.id === id) : undefined;
    return m ? (m.thumbUrl ?? m.url) : null;
  }

  private async route(method: string, path: string, body: unknown): Promise<unknown> {
    const db = this.db;
    const m = (re: RegExp) => re.exec(path);
    let r: RegExpExecArray | null;

    if (method === 'GET' && path === '/config') {
      return { region: 'ru', brandName: 'Digital Menu', otherRegionUrl: null, currency: 'RUB', locale: 'ru', timezone: 'Europe/Moscow', demo: true };
    }
    if (method === 'POST' && path === '/auth/register') {
      const input = parse(registerInput, body);
      if (db.users.some((u) => u.email === input.email)) throw new HttpError(409, 'email_taken');
      const { user, org } = this.createAccount(input);
      db.sessionUserId = user.id;
      this.changed();
      return { created: { userId: user.id, orgId: org.id } };
    }
    if (method === 'POST' && path === '/auth/login') {
      const input = parse(loginInput, body);
      const user = db.users.find((u) => u.email === input.email);
      if (!user || user.password !== input.password) throw new HttpError(401, 'invalid_credentials');
      user.lastLoginAt = now();
      db.sessionUserId = user.id;
      return { userId: user.id };
    }
    if (method === 'POST' && path === '/auth/logout') {
      db.sessionUserId = null;
      return { ok: true };
    }
    if (method === 'GET' && path === '/auth/me') {
      const user = this.user();
      const orgs = db.members
        .filter((x) => x.userId === user.id)
        .map((x) => {
          const o = db.orgs.find((oo) => oo.id === x.orgId)!;
          return { id: o.id, name: o.name, region: o.region, currency: o.currency, locale: o.locale, businessType: o.businessType, role: x.role };
        });
      return { user: { id: user.id, email: user.email, name: user.name, locale: user.locale }, orgs };
    }

    r = m(/^\/orgs\/([^/]+)(\/.*)?$/);
    if (!r) throw new HttpError(404, 'not_found');
    const orgId = r[1]!;
    const sub = r[2] ?? '';
    const ms = (re: RegExp) => re.exec(sub);

    if (sub === '') {
      if (method === 'GET') {
        const ctx = this.org(orgId, 'viewer');
        return { ...ctx.org, role: ctx.role };
      }
      if (method === 'PATCH') {
        const ctx = this.org(orgId, 'admin');
        Object.assign(ctx.org, parse(orgUpdateInput, body));
        this.audit(orgId, ctx.user, 'update', 'organization', orgId);
        this.changed();
        return ctx.org;
      }
    }

    // Точки
    if (sub === '/locations' && method === 'GET') {
      this.org(orgId, 'viewer');
      return db.locations.filter((l) => l.orgId === orgId);
    }
    if (sub === '/locations' && method === 'POST') {
      const ctx = this.org(orgId, 'admin');
      const input = parse(locationInput, body);
      const loc: Loc = { id: uuid(), orgId, ...input, createdAt: now() };
      db.locations.push(loc);
      this.audit(orgId, ctx.user, 'create', 'location', loc.id, { name: loc.name });
      return { created: loc };
    }
    if ((r = ms(/^\/locations\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'admin');
      const loc = this.find(db.locations, r[1]!, orgId);
      if (method === 'PATCH') {
        Object.assign(loc, parse(locationInput.partial(), body));
        this.changed();
        return loc;
      }
      if (method === 'DELETE') {
        if (db.locations.filter((l) => l.orgId === orgId).length <= 1) throw new HttpError(409, 'last_location');
        if (db.screens.some((s) => s.locationId === loc.id)) throw new HttpError(409, 'location_has_screens');
        db.locations = db.locations.filter((l) => l !== loc);
        db.overrides = db.overrides.filter((o) => o.locationId !== loc.id);
        this.audit(orgId, ctx.user, 'delete', 'location', loc.id);
        return { ok: true };
      }
    }

    // Команда
    if (sub === '/members' && method === 'GET') {
      this.org(orgId, 'admin');
      return db.members
        .filter((x) => x.orgId === orgId)
        .map((x) => {
          const u = db.users.find((uu) => uu.id === x.userId)!;
          return { id: u.id, email: u.email, name: u.name, role: x.role, createdAt: x.createdAt, lastLoginAt: u.lastLoginAt };
        });
    }
    if (sub === '/members' && method === 'POST') {
      const ctx = this.org(orgId, 'admin');
      const input = parse(memberInput, body);
      let u = db.users.find((uu) => uu.email === input.email);
      if (u && db.members.some((x) => x.orgId === orgId && x.userId === u!.id)) throw new HttpError(409, 'already_member');
      if (!u) {
        u = { id: uuid(), email: input.email, name: input.name, password: input.password, locale: ctx.org.locale, lastLoginAt: null };
        db.users.push(u);
      }
      db.members.push({ orgId, userId: u.id, role: input.role, createdAt: now() });
      this.audit(orgId, ctx.user, 'create', 'member', u.id, { name: input.name });
      return { created: { id: u.id, email: u.email, name: u.name, role: input.role } };
    }
    if ((r = ms(/^\/members\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'admin');
      const member = db.members.find((x) => x.orgId === orgId && x.userId === r![1]);
      if (!member) throw new HttpError(404, 'not_found');
      if (member.role === 'owner') throw new HttpError(409, method === 'DELETE' ? 'cannot_remove_owner' : 'cannot_change_owner');
      if (method === 'PATCH') member.role = parse(memberPatch, body).role;
      if (method === 'DELETE') db.members = db.members.filter((x) => x !== member);
      this.audit(orgId, ctx.user, method === 'DELETE' ? 'delete' : 'update', 'member', member.userId);
      return { ok: true };
    }
    if (sub === '/audit' && method === 'GET') {
      this.org(orgId, 'admin');
      return db.audit.filter((a) => a.orgId === orgId).slice(0, 200);
    }

    // Меню
    if (sub === '/catalog' && method === 'GET') {
      this.org(orgId, 'viewer');
      const itemIds = new Set(db.items.filter((i) => i.orgId === orgId).map((i) => i.id));
      return {
        categories: db.categories.filter((c) => c.orgId === orgId).sort((a, b) => a.sort - b.sort),
        items: db.items.filter((i) => i.orgId === orgId).map((i) => ({ ...i, imageUrl: this.mediaUrl(i.imageId) })),
        overrides: db.overrides.filter((o) => itemIds.has(o.itemId)),
      };
    }
    if (sub === '/categories' && method === 'POST') {
      const ctx = this.org(orgId, 'editor');
      const input = parse(categoryInput, body);
      const cat: Cat = { id: uuid(), orgId, ...input, sort: db.categories.filter((c) => c.orgId === orgId).length };
      db.categories.push(cat);
      this.audit(orgId, ctx.user, 'create', 'category', cat.id, { name: cat.name });
      this.changed();
      return { created: cat };
    }
    if (sub === '/categories/reorder' && method === 'POST') {
      this.org(orgId, 'editor');
      parse(reorderInput, body).ids.forEach((id, i) => {
        const c = db.categories.find((x) => x.id === id && x.orgId === orgId);
        if (c) c.sort = i;
      });
      this.changed();
      return { ok: true };
    }
    if ((r = ms(/^\/categories\/([^/]+)\/items\/reorder$/)) && method === 'POST') {
      this.org(orgId, 'editor');
      parse(reorderInput, body).ids.forEach((id, i) => {
        const it = db.items.find((x) => x.id === id && x.orgId === orgId && x.categoryId === r![1]);
        if (it) it.sort = i;
      });
      this.changed();
      return { ok: true };
    }
    if ((r = ms(/^\/categories\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'editor');
      const cat = this.find(db.categories, r[1]!, orgId);
      if (method === 'PATCH') {
        Object.assign(cat, parse(categoryPatch, body));
        this.audit(orgId, ctx.user, 'update', 'category', cat.id, { name: cat.name });
        this.changed();
        return cat;
      }
      if (method === 'DELETE') {
        db.categories = db.categories.filter((c) => c !== cat);
        db.items = db.items.filter((i) => i.categoryId !== cat.id);
        this.audit(orgId, ctx.user, 'delete', 'category', cat.id);
        this.changed();
        return { ok: true };
      }
    }
    if (sub === '/items' && method === 'POST') {
      const ctx = this.org(orgId, 'editor');
      const input = parse(itemInput, body);
      this.find(db.categories, input.categoryId, orgId);
      const item: Item = { id: uuid(), orgId, ...input, sort: db.items.filter((i) => i.categoryId === input.categoryId).length };
      db.items.push(item);
      this.audit(orgId, ctx.user, 'create', 'item', item.id, { name: item.name });
      this.changed();
      return { created: item };
    }
    if ((r = ms(/^\/items\/([^/]+)\/locations\/([^/]+)$/)) && method === 'PUT') {
      const ctx = this.org(orgId, 'editor');
      const item = this.find(db.items, r[1]!, orgId);
      this.find(db.locations, r[2]!, orgId);
      const input = parse(itemOverrideInput, body);
      db.overrides = db.overrides.filter((o) => !(o.itemId === item.id && o.locationId === r![2]));
      if (input.soldOut !== null || input.price !== null) db.overrides.push({ itemId: item.id, locationId: r[2]!, ...input });
      this.audit(orgId, ctx.user, 'update', 'item_location', item.id, { name: item.name });
      this.changed();
      return { ok: true };
    }
    if ((r = ms(/^\/items\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'editor');
      const item = this.find(db.items, r[1]!, orgId);
      if (method === 'PATCH') {
        const input = parse(itemPatch, body);
        if (input.categoryId) this.find(db.categories, input.categoryId, orgId);
        Object.assign(item, input);
        this.audit(orgId, ctx.user, 'update', 'item', item.id, { name: item.name });
        this.changed();
        return item;
      }
      if (method === 'DELETE') {
        db.items = db.items.filter((i) => i !== item);
        db.overrides = db.overrides.filter((o) => o.itemId !== item.id);
        this.audit(orgId, ctx.user, 'delete', 'item', item.id);
        this.changed();
        return { ok: true };
      }
    }

    // Медиа
    if (sub === '/media' && method === 'GET') {
      this.org(orgId, 'viewer');
      return db.media.filter((x) => x.orgId === orgId);
    }
    if (sub === '/media' && method === 'POST') {
      const ctx = this.org(orgId, 'editor');
      const file = body instanceof FormData ? body.get('file') : null;
      if (!(file instanceof File)) throw new HttpError(400, 'no_file');
      const media = await storeFile(file, orgId);
      db.media.unshift(media);
      this.audit(orgId, ctx.user, 'create', 'media', media.id, { name: media.originalName });
      return { created: media };
    }
    if ((r = ms(/^\/media\/([^/]+)$/)) && method === 'DELETE') {
      const ctx = this.org(orgId, 'editor');
      const media = this.find(db.media, r[1]!, orgId);
      db.media = db.media.filter((x) => x !== media);
      for (const i of db.items) if (i.imageId === media.id) i.imageId = null;
      for (const s of db.scenes) if (s.settings.backgroundMediaId === media.id) s.settings.backgroundMediaId = null;
      this.audit(orgId, ctx.user, 'delete', 'media', media.id);
      this.changed();
      return { ok: true };
    }

    // Сцены
    if (sub === '/scenes' && method === 'GET') {
      this.org(orgId, 'viewer');
      return db.scenes.filter((s) => s.orgId === orgId);
    }
    if (sub === '/scenes' && method === 'POST') {
      const ctx = this.org(orgId, 'editor');
      const input = parse(sceneInput, body);
      const scene: Scene = { id: uuid(), orgId, name: input.name, template: input.template, settings: { ...DEFAULT_SCENE_SETTINGS, ...input.settings }, createdAt: now() };
      db.scenes.push(scene);
      this.audit(orgId, ctx.user, 'create', 'scene', scene.id, { name: scene.name });
      return { created: scene };
    }
    if ((r = ms(/^\/scenes\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'editor');
      const scene = this.find(db.scenes, r[1]!, orgId);
      if (method === 'PATCH') {
        const input = parse(scenePatch, body);
        if (input.name) scene.name = input.name;
        if (input.template) scene.template = input.template;
        if (input.settings) scene.settings = { ...scene.settings, ...input.settings };
        this.audit(orgId, ctx.user, 'update', 'scene', scene.id, { name: scene.name });
        this.changed();
        return scene;
      }
      if (method === 'DELETE') {
        const used = db.screens.find(
          (s) => s.orgId === orgId && (s.schedule.defaultSceneId === scene.id || s.schedule.rules.some((x) => x.sceneId === scene.id)),
        );
        if (used) throw new HttpError(409, 'scene_in_use', { screen: used.name });
        db.scenes = db.scenes.filter((s) => s !== scene);
        this.audit(orgId, ctx.user, 'delete', 'scene', scene.id);
        return { ok: true };
      }
    }

    // Экраны
    if (sub === '/screens' && method === 'GET') {
      this.org(orgId, 'viewer');
      return db.screens
        .filter((s) => s.orgId === orgId)
        .map((s) => ({
          ...s,
          token: undefined,
          locationName: db.locations.find((l) => l.id === s.locationId)?.name ?? '',
          online: Boolean(s.lastSeenAt && Date.now() - new Date(s.lastSeenAt).getTime() < ONLINE_MS),
        }));
    }
    if (sub === '/screens/claim' && method === 'POST') {
      const ctx = this.org(orgId, 'admin');
      const input = parse(claimScreenInput, body);
      this.find(db.locations, input.locationId, orgId);
      const pairing = db.pairings.find((p) => p.code === input.code && !p.screenId && p.expiresAt > Date.now());
      if (!pairing) throw new HttpError(404, 'invalid_code');
      const first = db.scenes.find((s) => s.orgId === orgId);
      const screen: Screen = {
        id: uuid(),
        orgId,
        locationId: input.locationId,
        name: input.name,
        orientation: 'landscape',
        schedule: { defaultSceneId: first?.id ?? null, rules: [] },
        token: pairing.token,
        pairedAt: now(),
        lastSeenAt: null,
        lastStatus: null,
        createdAt: now(),
      };
      db.screens.push(screen);
      pairing.screenId = screen.id;
      this.audit(orgId, ctx.user, 'create', 'screen', screen.id, { name: screen.name });
      this.changed();
      return { created: { ...screen, token: undefined } };
    }
    if ((r = ms(/^\/screens\/([^/]+)\/reload$/)) && method === 'POST') {
      this.org(orgId, 'editor');
      const screen = this.find(db.screens, r[1]!, orgId);
      this.emit({ type: 'reload', screenId: screen.id });
      return { ok: true };
    }
    if ((r = ms(/^\/screens\/([^/]+)$/))) {
      const ctx = this.org(orgId, 'admin');
      const screen = this.find(db.screens, r[1]!, orgId);
      if (method === 'PATCH') {
        const input = parse(screenPatch, body);
        if (input.locationId) this.find(db.locations, input.locationId, orgId);
        if (input.schedule) {
          const ids = [input.schedule.defaultSceneId, ...input.schedule.rules.map((x) => x.sceneId)].filter((x): x is string => Boolean(x));
          if (ids.some((id) => !db.scenes.some((s) => s.id === id && s.orgId === orgId))) throw new HttpError(400, 'validation');
        }
        Object.assign(screen, input);
        this.audit(orgId, ctx.user, 'update', 'screen', screen.id, { name: screen.name });
        this.changed();
        return { ...screen, token: undefined };
      }
      if (method === 'DELETE') {
        db.screens = db.screens.filter((s) => s !== screen);
        this.audit(orgId, ctx.user, 'delete', 'screen', screen.id);
        this.emit({ type: 'unpaired', screenId: screen.id });
        return { ok: true };
      }
    }
    throw new HttpError(404, 'not_found');
  }

  // --- API телевизора ---

  createPairing(token: string) {
    const existing = this.db.pairings.find((p) => p.token === token && !p.screenId && p.expiresAt > Date.now());
    if (existing) return existing;
    let code = '';
    do code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    while (this.db.pairings.some((p) => p.code === code && !p.screenId));
    const pairing: Pairing = { id: uuid(), code, token, screenId: null, expiresAt: Date.now() + 30 * 60_000 };
    this.db.pairings = this.db.pairings.filter((p) => p.expiresAt > Date.now()).concat(pairing);
    this.save();
    return pairing;
  }

  screenByToken(token: string) {
    return this.db.screens.find((s) => s.token === token) ?? null;
  }

  heartbeat(token: string, sceneId: string | null) {
    const screen = this.screenByToken(token);
    if (!screen) return;
    screen.lastSeenAt = now();
    screen.lastStatus = { version: null, playerVersion: 'demo', sceneId, online: true, viewport: `${innerWidth}x${innerHeight}` };
    this.save();
  }

  /** Манифест по тем же правилам, что на сервере: стоп-лист и цены точки, табак по 15-ФЗ. */
  manifest(token: string): PlayerManifest | null {
    const db = this.db;
    const screen = this.screenByToken(token);
    if (!screen) return null;
    const org = db.orgs.find((o) => o.id === screen.orgId)!;
    const loc = db.locations.find((l) => l.id === screen.locationId)!;
    const sceneIds = [screen.schedule.defaultSceneId, ...screen.schedule.rules.map((x) => x.sceneId)].filter((x): x is string => Boolean(x));
    const collator = new Intl.Collator(org.locale);
    const media: string[] = [];
    const mediaView = (id: string | null): MediaView | null => {
      const mm = id ? db.media.find((x) => x.id === id) : undefined;
      return mm ? { id: mm.id, kind: mm.kind, url: mm.url, thumbUrl: mm.thumbUrl, width: mm.width, height: mm.height } : null;
    };
    const scenes: Record<string, SceneView> = {};
    for (const id of new Set(sceneIds)) {
      const s = db.scenes.find((x) => x.id === id && x.orgId === org.id);
      if (!s) continue;
      const categories: CategoryView[] = s.settings.categoryIds
        .map((cid) => db.categories.find((c) => c.id === cid && c.orgId === org.id))
        .filter((c): c is Cat => Boolean(c))
        .map((c) => {
          const tobacco = c.compliance === 'tobacco';
          const items: ItemView[] = db.items
            .filter((i) => i.categoryId === c.id && !i.hidden)
            .sort((a, b) => a.sort - b.sort)
            .map((i) => {
              const o = db.overrides.find((x) => x.itemId === i.id && x.locationId === loc.id);
              return {
                id: i.id,
                name: i.name,
                nameSecondary: i.nameSecondary,
                description: i.description,
                portion: i.portion,
                price: o?.price ?? i.price,
                variants: i.variants,
                badges: tobacco ? [] : i.badges,
                image: tobacco ? null : mediaView(i.imageId),
                soldOut: o?.soldOut ?? i.soldOut,
              };
            });
          if (tobacco) items.sort((a, b) => collator.compare(a.name, b.name));
          return { id: c.id, name: c.name, nameSecondary: c.nameSecondary, compliance: c.compliance, variantLabels: c.variantLabels, items };
        });
      const background = mediaView(s.settings.backgroundMediaId);
      if (background) media.push(background.url);
      scenes[s.id] = { id: s.id, name: s.name, template: s.template, settings: s.settings, background, categories };
    }
    const content = {
      screen: { id: screen.id, name: screen.name, orientation: screen.orientation },
      location: { id: loc.id, name: loc.name, timezone: loc.timezone },
      org: { name: org.name, currency: org.currency, locale: org.locale },
      schedule: screen.schedule,
      scenes,
      media,
    };
    return { version: hash(JSON.stringify(content)), generatedAt: now(), ...content };
  }
}

/** Версия манифеста — хэш содержимого (FNV-1a), как sha256 на сервере. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Фото уменьшаются в браузере, как sharp на сервере: 1600 px и превью 640 px. */
async function storeFile(file: File, orgId: string): Promise<Media> {
  const base = { id: uuid(), orgId, status: 'ready' as const, originalName: file.name.slice(0, 200), createdAt: now() };
  if (file.type.startsWith('video/')) {
    return { ...base, kind: 'video', url: URL.createObjectURL(file), thumbUrl: null, width: null, height: null, sizeBytes: file.size };
  }
  if (!file.type.startsWith('image/')) throw new HttpError(415, 'unsupported_type');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new HttpError(400, 'invalid_image');
  });
  const draw = (max: number, quality: number) => {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { url: canvas.toDataURL('image/jpeg', quality), width: canvas.width, height: canvas.height };
  };
  const main = draw(1600, 0.82);
  const thumb = draw(480, 0.8);
  return { ...base, kind: 'image', url: main.url, thumbUrl: thumb.url, width: main.width, height: main.height, sizeBytes: main.url.length };
}

/** Подменяет fetch для /api/…: панель думает, что говорит с настоящим сервером. */
export function installMockApi(): MockApi {
  const api = new MockApi();
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, location.href);
    if (!url.pathname.startsWith('/api/') || url.origin !== location.origin) return realFetch(input, init);
    const method = (init?.method ?? 'GET').toUpperCase();
    let body: unknown;
    if (init?.body instanceof FormData) body = init.body;
    else if (typeof init?.body === 'string' && init.body) body = JSON.parse(init.body);
    // Небольшая задержка, как у сети: интерфейс выглядит и ведёт себя честно.
    await new Promise((r) => setTimeout(r, 60));
    const { status, data } = await api.handle(method, url.pathname.slice(4), body);
    return new Response(data === undefined ? '' : JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  };
  return api;
}
