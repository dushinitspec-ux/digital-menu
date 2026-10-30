import { emailSchema, isValidTimeZone, passwordSchema, REGION_DEFAULTS } from '@dm/shared';
import { createAccount } from './accounts';
import type { Config } from './config';
import type { Db } from './db';
import { hashPassword } from './security';

/**
 * Аккаунт из переменных BOOTSTRAP_* создаётся при первом запуске (например, сеть с бесплатным
 * доступом на закрытом пилоте). Повторные запуски его не трогают, только выставляют тариф.
 */
export async function ensureBootstrapAccount(sql: Db, config: Config, log: (msg: string) => void) {
  const b = config.bootstrap;
  if (!b) return;
  const email = emailSchema.safeParse(b.email);
  const password = passwordSchema.safeParse(b.password);
  if (!email.success || !password.success || !isValidTimeZone(b.timezone)) {
    log('BOOTSTRAP_* ignored: invalid e-mail, password (min 8 chars) or time zone');
    return;
  }
  const [user] = await sql<{ id: string }[]>`select id from users where email = ${email.data}`;
  if (user) {
    await sql`
      update organizations o set plan = ${b.plan}
      from memberships m
      where m.org_id = o.id and m.user_id = ${user.id} and m.role = 'owner' and o.name = ${b.orgName}`;
    return;
  }
  const passwordHash = await hashPassword(password.data);
  await sql.begin((tx) =>
    createAccount(tx, {
      email: email.data,
      passwordHash,
      name: b.name,
      orgName: b.orgName,
      businessType: b.businessType,
      locale: REGION_DEFAULTS[config.region].locale,
      country: b.country.toUpperCase(),
      timezone: b.timezone,
      region: config.region,
      plan: b.plan,
    }),
  );
  log(`bootstrap account created: ${b.orgName} (${email.data}), plan ${b.plan}`);
}
