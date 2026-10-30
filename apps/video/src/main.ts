import { createRenderer } from '@dm/renderer';
import { menuFileScenes, menuFileSchema, menuFileShowcase, type Orientation } from '@dm/shared';
import { createShowcase } from './showcase';

// Протокол со скриптом render.mjs:
//   window.__DM_INPUT__   — меню и задание; скрипт кладёт их до загрузки страницы;
//   window.__DM_PLAN__    — какие ролики можно снять из этого меню (страница без задания);
//   window.__DM_READY__   — длительность ролика в мс, как только первый кадр готов;
//   window.__DM_TICK__(t) — ставит все CSS-анимации на момент t мс. Таймеры страницы скрипт двигает
//                           подменными часами Playwright, поэтому кадры не зависят от скорости машины.

interface Input {
  menu: unknown;
  job: string | null;
  /** key точки, чьи цены показать; null — общие цены. */
  location: string | null;
  orientation: Orientation;
  assetBase: string;
}

export interface Job {
  id: string;
  title: string;
}

declare global {
  interface Window {
    __DM_INPUT__?: Input;
    __DM_PLAN__?: { jobs: Job[] } | { error: string };
    __DM_READY__?: number;
    __DM_TICK__?: (t: number) => void;
  }
}

/** Все начертания, которые используют шаблоны, с турецкими и кириллическими буквами — чтобы вёрстка мерилась уже по ним. */
const FONTS = [
  '400 20px Manrope',
  '600 20px Manrope',
  '800 20px Manrope',
  '500 20px "Playfair Display"',
  'italic 500 20px "Playfair Display"',
  '700 20px "Playfair Display"',
  '500 20px "Cormorant Garamond"',
  'italic 500 20px "Cormorant Garamond"',
  '600 20px "Cormorant Garamond"',
  '500 20px Unbounded',
  '800 20px Unbounded',
];
const FONT_SAMPLE = 'AaZz ĞğÜüŞşİıÖöÇç ÄäÉé ЖжЁё 0123456789 ₺€₽';

const births = new WeakMap<Animation, number>();
window.__DM_TICK__ = (t: number) => {
  for (const a of document.getAnimations()) {
    let born = births.get(a);
    if (born === undefined) {
      born = t;
      births.set(a, t);
    }
    a.pause();
    a.currentTime = t - born;
  }
};

/** Одностраничную сцену держим подольше, чтобы ролик не мелькал при зацикливании. */
const SINGLE_PAGE_MS = 15_000;

async function main() {
  const input = window.__DM_INPUT__;
  if (!input) throw new Error('No input');
  const parsed = menuFileSchema.safeParse(input.menu);
  if (!parsed.success) {
    window.__DM_PLAN__ = { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') };
    return;
  }
  const menu = parsed.data;
  const resolveImage = (p: string) => `${input.assetBase}${p.split('/').map(encodeURIComponent).join('/')}`;
  const location = input.location ?? undefined;
  if (location && !menu.locations.some((l) => l.key === location)) {
    window.__DM_PLAN__ = { error: `Unknown location "${location}"` };
    return;
  }
  const scenes = menuFileScenes(menu, resolveImage, location);
  const slides = menuFileShowcase(menu, resolveImage, location);
  const ctx = { currency: menu.org.currency, locale: menu.org.locale };

  if (input.job === null) {
    const jobs: Job[] = scenes.map((s) => ({ id: `scene-${s.id}`, title: s.name }));
    if (slides.length) jobs.push({ id: 'showcase', title: 'Showcase' });
    window.__DM_PLAN__ = { jobs };
    return;
  }

  await Promise.all(FONTS.map((f) => document.fonts.load(f, FONT_SAMPLE)));
  const app = document.getElementById('app')!;

  if (input.job === 'showcase') {
    const show = createShowcase(app, slides, {
      template: menu.showcase.template ?? 'winter',
      orientation: input.orientation,
      ...ctx,
      orgName: menu.org.name,
      kicker: menu.showcase.kicker,
      closingTitle: menu.showcase.closingTitle,
      closingSubtitle: menu.showcase.closingSubtitle,
      slideSec: menu.showcase.slideSec ?? 6,
    });
    window.__DM_READY__ = show.durationMs;
    return;
  }

  const scene = scenes.find((s) => `scene-${s.id}` === input.job);
  if (!scene) throw new Error(`Unknown job ${input.job}`);
  const renderer = createRenderer(app, { orientation: input.orientation });
  await renderer.show(scene, ctx);
  const { pages } = renderer.state();
  // Ролик кончается ровно там, где рендерер вернулся бы к первой странице, — на ТВ он зацикливается.
  window.__DM_READY__ = pages > 1 ? pages * scene.settings.pageDurationSec * 1000 : Math.max(SINGLE_PAGE_MS, scene.settings.pageDurationSec * 1000);
}

main().catch((err: unknown) => {
  window.__DM_PLAN__ = { error: err instanceof Error ? err.message : String(err) };
});
