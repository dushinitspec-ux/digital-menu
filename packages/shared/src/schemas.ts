import { z } from 'zod';
import { isValidHM, isValidTimeZone } from './schedule';
import { BADGES, TEMPLATE_IDS } from './types';

const MAX_PRICE = 100_000_000;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordSchema = z.string().min(8).max(200);
export const timezoneSchema = z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown time zone');
const hmSchema = z.string().refine(isValidHM, 'Expected HH:MM');
const text = (max: number) => z.string().trim().max(max);
const name = (max = 120) => z.string().trim().min(1).max(max);
const price = z.number().int().min(0).max(MAX_PRICE);

export const businessTypeSchema = z.enum(['coffee', 'restaurant', 'cafe', 'bar', 'hookah']);
export const localeSchema = z.enum(['ru', 'en']);
export const roleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export const templateSchema = z.enum(TEMPLATE_IDS);
export const orientationSchema = z.enum(['landscape', 'portrait']);

export const registerInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: name(100),
  orgName: name(120),
  businessType: businessTypeSchema,
  locale: localeSchema,
  /** ISO 3166-1 alpha-2: по стране решается, в каком контуре (RU/EU) живёт аккаунт. */
  country: z.string().trim().toUpperCase().length(2),
  timezone: timezoneSchema,
});
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const orgUpdateInput = z.object({
  name: name(120).optional(),
  locale: localeSchema.optional(),
});

export const locationInput = z.object({
  name: name(120),
  address: text(300).default(''),
  timezone: timezoneSchema,
});

export const variantSchema = z.object({
  label: name(20),
  price,
});

export const categoryInput = z.object({
  name: name(80),
  nameSecondary: text(80).default(''),
  compliance: z.enum(['none', 'tobacco']).default('none'),
  variantLabels: z.array(name(20)).max(4).default([]),
});
export const categoryPatch = categoryInput.partial();

export const itemInput = z.object({
  categoryId: z.uuid(),
  name: name(120),
  nameSecondary: text(120).default(''),
  description: text(400).default(''),
  portion: text(40).default(''),
  price: price.nullable().default(null),
  variants: z.array(variantSchema).max(4).default([]),
  badges: z.array(z.enum(BADGES)).max(3).default([]),
  imageId: z.uuid().nullable().default(null),
  soldOut: z.boolean().default(false),
  hidden: z.boolean().default(false),
});
export const itemPatch = z.object({
  categoryId: z.uuid().optional(),
  name: name(120).optional(),
  nameSecondary: text(120).optional(),
  description: text(400).optional(),
  portion: text(40).optional(),
  price: price.nullable().optional(),
  variants: z.array(variantSchema).max(4).optional(),
  badges: z.array(z.enum(BADGES)).max(3).optional(),
  imageId: z.uuid().nullable().optional(),
  soldOut: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

/** Стоп-лист и цена конкретной точки сети. null — наследовать значение позиции. */
export const itemOverrideInput = z.object({
  soldOut: z.boolean().nullable(),
  price: price.nullable(),
});

export const reorderInput = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});

export const sceneSettingsSchema = z.object({
  title: text(80).default(''),
  subtitle: text(160).default(''),
  categoryIds: z.array(z.uuid()).max(40).default([]),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  backgroundMediaId: z.uuid().nullable().default(null),
  backgroundDim: z.number().min(0).max(0.95).default(0.55),
  showImages: z.boolean().default(true),
  showDescriptions: z.boolean().default(true),
  showSecondaryNames: z.boolean().default(true),
  soldOutMode: z.enum(['mark', 'hide']).default('mark'),
  pageDurationSec: z.number().int().min(4).max(120).default(12),
  columns: z.number().int().min(1).max(4).nullable().default(null),
  footerNote: text(200).default(''),
});

export const sceneInput = z.object({
  name: name(80),
  template: templateSchema,
  settings: sceneSettingsSchema.partial().default({}),
});
export const scenePatch = z.object({
  name: name(80).optional(),
  template: templateSchema.optional(),
  settings: sceneSettingsSchema.partial().optional(),
});

export const scheduleSchema = z.object({
  defaultSceneId: z.uuid().nullable(),
  rules: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
        start: hmSchema,
        end: hmSchema,
        sceneId: z.uuid(),
      }),
    )
    .max(24),
});

export const claimScreenInput = z.object({
  code: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().length(6)),
  locationId: z.uuid(),
  name: name(80),
});

export const screenPatch = z.object({
  name: name(80).optional(),
  locationId: z.uuid().optional(),
  orientation: orientationSchema.optional(),
  schedule: scheduleSchema.optional(),
});

export const memberInput = z.object({
  email: emailSchema,
  name: name(100),
  role: z.enum(['admin', 'editor', 'viewer']),
  password: passwordSchema,
});

export const memberPatch = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

export const heartbeatInput = z.object({
  version: z.string().max(64).nullable(),
  playerVersion: z.string().max(32),
  sceneId: z.string().max(64).nullable(),
  online: z.boolean(),
  viewport: z.string().max(32),
});
