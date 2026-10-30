import { currencyForCountry, loginInput, REGION_DEFAULTS, regionForCountry, registerInput } from '@dm/shared';
import type { FastifyInstance } from 'fastify';
import { createSession, requireUser, SESSION_COOKIE, setSessionCookie } from '../auth';
import type { Ctx } from '../context';
import { conflict, HttpError, parse } from '../http';
import { hashPassword, sha256, verifyPassword } from '../security';
import { seedDemoMenu } from '../seed';

// Хэш для выравнивания времени ответа, когда пользователя нет.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);

export function registerAuthRoutes(app: FastifyInstance, { sql, config }: Ctx) {
  const authLimit = { config: { rateLimit: { max: config.authRateLimit, timeWindow: '1 minute' } } };

  app.get('/api/config', async () => ({
    region: config.region,
    brandName: config.brandName,
    otherRegionUrl: config.otherRegionUrl,
    ...REGION_DEFAULTS[config.region],
  }));

  app.post('/api/auth/register', authLimit, async (req, reply) => {
    const input = parse(registerInput, req.body);
    // Аккаунт создаётся только в контуре своей страны: данные клиента из РФ не попадают в EU и наоборот.
    if (regionForCountry(input.country) !== config.region) {
      throw new HttpError(409, 'wrong_region', 'Register in the other region', { redirect: config.otherRegionUrl });
    }
    const passwordHash = await hashPassword(input.password);
    const result = await sql.begin(async (tx) => {
      const [existing] = await tx`select 1 from users where email = ${input.email}`;
      if (existing) throw conflict('email_taken');
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, name, password_hash, locale)
        values (${input.email}, ${input.name}, ${passwordHash}, ${input.locale}) returning id`;
      const [org] = await tx<{ id: string }[]>`
        insert into organizations (name, region, country, business_type, currency, locale)
        values (${input.orgName}, ${config.region}, ${input.country}, ${input.businessType},
                ${currencyForCountry(input.country)}, ${input.locale})
        returning id`;
      await tx`insert into memberships (org_id, user_id, role) values (${org!.id}, ${user!.id}, 'owner')`;
      await tx`insert into locations (org_id, name, timezone) values (${org!.id}, ${input.orgName}, ${input.timezone})`;
      await seedDemoMenu(tx, org!.id, input.businessType, input.locale);
      const session = await createSession(tx, user!.id, req.headers['user-agent'] ?? '');
      return { userId: user!.id, orgId: org!.id, session };
    });
    setSessionCookie(reply, result.session.token, result.session.expiresAt, config.cookieSecure);
    return reply.code(201).send({ userId: result.userId, orgId: result.orgId });
  });

  app.post('/api/auth/login', authLimit, async (req, reply) => {
    const input = parse(loginInput, req.body);
    const [user] = await sql<{ id: string; passwordHash: string }[]>`
      select id, password_hash from users where email = ${input.email}`;
    const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'invalid_credentials');
    const session = await createSession(sql, user.id, req.headers['user-agent'] ?? '');
    await sql`update users set last_login_at = now() where id = ${user.id}`;
    setSessionCookie(reply, session.token, session.expiresAt, config.cookieSecure);
    return { userId: user.id };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await sql`delete from sessions where id = ${sha256(token)}`;
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (req) => {
    const user = requireUser(req);
    const orgs = await sql`
      select o.id, o.name, o.region, o.currency, o.locale, o.business_type, m.role
      from memberships m join organizations o on o.id = m.org_id
      where m.user_id = ${user.id}
      order by m.created_at`;
    return { user, orgs };
  });
}
