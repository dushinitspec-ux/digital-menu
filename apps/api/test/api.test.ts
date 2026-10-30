import type { AddressInfo } from 'node:net';
import type { PlayerManifest } from '@dm/shared';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, manifestOf, pairScreenOn, registration, setupApp } from './helpers';

let env: Awaited<ReturnType<typeof setupApp>>;

beforeAll(async () => {
  env = await setupApp('ru');
});
afterAll(async () => {
  await env?.close();
});

async function newOwner(over: Record<string, unknown> = {}) {
  const c = client(env.app);
  const reg = registration(over);
  const res = await c.post('/api/auth/register', reg);
  expect(res.status).toBe(201);
  return { c, orgId: res.body.orgId as string, email: reg.email };
}

const pairScreen = (c: ReturnType<typeof client>, orgId: string, name?: string) => pairScreenOn(env.app, c, orgId, name);
const manifest = (token: string) => manifestOf(env.app, token);

describe('registration and access', () => {
  it('registers an owner with a demo menu and session', async () => {
    const { c, orgId } = await newOwner();
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.orgs).toEqual([expect.objectContaining({ id: orgId, role: 'owner', currency: 'RUB', region: 'ru' })]);
    const catalog = await c.get(`/api/orgs/${orgId}/catalog`);
    expect(catalog.body.categories.map((x: { name: string }) => x.name)).toContain('Кофе');
    const cappuccino = catalog.body.items.find((i: { name: string }) => i.name === 'Капучино');
    expect(cappuccino.variants).toEqual([
      { label: 'S', price: 22000 },
      { label: 'M', price: 26000 },
      { label: 'L', price: 30000 },
    ]);
    expect(cappuccino.badges).toEqual(['hit']);
  });

  it('sends clients of the other region to the other contour', async () => {
    const res = await client(env.app).post('/api/auth/register', registration({ country: 'DE' }));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'wrong_region', details: { redirect: 'https://eu.example.com' } });
  });

  it('rejects duplicate e-mail and bad passwords', async () => {
    const { email } = await newOwner();
    const dup = await client(env.app).post('/api/auth/register', registration({ email }));
    expect(dup.status).toBe(409);
    const bad = await client(env.app).post('/api/auth/login', { email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    const ok = await client(env.app).post('/api/auth/login', { email: email.toUpperCase(), password: 'secret-password' });
    expect(ok.status).toBe(200);
  });

  it('requires the anti-CSRF header on cookie requests', async () => {
    const res = await env.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.c', password: 'x' } });
    expect(res.statusCode).toBe(403);
  });

  it('isolates organisations from each other', async () => {
    const a = await newOwner();
    const b = await newOwner();
    expect((await b.c.get(`/api/orgs/${a.orgId}/catalog`)).status).toBe(404);
    const itemA = (await a.c.get(`/api/orgs/${a.orgId}/catalog`)).body.items[0];
    // Чужая позиция через свою организацию тоже не находится.
    expect((await b.c.patch(`/api/orgs/${b.orgId}/items/${itemA.id}`, { price: 1 })).status).toBe(404);
  });

  it('enforces roles: viewer reads, editor edits menu, only admin manages screens', async () => {
    const { c, orgId } = await newOwner();
    const add = (role: string) =>
      c.post(`/api/orgs/${orgId}/members`, {
        email: `${role}-${Math.random().toString(36).slice(2)}@example.com`,
        name: role,
        role,
        password: 'staff-password',
      });
    const viewerRes = await add('viewer');
    const editorRes = await add('editor');
    expect(viewerRes.status).toBe(201);
    const viewer = client(env.app);
    await viewer.post('/api/auth/login', { email: viewerRes.body.email, password: 'staff-password' });
    const editor = client(env.app);
    await editor.post('/api/auth/login', { email: editorRes.body.email, password: 'staff-password' });

    const item = (await viewer.get(`/api/orgs/${orgId}/catalog`)).body.items[0];
    expect((await viewer.patch(`/api/orgs/${orgId}/items/${item.id}`, { soldOut: true })).status).toBe(403);
    expect((await editor.patch(`/api/orgs/${orgId}/items/${item.id}`, { soldOut: true })).status).toBe(200);
    expect((await editor.post(`/api/orgs/${orgId}/screens/claim`, { code: '000000', locationId: item.id, name: 'x' })).status).toBe(403);
    expect((await editor.get(`/api/orgs/${orgId}/members`)).status).toBe(403);
  });
});

describe('screens and player', () => {
  it('pairs a TV by code and serves its manifest with ETag', async () => {
    const { c, orgId } = await newOwner();
    const { token } = await pairScreen(c, orgId);
    const m = await manifest(token);
    expect(m.org).toEqual({ name: 'Кофейня на Мясницкой', currency: 'RUB', locale: 'ru' });
    expect(m.location.timezone).toBe('Europe/Moscow');
    const scene = m.scenes[m.schedule.defaultSceneId!]!;
    expect(scene.template).toBe('crema');
    expect(scene.categories.map((x) => x.name)).toEqual(['Кофе', 'Не кофе', 'Выпечка и десерты']);

    const cached = await env.app.inject({
      method: 'GET',
      url: '/api/player/manifest',
      headers: { authorization: `Bearer ${token}`, 'if-none-match': `"${m.version}"` },
    });
    expect(cached.statusCode).toBe(304);
  });

  it('rejects wrong pairing codes and unknown device tokens', async () => {
    const { c, orgId } = await newOwner();
    const locations = await c.get(`/api/orgs/${orgId}/locations`);
    const claim = await c.post(`/api/orgs/${orgId}/screens/claim`, { code: '999999', locationId: locations.body[0].id, name: 'x' });
    expect(claim.status).toBe(404);
    const res = await env.app.inject({ method: 'GET', url: '/api/player/manifest', headers: { authorization: 'Bearer nope' } });
    expect(res.statusCode).toBe(401);
  });

  it('applies the per-location stop-list and price, then falls back', async () => {
    const { c, orgId } = await newOwner();
    const { token, locationId } = await pairScreen(c, orgId);
    const catalog = await c.get(`/api/orgs/${orgId}/catalog`);
    const espresso = catalog.body.items.find((i: { name: string }) => i.name === 'Эспрессо');
    const findItem = (m: PlayerManifest) =>
      Object.values(m.scenes)
        .flatMap((s) => s.categories.flatMap((cat) => cat.items))
        .find((i) => i.id === espresso.id)!;

    expect(findItem(await manifest(token))).toMatchObject({ price: 15000, soldOut: false });
    const put = await c.put(`/api/orgs/${orgId}/items/${espresso.id}/locations/${locationId}`, { soldOut: true, price: 17000 });
    expect(put.status).toBe(200);
    expect(findItem(await manifest(token))).toMatchObject({ price: 17000, soldOut: true });
    await c.put(`/api/orgs/${orgId}/items/${espresso.id}/locations/${locationId}`, { soldOut: null, price: null });
    expect(findItem(await manifest(token))).toMatchObject({ price: 15000, soldOut: false });
  });

  it('renders tobacco categories as a plain alphabetical list (15-ФЗ)', async () => {
    const { c, orgId } = await newOwner({ businessType: 'hookah', orgName: 'Лаунж' });
    const { token } = await pairScreen(c, orgId);
    const m = await manifest(token);
    const tobacco = Object.values(m.scenes)[0]!.categories.find((x) => x.compliance === 'tobacco')!;
    const names = tobacco.items.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ru')));
    expect(tobacco.items.every((i) => i.badges.length === 0 && i.image === null)).toBe(true);
  });

  it('validates schedules against the organisation scenes', async () => {
    const { c, orgId } = await newOwner();
    const { token, screenId } = await pairScreen(c, orgId);
    const scenes = (await c.get(`/api/orgs/${orgId}/scenes`)).body as { id: string; name: string }[];
    const foreign = (await (await newOwner()).c.get('/api/auth/me')).body.orgs[0].id;
    const bad = await c.patch(`/api/orgs/${orgId}/screens/${screenId}`, {
      schedule: { defaultSceneId: foreign, rules: [] },
    });
    expect(bad.status).toBe(400);
    const breakfast = scenes.find((s) => s.name === 'Завтраки')!;
    const schedule = {
      defaultSceneId: scenes[0]!.id,
      rules: [{ id: 'r1', days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', sceneId: breakfast.id }],
    };
    expect((await c.patch(`/api/orgs/${orgId}/screens/${screenId}`, { schedule })).status).toBe(200);
    const m = await manifest(token);
    expect(m.schedule).toEqual(schedule);
    expect(Object.keys(m.scenes).sort()).toEqual([scenes[0]!.id, breakfast.id].sort());
    expect((await c.del(`/api/orgs/${orgId}/scenes/${breakfast.id}`)).status).toBe(409);
  });

  it('unpairs a deleted screen', async () => {
    const { c, orgId } = await newOwner();
    const { token, screenId } = await pairScreen(c, orgId);
    expect((await c.del(`/api/orgs/${orgId}/screens/${screenId}`)).status).toBe(200);
    const res = await env.app.inject({ method: 'GET', url: '/api/player/manifest', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });

  it('pushes a manifest event over SSE seconds after a price change', async () => {
    const { c, orgId } = await newOwner();
    const { token } = await pairScreen(c, orgId);
    await env.app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = env.app.server.address() as AddressInfo;
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/player/events?token=${token}`, { signal: controller.signal });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const nextEvent = async () => {
      for (;;) {
        const idx = buffer.indexOf('\n\n');
        if (idx >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const data = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (data) return JSON.parse(data.slice(6));
          continue;
        }
        const { value, done } = await reader.read();
        if (done) throw new Error('stream closed');
        buffer += decoder.decode(value, { stream: true });
      }
    };
    expect(await nextEvent()).toEqual({ type: 'manifest' }); // начальное событие при подключении

    const item = (await c.get(`/api/orgs/${orgId}/catalog`)).body.items[0];
    const started = Date.now();
    await c.patch(`/api/orgs/${orgId}/items/${item.id}`, { price: 99900 });
    expect(await nextEvent()).toEqual({ type: 'manifest' });
    expect(Date.now() - started).toBeLessThan(2000);

    const screens = await c.get(`/api/orgs/${orgId}/screens`);
    expect(screens.body[0].online).toBe(true);
    controller.abort();
  });
});

describe('media', () => {
  it('uploads a photo, converts it to webp and exposes it to the player', async () => {
    const { c, orgId } = await newOwner();
    const { token } = await pairScreen(c, orgId);
    const png = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#c08040' } }).png().toBuffer();
    const boundary = '----dmtest';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="latte.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await env.app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/media`,
      headers: { 'x-dm-client': '1', cookie: c.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(upload.statusCode).toBe(201);
    const media = upload.json();
    expect(media).toMatchObject({ kind: 'image', width: 1920, height: 1280, status: 'ready' });

    const item = (await c.get(`/api/orgs/${orgId}/catalog`)).body.items[0];
    expect((await c.patch(`/api/orgs/${orgId}/items/${item.id}`, { imageId: media.id })).status).toBe(200);
    const m = await manifest(token);
    expect(m.media).toContain(media.thumbUrl);
    const file = await env.app.inject({ method: 'GET', url: media.thumbUrl });
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toContain('immutable');

    const text = await env.app.inject({
      method: 'POST',
      url: `/api/orgs/${orgId}/media`,
      headers: { 'x-dm-client': '1', cookie: c.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nhi\r\n--${boundary}--\r\n`,
      ),
    });
    expect(text.statusCode).toBe(415);
  });
});
