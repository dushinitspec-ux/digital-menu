// Контракт между API, панелью и плеером. Цены — в минимальных единицах валюты (копейки, центы).

export type Region = 'ru' | 'eu';
export type Locale = 'ru' | 'en';
export type Currency = 'RUB' | 'EUR';
export type Role = 'owner' | 'admin' | 'editor' | 'viewer';
export type BusinessType = 'coffee' | 'restaurant' | 'cafe' | 'bar' | 'hookah';

export const TEMPLATE_IDS = ['noir', 'crema', 'neon'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const BADGES = ['new', 'hit', 'vegan', 'spicy', 'promo'] as const;
export type Badge = (typeof BADGES)[number];

export type Orientation = 'landscape' | 'portrait';

/** Особый режим категории: tobacco — перечень по 15-ФЗ (одинаковый шрифт, чёрное на белом, по алфавиту, без изображений). */
export type CategoryCompliance = 'none' | 'tobacco';

export interface Variant {
  label: string;
  price: number;
}

export interface SceneSettings {
  title: string;
  subtitle: string;
  categoryIds: string[];
  accentColor: string | null;
  backgroundMediaId: string | null;
  backgroundDim: number;
  showImages: boolean;
  showDescriptions: boolean;
  showSecondaryNames: boolean;
  soldOutMode: 'mark' | 'hide';
  pageDurationSec: number;
  columns: number | null;
  footerNote: string;
}

export interface ScheduleRule {
  id: string;
  /** Дни недели ISO: 1 — понедельник … 7 — воскресенье. Для ночных интервалов (start > end) день — день начала. */
  days: number[];
  start: string;
  end: string;
  sceneId: string;
}

export interface ScreenSchedule {
  defaultSceneId: string | null;
  rules: ScheduleRule[];
}

export interface MediaView {
  id: string;
  kind: 'image' | 'video';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface ItemView {
  id: string;
  name: string;
  nameSecondary: string;
  description: string;
  portion: string;
  price: number | null;
  variants: Variant[];
  badges: Badge[];
  image: MediaView | null;
  soldOut: boolean;
}

export interface CategoryView {
  id: string;
  name: string;
  nameSecondary: string;
  compliance: CategoryCompliance;
  /** Подписи колонок размеров, например «S · M · L» для кофе. */
  variantLabels: string[];
  items: ItemView[];
}

export interface SceneView {
  id: string;
  name: string;
  template: TemplateId;
  settings: SceneSettings;
  background: MediaView | null;
  categories: CategoryView[];
}

export interface PlayerManifest {
  version: string;
  generatedAt: string;
  screen: { id: string; name: string; orientation: Orientation };
  location: { id: string; name: string; timezone: string };
  org: { name: string; currency: Currency; locale: Locale };
  schedule: ScreenSchedule;
  scenes: Record<string, SceneView>;
  /** Все медиафайлы, которые плеер должен держать в офлайн-кэше. */
  media: string[];
}

/** События SSE-канала плеера. */
export type PlayerEvent =
  | { type: 'manifest' }
  | { type: 'reload' }
  | { type: 'unpaired' };

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  title: '',
  subtitle: '',
  categoryIds: [],
  accentColor: null,
  backgroundMediaId: null,
  backgroundDim: 0.55,
  showImages: true,
  showDescriptions: true,
  showSecondaryNames: true,
  soldOutMode: 'mark',
  pageDurationSec: 12,
  columns: null,
  footerNote: '',
};

export const TEMPLATE_INFO: Record<TemplateId, { name: string; description: { ru: string; en: string }; suits: BusinessType[] }> = {
  noir: {
    name: 'Noir',
    description: {
      ru: 'Тёмный, антиква и золото. Рестораны, бары, кальянные.',
      en: 'Dark, serif and gold. Restaurants, bars, lounges.',
    },
    suits: ['restaurant', 'bar', 'hookah'],
  },
  crema: {
    name: 'Crema',
    description: {
      ru: 'Тёплый светлый, колонки размеров. Кофейни и кафе.',
      en: 'Warm and light with size columns. Coffee shops and cafés.',
    },
    suits: ['coffee', 'cafe'],
  },
  neon: {
    name: 'Neon',
    description: {
      ru: 'Крупный гротеск и видео-фон. Бары и лаунжи.',
      en: 'Bold grotesque over video. Bars and lounges.',
    },
    suits: ['bar', 'hookah', 'cafe'],
  },
};
