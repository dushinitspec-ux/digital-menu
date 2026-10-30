import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureBootstrapAccount } from '../src/bootstrap';
import { client, registration, setupApp } from './helpers';

// Закрытый пилот: регистрация выключена, аккаунт сети создаётся из переменных окружения.
let env: Awaited<ReturnType<typeof setupApp>>;
const OWNER = { email: 'owner@understone.example', password: 'pilot-password-1' };

beforeAll(async () => {
  env = await setupApp('ru', {
    REGISTRATION: 'closed',
    BOOTSTRAP_ORG_NAME: 'Understone',
    BOOTSTRAP_OWNER_EMAIL: OWNER.email,
    BOOTSTRAP_OWNER_PASSWORD: OWNER.password,
    BOOTSTRAP_BUSINESS_TYPE: 'bar',
  });
});
afterAll(async () => {
  await env?.close();
});

describe('closed pilot', () => {
  it('rejects public sign-up and tells the dashboard', async () => {
    const c = client(env.app);
    expect((await c.get('/api/config')).body.registrationOpen).toBe(false);
    const res = await c.post('/api/auth/register', registration());
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('registration_closed');
  });

  it('creates the bootstrap account once, on the free plan', async () => {
    const logs: string[] = [];
    await ensureBootstrapAccount(env.sql, env.config, (m) => logs.push(m));
    await ensureBootstrapAccount(env.sql, env.config, (m) => logs.push(m));
    expect(logs.filter((m) => m.startsWith('bootstrap account created'))).toHaveLength(1);

    const c = client(env.app);
    expect((await c.post('/api/auth/login', OWNER)).status).toBe(200);
    const me = await c.get('/api/auth/me');
    expect(me.body.orgs).toEqual([expect.objectContaining({ name: 'Understone', role: 'owner', plan: 'complimentary', currency: 'RUB' })]);
    const catalog = await c.get(`/api/orgs/${me.body.orgs[0].id}/catalog`);
    expect(catalog.body.categories.map((x: { name: string }) => x.name)).toContain('Коктейли');
  });

  it('changes the password and signs out other devices', async () => {
    const phone = client(env.app);
    const laptop = client(env.app);
    await phone.post('/api/auth/login', OWNER);
    await laptop.post('/api/auth/login', OWNER);
    expect((await laptop.post('/api/auth/password', { currentPassword: 'nope', newPassword: 'new-password-2' })).status).toBe(400);
    expect((await laptop.post('/api/auth/password', { currentPassword: OWNER.password, newPassword: 'new-password-2' })).status).toBe(200);
    expect((await laptop.get('/api/auth/me')).status).toBe(200);
    expect((await phone.get('/api/auth/me')).status).toBe(401);
    expect((await client(env.app).post('/api/auth/login', { email: OWNER.email, password: 'new-password-2' })).status).toBe(200);
  });
});
