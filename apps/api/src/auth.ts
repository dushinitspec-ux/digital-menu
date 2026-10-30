import type { Currency, Locale, Region, Role } from '@dm/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db, Tx } from './db';
import { forbidden, isUuid, notFound, unauthorized } from './http';
import { randomToken, sha256 } from './security';

export const SESSION_COOKIE = 'dm_session';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  locale: Locale;
}

export interface OrgRow {
  id: string;
  name: string;
  region: Region;
  country: string;
  businessType: string;
  currency: Currency;
  locale: Locale;
  createdAt: Date;
}

export interface OrgContext {
  org: OrgRow;
  role: Role;
  user: SessionUser;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export const roleAtLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];

export async function loadSessionUser(sql: Db, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await sql<SessionUser[]>`
    select u.id, u.email, u.name, u.locale
    from sessions s join users u on u.id = s.user_id
    where s.id = ${sha256(token)} and s.expires_at > now()`;
  return row ?? null;
}

export async function createSession(sql: Tx, userId: string, userAgent: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`insert into sessions (id, user_id, user_agent, expires_at)
    values (${sha256(token)}, ${userId}, ${userAgent.slice(0, 300)}, ${expiresAt}::timestamptz)`;
  return { token, expiresAt };
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date, secure: boolean) {
  reply.setCookie(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, expires: expiresAt });
}

export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** Проверяет, что пользователь состоит в организации из `:orgId` с ролью не ниже `min`. */
export async function requireOrg(sql: Db, req: FastifyRequest, min: Role): Promise<OrgContext> {
  const user = requireUser(req);
  const orgId = (req.params as { orgId?: string }).orgId ?? '';
  if (!isUuid(orgId)) throw notFound();
  const [row] = await sql<(OrgRow & { role: Role })[]>`
    select o.*, m.role
    from memberships m join organizations o on o.id = m.org_id
    where m.org_id = ${orgId} and m.user_id = ${user.id}`;
  if (!row) throw notFound();
  const { role, ...org } = row;
  if (!roleAtLeast(role, min)) throw forbidden();
  return { org, role, user };
}

export async function audit(
  sql: Tx,
  ctx: OrgContext,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await sql`insert into audit_log (org_id, user_id, action, entity, entity_id, details)
    values (${ctx.org.id}, ${ctx.user.id}, ${action}, ${entity}, ${entityId}, ${sql.json(details as never)})`;
}
