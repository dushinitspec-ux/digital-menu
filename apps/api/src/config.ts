import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .optional();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  REGION: z.enum(['ru', 'eu']),
  /** На Railway можно не задавать: возьмём домен из RAILWAY_PUBLIC_DOMAIN. */
  PUBLIC_URL: z.url().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
  /** closed — регистрироваться могут только приглашённые (аккаунты создаёт владелец сервиса). */
  REGISTRATION: z.enum(['open', 'closed']).default('open'),
  /** Аккаунт, который создаётся при первом запуске, например для первой сети с бесплатным доступом. */
  BOOTSTRAP_ORG_NAME: z.string().optional(),
  BOOTSTRAP_OWNER_EMAIL: z.string().optional(),
  BOOTSTRAP_OWNER_PASSWORD: z.string().optional(),
  BOOTSTRAP_OWNER_NAME: z.string().default('Владелец'),
  BOOTSTRAP_BUSINESS_TYPE: z.enum(['coffee', 'restaurant', 'cafe', 'bar', 'hookah']).default('cafe'),
  BOOTSTRAP_COUNTRY: z.string().default('RU'),
  BOOTSTRAP_TIMEZONE: z.string().default('Europe/Moscow'),
  BOOTSTRAP_PLAN: z.enum(['standard', 'complimentary']).default('complimentary'),
  OTHER_REGION_URL: z.url().optional(),
  BRAND_NAME: z.string().default('Digital Menu'),
  COOKIE_SECURE: bool,
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_DIR: z.string().default(path.join(appRoot, 'storage')),
  MEDIA_BASE_URL: z.string().default('/media'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('ru-central1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).default(100),
  /** Попыток входа и регистрации в минуту с одного IP. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  ADMIN_DIST: z.string().default(path.resolve(appRoot, '../admin/dist')),
  PLAYER_DIST: z.string().default(path.resolve(appRoot, '../player/dist')),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  // Без адреса сервис всё равно запускается (например, первый деплой на Railway до выдачи домена).
  const publicUrl = e.PUBLIC_URL ?? (e.RAILWAY_PUBLIC_DOMAIN ? `https://${e.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${e.PORT}`);
  const bootstrap =
    e.BOOTSTRAP_ORG_NAME && e.BOOTSTRAP_OWNER_EMAIL && e.BOOTSTRAP_OWNER_PASSWORD
      ? {
          orgName: e.BOOTSTRAP_ORG_NAME,
          email: e.BOOTSTRAP_OWNER_EMAIL,
          password: e.BOOTSTRAP_OWNER_PASSWORD,
          name: e.BOOTSTRAP_OWNER_NAME,
          businessType: e.BOOTSTRAP_BUSINESS_TYPE,
          country: e.BOOTSTRAP_COUNTRY,
          timezone: e.BOOTSTRAP_TIMEZONE,
          plan: e.BOOTSTRAP_PLAN,
        }
      : null;
  if (e.STORAGE_DRIVER === 's3' && (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY)) {
    throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
  }
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    region: e.REGION,
    publicUrl: publicUrl.replace(/\/$/, ''),
    otherRegionUrl: e.OTHER_REGION_URL?.replace(/\/$/, '') ?? null,
    brandName: e.BRAND_NAME,
    cookieSecure: e.COOKIE_SECURE ?? publicUrl.startsWith('https://'),
    registrationOpen: e.REGISTRATION === 'open',
    bootstrap,
    storage: {
      driver: e.STORAGE_DRIVER,
      dir: e.STORAGE_DIR,
      mediaBaseUrl: e.MEDIA_BASE_URL.replace(/\/$/, ''),
      s3: {
        endpoint: e.S3_ENDPOINT,
        region: e.S3_REGION,
        bucket: e.S3_BUCKET ?? '',
        accessKeyId: e.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: e.S3_SECRET_ACCESS_KEY ?? '',
      },
    },
    maxUploadBytes: e.MAX_UPLOAD_MB * 1024 * 1024,
    authRateLimit: e.AUTH_RATE_LIMIT,
    adminDist: e.ADMIN_DIST,
    playerDist: e.PLAYER_DIST,
  };
}
