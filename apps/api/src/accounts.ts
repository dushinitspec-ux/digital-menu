import { REGION_DEFAULTS, type BusinessType, type Locale, type Region } from '@dm/shared';
import type { Tx } from './db';
import { conflict } from './http';
import { seedDemoMenu } from './seed';

export interface NewAccount {
  email: string;
  passwordHash: string;
  name: string;
  orgName: string;
  businessType: BusinessType;
  locale: Locale;
  country: string;
  timezone: string;
  region: Region;
  plan?: 'standard' | 'complimentary';
}

/** Владелец, организация, первая точка и демо-меню — одной транзакцией. */
export async function createAccount(tx: Tx, a: NewAccount) {
  const [existing] = await tx`select 1 from users where email = ${a.email}`;
  if (existing) throw conflict('email_taken');
  const [user] = await tx<{ id: string }[]>`
    insert into users (email, name, password_hash, locale)
    values (${a.email}, ${a.name}, ${a.passwordHash}, ${a.locale}) returning id`;
  const [org] = await tx<{ id: string }[]>`
    insert into organizations (name, region, country, business_type, currency, locale, plan)
    values (${a.orgName}, ${a.region}, ${a.country}, ${a.businessType}, ${REGION_DEFAULTS[a.region].currency}, ${a.locale},
            ${a.plan ?? 'standard'})
    returning id`;
  await tx`insert into memberships (org_id, user_id, role) values (${org!.id}, ${user!.id}, 'owner')`;
  await tx`insert into locations (org_id, name, timezone) values (${org!.id}, ${a.orgName}, ${a.timezone})`;
  await seedDemoMenu(tx, org!.id, a.businessType, a.locale);
  return { userId: user!.id, orgId: org!.id };
}
