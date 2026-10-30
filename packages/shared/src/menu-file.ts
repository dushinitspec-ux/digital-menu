import { z } from 'zod';
import { businessTypeSchema, localeSchema, sceneSettingsSchema, templateSchema, timezoneSchema } from './schemas';
import { BADGES, DEFAULT_SCENE_SETTINGS, type CategoryView, type ItemView, type SceneView, type Variant } from './types';

/*
 * Меню сети в одном JSON-файле (menus/<сеть>/menu.json). Из него импортёр заводит организацию в базе,
 * а видео-рендер собирает ролики для экранов. Цены в файле — в обычных единицах: 185 значит 185 ₺,
 * в минимальные единицы (куруши, копейки, центы) их переводит схема.
 */

const KEY = /^[a-z0-9][a-z0-9-]*$/;
const key = z.string().regex(KEY, 'Use lowercase latin letters, digits and dashes');
const text = (max: number) => z.string().trim().max(max).default('');
const name = (max = 120) => z.string().trim().min(1).max(max);
const majorPrice = z
  .number()
  .min(0)
  .max(1_000_000)
  .transform((v) => Math.round(v * 100));

const menuItemSchema = z.object({
  name: name(120),
  nameSecondary: text(120),
  description: text(400),
  portion: text(40),
  price: majorPrice.nullable().default(null),
  /** Цены по размерам: { "S": 160, "M": 185 }. Порядок ключей — порядок колонок. */
  variants: z.record(name(20), majorPrice).default({}),
  badges: z.array(z.enum(BADGES)).max(3).default([]),
  soldOut: z.boolean().default(false),
  /** Фото позиции: путь относительно файла меню. */
  image: z.string().trim().min(1).max(300).optional(),
  /** Показывать в промо-ролике. */
  featured: z.boolean().default(false),
});

const menuCategorySchema = z.object({
  key,
  name: name(80),
  nameSecondary: text(80),
  variantLabels: z.array(name(20)).max(4).default([]),
  items: z.array(menuItemSchema).max(200),
});

const menuSceneSchema = z.object({
  key,
  name: name(80),
  template: templateSchema,
  categories: z.array(key).min(1).max(40),
  settings: sceneSettingsSchema.omit({ categoryIds: true, backgroundMediaId: true }).partial().default({}),
});

export const menuFileSchema = z
  .object({
    org: z.object({
      name: name(120),
      country: z.string().trim().toUpperCase().length(2),
      currency: z.enum(['RUB', 'EUR', 'TRY']),
      locale: localeSchema,
      businessType: businessTypeSchema,
    }),
    locations: z
      .array(z.object({ name: name(120), address: text(300), timezone: timezoneSchema }))
      .min(1)
      .max(100),
    categories: z.array(menuCategorySchema).min(1).max(60),
    scenes: z.array(menuSceneSchema).min(1).max(30),
    /** Промо-ролик: слайды с позициями featured и финальное поздравление. */
    showcase: z
      .object({
        kicker: text(60),
        slideSec: z.number().min(3).max(20).default(6),
        closingTitle: text(60),
        closingSubtitle: text(120),
      })
      .partial()
      .default({}),
  })
  .superRefine((menu, ctx) => {
    const keys = new Set<string>();
    menu.categories.forEach((c, i) => {
      if (keys.has(c.key)) ctx.addIssue({ code: 'custom', path: ['categories', i, 'key'], message: `Duplicate category key "${c.key}"` });
      keys.add(c.key);
      c.items.forEach((item, j) => {
        const labels = Object.keys(item.variants);
        if (item.price === null && labels.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['categories', i, 'items', j], message: `"${item.name}" has neither price nor variants` });
        }
        const unknown = c.variantLabels.length ? labels.filter((l) => !c.variantLabels.includes(l)) : [];
        if (unknown.length) {
          ctx.addIssue({ code: 'custom', path: ['categories', i, 'items', j, 'variants'], message: `Unknown sizes ${unknown.join(', ')} for "${c.name}"` });
        }
      });
    });
    menu.scenes.forEach((s, i) => {
      for (const k of s.categories) {
        if (!keys.has(k)) ctx.addIssue({ code: 'custom', path: ['scenes', i, 'categories'], message: `Unknown category "${k}"` });
      }
    });
  });

export type MenuFile = z.output<typeof menuFileSchema>;
export type MenuFileItem = MenuFile['categories'][number]['items'][number];

export function menuItemVariants(item: MenuFileItem, variantLabels: string[]): Variant[] {
  const labels = variantLabels.length ? variantLabels.filter((l) => l in item.variants) : Object.keys(item.variants);
  return labels.map((label) => ({ label, price: item.variants[label]! }));
}

/** Сцены в том виде, в каком их рисует плеер, — без базы: для видео-рендера и проверки файла. */
export function menuFileScenes(menu: MenuFile, resolveImage: (path: string) => string | null = () => null): SceneView[] {
  const categories = new Map<string, CategoryView>();
  for (const c of menu.categories) {
    const items: ItemView[] = c.items.map((item, i) => {
      const url = item.image ? resolveImage(item.image) : null;
      return {
        id: `${c.key}-${i}`,
        name: item.name,
        nameSecondary: item.nameSecondary,
        description: item.description,
        portion: item.portion,
        price: item.price,
        variants: menuItemVariants(item, c.variantLabels),
        badges: item.badges,
        image: url ? { id: `${c.key}-${i}-img`, kind: 'image', url, thumbUrl: url, width: null, height: null } : null,
        soldOut: item.soldOut,
      };
    });
    categories.set(c.key, { id: c.key, name: c.name, nameSecondary: c.nameSecondary, compliance: 'none', variantLabels: c.variantLabels, items });
  }
  return menu.scenes.map((s) => ({
    id: s.key,
    name: s.name,
    template: s.template,
    settings: { ...DEFAULT_SCENE_SETTINGS, ...s.settings, categoryIds: s.categories, backgroundMediaId: null },
    background: null,
    categories: s.categories.map((k) => categories.get(k)!),
  }));
}

export interface ShowcaseSlide {
  item: ItemView;
  category: string;
  variantLabels: string[];
}

/** Позиции для промо-ролика: отмеченные featured, а если таких нет — с меткой «Новинка» или «Акция». */
export function menuFileShowcase(menu: MenuFile, resolveImage: (path: string) => string | null = () => null): ShowcaseSlide[] {
  const scenes = menuFileScenes(menu, resolveImage);
  const byId = new Map(scenes.flatMap((s) => s.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const))));
  const pick = (test: (item: MenuFileItem) => boolean) =>
    menu.categories.flatMap((c) =>
      c.items.flatMap((item, i) => {
        const view = byId.get(`${c.key}-${i}`);
        return test(item) && view && !item.soldOut ? [{ item: view, category: c.name, variantLabels: c.variantLabels }] : [];
      }),
    );
  const featured = pick((i) => i.featured);
  return featured.length ? featured : pick((i) => i.badges.includes('new') || i.badges.includes('promo'));
}
