import { menuFileScenes, menuFileSchema } from '@dm/shared';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { importMenu } from '../src/menu-import';
import { client, manifestOf, pairScreenOn, registration, setupApp } from './helpers';

// Турецкая сеть в европейском контуре: цены в лирах, меню на турецком, импорт из файла меню.

let env: Awaited<ReturnType<typeof setupApp>>;

beforeAll(async () => {
  env = await setupApp('eu');
});
afterAll(async () => {
  await env?.close();
});

const OWNER = { email: 'Owner@Chain.example', name: 'Owner', password: 'secret-password', locale: 'ru' as const };

const menuFile = (over: Record<string, unknown> = {}) =>
  menuFileSchema.parse({
    org: { name: 'Zincir Kahve', country: 'TR', currency: 'TRY', locale: 'tr', businessType: 'coffee' },
    locations: [
      { key: 'fethiye', name: 'Fethiye', timezone: 'Europe/Istanbul' },
      { key: 'kas', name: 'Kaş', address: 'Merkez', timezone: 'Europe/Istanbul' },
    ],
    categories: [
      {
        key: 'sicak',
        name: 'Sıcak Kahveler',
        nameSecondary: 'Hot coffee',
        variantLabels: ['S', 'M', 'L'],
        items: [
          // Порядок ключей нарочно не совпадает с колонками.
          { name: 'Latte', variants: { L: 170, S: 130, M: 150 }, badges: ['hit'] },
          { name: 'Türk Kahvesi', variants: { S: 100 } },
        ],
      },
      {
        key: 'yilbasi',
        name: 'Yılbaşı Özel',
        items: [{ name: 'Kestaneli Latte', price: 190.5, locationPrices: { kas: 175 }, badges: ['new'], featured: true, image: 'latte.png' }],
      },
    ],
    scenes: [
      { key: 'ana', name: 'Yılbaşı menüsü', template: 'newyear', categories: ['yilbasi', 'sicak'], settings: { title: 'Yılbaşı Menüsü' } },
      { key: 'kahve', name: 'Kahveler', template: 'crema', categories: ['sicak'] },
    ],
    ...over,
  });

const png = () => sharp({ create: { width: 800, height: 600, channels: 3, background: '#7a4b2a' } }).png().toBuffer();

describe('Turkey', () => {
  it('registers a Turkish café in the EU contour with prices in lira', async () => {
    const c = client(env.app);
    const res = await c.post('/api/auth/register', registration({ country: 'TR', locale: 'en', timezone: 'Europe/Istanbul' }));
    expect(res.status).toBe(201);
    const me = await c.get('/api/auth/me');
    expect(me.body.orgs[0]).toMatchObject({ currency: 'TRY', region: 'eu' });

    // Язык меню на экранах переключается в настройках организации.
    const patched = await c.patch(`/api/orgs/${res.body.orgId}`, { locale: 'tr' });
    expect(patched.status).toBe(200);
    expect(patched.body.locale).toBe('tr');
  });

  it('rejects menu files with unknown sizes, categories or missing prices', () => {
    const base = menuFile();
    const broken = {
      ...base,
      categories: [{ ...base.categories[0]!, items: [{ name: 'Latte', variants: { XL: 200 } }, { name: 'Free' }] }],
      scenes: [{ key: 'x', name: 'X', template: 'newyear', categories: ['nope'] }],
    };
    broken.categories[0]!.items.push({ name: 'Mocha', price: 200, locationPrices: { bodrum: 210 } } as never);
    const result = menuFileSchema.safeParse(broken);
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message).join('\n');
    expect(messages).toMatch(/Unknown sizes XL/);
    expect(messages).toMatch(/neither price nor variants/);
    expect(messages).toMatch(/Unknown category "nope"/);
    expect(messages).toMatch(/Unknown location "bodrum"/);
  });

  it('imports a chain from a menu file and serves it to a paired TV', async () => {
    const menu = menuFile();
    const reads: string[] = [];
    const result = await importMenu(env.sql, env.storage, menu, {
      region: 'eu',
      owner: OWNER,
      readImage: async (p) => {
        reads.push(p);
        return png();
      },
    });
    expect(result).toMatchObject({ created: true, locations: 2, categories: 2, items: 3, images: 1, scenes: 2 });
    expect(reads).toEqual(['latte.png']);

    const c = client(env.app);
    expect((await c.post('/api/auth/login', { email: OWNER.email, password: OWNER.password })).status).toBe(200);
    const me = await c.get('/api/auth/me');
    expect(me.body.user.locale).toBe('ru');
    expect(me.body.orgs[0]).toMatchObject({ id: result.orgId, currency: 'TRY', locale: 'tr', role: 'owner' });

    const scenes = await c.get(`/api/orgs/${result.orgId}/scenes`);
    const main = scenes.body.find((s: { name: string }) => s.name === 'Yılbaşı menüsü');
    const { token, screenId } = await pairScreenOn(env.app, c, result.orgId, 'Kasa');
    const screen = await c.patch(`/api/orgs/${result.orgId}/screens/${screenId}`, { schedule: { defaultSceneId: main.id, rules: [] } });
    expect(screen.status).toBe(200);

    const m = await manifestOf(env.app, token);
    expect(m.org).toEqual({ name: 'Zincir Kahve', currency: 'TRY', locale: 'tr' });
    const scene = m.scenes[main.id]!;
    expect(scene.template).toBe('newyear');
    expect(scene.categories.map((cat) => cat.name)).toEqual(['Yılbaşı Özel', 'Sıcak Kahveler']);
    const [special] = scene.categories[0]!.items;
    expect(special).toMatchObject({ name: 'Kestaneli Latte', price: 19050, badges: ['new'] });
    expect(special!.image?.thumbUrl).toMatch(/-thumb\.webp$/);
    // Экран стоит в Фетхие — общая цена; в Каше действует своя.
    const [override] = await env.sql<{ price: number; name: string }[]>`
      select o.price, l.name from item_location_overrides o join locations l on l.id = o.location_id where o.item_id = ${special!.id}`;
    expect(override).toEqual({ price: 17500, name: 'Kaş' });
    expect(menuFileScenes(menu, undefined, 'kas')[0]!.categories[0]!.items[0]!.price).toBe(17500);
    expect(scene.categories[1]!.items[0]!.variants).toEqual([
      { label: 'S', price: 13000 },
      { label: 'M', price: 15000 },
      { label: 'L', price: 17000 },
    ]);
  });

  it('re-imports with replace: new menu, same locations, screens follow scenes by name', async () => {
    const first = menuFile();
    await expect(importMenu(env.sql, env.storage, first, { region: 'eu', owner: OWNER })).rejects.toThrow(/already exists/);

    const updated = menuFile({
      categories: [{ key: 'sicak', name: 'Sıcak Kahveler', variantLabels: ['S', 'M'], items: [{ name: 'Latte', variants: { S: 140, M: 160 } }] }],
      scenes: [
        { key: 'yeni', name: 'Yeni sahne', template: 'noir', categories: ['sicak'] },
        { key: 'ana', name: 'Yılbaşı menüsü', template: 'newyear', categories: ['sicak'] },
      ],
    });
    const result = await importMenu(env.sql, env.storage, updated, { region: 'eu', owner: OWNER, replace: true });
    expect(result).toMatchObject({ created: false, locations: 0, items: 1, scenes: 2, screensUpdated: 1 });

    const [screen] = await env.sql<{ schedule: { defaultSceneId: string } }[]>`
      select schedule from screens where org_id = ${result.orgId}`;
    const [scene] = await env.sql<{ name: string }[]>`select name from scenes where id = ${screen!.schedule.defaultSceneId}`;
    expect(scene!.name).toBe('Yılbaşı menüsü');
    const [locations] = await env.sql<{ count: number }[]>`select count(*)::int as count from locations where org_id = ${result.orgId}`;
    expect(locations!.count).toBe(2);
  });

  it('refuses to import a Turkish chain into the Russian contour', async () => {
    await expect(importMenu(env.sql, env.storage, menuFile(), { region: 'ru', owner: OWNER })).rejects.toThrow(/"eu" region/);
  });
});
