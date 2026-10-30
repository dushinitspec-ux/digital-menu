import './fonts';
import './styles.css';
import {
  currencyBeforeAmount,
  currencySymbol,
  formatAmount,
  SNOW_TEMPLATES,
  type Badge,
  type CategoryView,
  type Currency,
  type ItemView,
  type Locale,
  type Orientation,
  type SceneView,
  type TemplateId,
} from '@dm/shared';
import { templateDecor } from './decor';
import { h } from './dom';

export { templateDecor } from './decor';

export interface RenderContext {
  currency: Currency;
  locale: Locale;
}

export interface RendererOptions {
  orientation?: Orientation;
  /** Подмена URL медиа, например на blob: из офлайн-кэша. */
  resolveUrl?: (url: string) => string;
}

export interface Renderer {
  show(scene: SceneView, ctx: RenderContext): Promise<void>;
  setOrientation(orientation: Orientation): void;
  /** Сколько страниц у текущей сцены и какая на экране — для превью и тестов. */
  state(): { sceneId: string | null; pages: number; page: number };
  destroy(): void;
}

const SIZE: Record<Orientation, { w: number; h: number }> = {
  landscape: { w: 1920, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

const DEFAULT_COLUMNS: Record<TemplateId, Record<Orientation, number>> = {
  noir: { landscape: 3, portrait: 1 },
  crema: { landscape: 3, portrait: 2 },
  neon: { landscape: 2, portrait: 1 },
  newyear: { landscape: 3, portrait: 1 },
  winter: { landscape: 3, portrait: 1 },
};

const LABELS: Record<Locale, Record<Badge | 'soldOut' | 'empty', string>> = {
  ru: { soldOut: 'Нет в наличии', new: 'Новинка', hit: 'Хит', vegan: 'Веган', spicy: 'Острое', promo: 'Акция', empty: 'Меню скоро появится' },
  en: { soldOut: 'Sold out', new: 'New', hit: 'Bestseller', vegan: 'Vegan', spicy: 'Spicy', promo: 'Offer', empty: 'Menu coming soon' },
  tr: { soldOut: 'Tükendi', new: 'Yeni', hit: 'Favori', vegan: 'Vegan', spicy: 'Acı', promo: 'Kampanya', empty: 'Menü yakında' },
};

function px(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function outerHeight(el: HTMLElement): number {
  const style = getComputedStyle(el);
  return el.offsetHeight + px(style.marginTop) + px(style.marginBottom);
}

function fontsReady(): Promise<unknown> {
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  return fonts ? Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
}

/**
 * Колонок по умолчанию. У снежных шаблонов фото крупные, и меню с фото на горизонтальном экране
 * читается лучше в две колонки, а на вертикальном шаблон и так даёт одну.
 */
function autoColumns(scene: SceneView, orientation: Orientation): number {
  const base = DEFAULT_COLUMNS[scene.template][orientation];
  const photos = scene.settings.showImages && scene.categories.some((c) => c.items.some((i) => i.image));
  return photos && SNOW_TEMPLATES.includes(scene.template) ? Math.min(base, 2) : base;
}

/** Меньше стольких строк категория в колонке не разрывается. */
const MIN_SPLIT = 3;

interface Segment {
  category: CategoryView;
  continued: boolean;
  items: ItemView[];
}
type Column = Segment[];
type Page = Column[];

export function createRenderer(container: HTMLElement, options: RendererOptions = {}): Renderer {
  let orientation: Orientation = options.orientation ?? 'landscape';
  const resolveUrl = options.resolveUrl ?? ((u: string) => u);
  const root = h('div', 'dm-root');
  const stage = h('div', 'dm-stage');
  root.appendChild(stage);
  container.appendChild(root);

  let current: {
    scene: SceneView;
    ctx: RenderContext;
    el: HTMLElement;
    prices: Record<string, string>;
    pages: HTMLElement[];
    page: number;
  } | null = null;
  let pageTimer: ReturnType<typeof setInterval> | null = null;
  let renderSeq = 0;

  function fit() {
    const { w, h: hh } = SIZE[orientation];
    stage.style.width = `${w}px`;
    stage.style.height = `${hh}px`;
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const s = Math.min(rect.width / w, rect.height / hh);
    stage.style.transform = `translate(${(rect.width - w * s) / 2}px, ${(rect.height - hh * s) / 2}px) scale(${s})`;
  }
  fit();
  window.addEventListener('resize', fit);
  const RO = (window as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = RO ? new RO(fit) : null;
  observer?.observe(root);

  const labels = (ctx: RenderContext) => LABELS[ctx.locale] ?? LABELS.en;

  function money(minor: number, ctx: RenderContext, plain: boolean): HTMLElement {
    const amount = formatAmount(minor, ctx.locale);
    const sym = currencySymbol(ctx.currency);
    const before = currencyBeforeAmount(ctx.currency, ctx.locale);
    if (plain) return h('span', 'dm-money', [before ? `${sym}${amount}` : `${amount} ${sym}`]);
    const amt = h('span', 'dm-amt', [amount]);
    const cur = h('span', 'dm-cur', [sym]);
    return before ? h('span', 'dm-money', [cur, amt]) : h('span', 'dm-money', [amt, cur]);
  }

  function priceKey(item: ItemView) {
    return JSON.stringify([item.price, item.variants, item.soldOut]);
  }

  function buildItem(item: ItemView, category: CategoryView, scene: SceneView, ctx: RenderContext, index: number, flash: boolean) {
    const s = scene.settings;
    const tobacco = category.compliance === 'tobacco';
    const L = labels(ctx);
    const showImage = !tobacco && s.showImages && item.image;
    const badges = tobacco ? [] : item.badges.map((b) => h('span', `dm-badge dm-badge--${b}`, [L[b]]));

    let price: HTMLElement | null = null;
    if (category.variantLabels.length > 0 && item.variants.length > 0) {
      price = h(
        'span',
        'dm-item-prices',
        category.variantLabels.map((label) => {
          const v = item.variants.find((x) => x.label === label);
          return h('span', 'dm-cell', [v ? money(v.price, ctx, tobacco) : '—']);
        }),
      );
    } else if (item.variants.length > 0) {
      price = h(
        'span',
        'dm-item-price dm-item-price--inline',
        item.variants.map((v) => h('span', 'dm-variant', [h('span', 'dm-variant-label', [v.label]), money(v.price, ctx, tobacco)])),
      );
    } else if (item.price !== null) {
      price = h('span', 'dm-item-price', [money(item.price, ctx, tobacco)]);
    }

    const details = [s.showDescriptions && !tobacco ? item.description : '', tobacco ? '' : item.portion].filter(Boolean).join(' · ');
    const el = h('div', `dm-item${item.soldOut ? ' is-soldout' : ''}${showImage ? ' has-img' : ''}${flash ? ' is-flash' : ''}`, [
      showImage ? imageEl(item.image!.thumbUrl ?? item.image!.url, 'dm-item-img') : null,
      h('div', 'dm-item-main', [
        h('div', 'dm-item-row', [h('span', 'dm-item-name', [item.name, ...badges]), h('span', 'dm-leader'), price]),
        s.showSecondaryNames && item.nameSecondary && !tobacco ? h('div', 'dm-item-sub', [item.nameSecondary]) : null,
        details ? h('div', 'dm-item-desc', [details]) : null,
        item.soldOut ? h('div', 'dm-soldout', [L.soldOut]) : null,
      ]),
    ]);
    el.style.setProperty('--d', `${Math.min(index * 45, 1400)}ms`);
    return el;
  }

  function imageEl(url: string, className: string) {
    const img = document.createElement('img');
    img.className = className;
    img.src = resolveUrl(url);
    img.alt = '';
    img.decoding = 'async';
    return img;
  }

  function buildCategoryHead(category: CategoryView, scene: SceneView, continued: boolean) {
    const tobacco = category.compliance === 'tobacco';
    return h('div', `dm-cat-head${continued ? ' is-cont' : ''}`, [
      h('span', 'dm-cat-name', [
        category.name,
        scene.settings.showSecondaryNames && category.nameSecondary && !tobacco ? h('span', 'dm-cat-sub', [category.nameSecondary]) : null,
      ]),
      category.variantLabels.length ? h('span', 'dm-cat-labels', category.variantLabels.map((l) => h('span', 'dm-cell', [l]))) : null,
    ]);
  }

  function segmentEl(category: CategoryView) {
    return h('div', `dm-cat${category.compliance === 'tobacco' ? ' dm-cat--tobacco' : ''}`);
  }

  function visibleItems(category: CategoryView, scene: SceneView) {
    // Табачный перечень показывает только то, что продаётся; остальные категории — по настройке сцены.
    const hide = scene.settings.soldOutMode === 'hide' || category.compliance === 'tobacco';
    return hide ? category.items.filter((i) => !i.soldOut) : category.items;
  }

  /** Раскладывает категории по колонкам и страницам, измеряя реальную высоту каждой строки. */
  function paginate(scene: SceneView, ctx: RenderContext, body: HTMLElement, columns: number, colWidth: number): Page[] {
    const height = body.clientHeight;
    const measurer = h('div', 'dm-col dm-measure');
    measurer.style.width = `${colWidth}px`;
    body.appendChild(measurer);

    const measures = new Map<string, { chrome: number; gap: number; head: number; items: number[] }>();
    for (const category of scene.categories) {
      const items = visibleItems(category, scene);
      if (items.length === 0) continue;
      const seg = segmentEl(category);
      measurer.appendChild(seg);
      const empty = seg.offsetHeight;
      const style = getComputedStyle(seg);
      const head = buildCategoryHead(category, scene, false);
      seg.appendChild(head);
      const itemEls = items.map((item, i) => {
        const el = buildItem(item, category, scene, ctx, i, false);
        seg.appendChild(el);
        return el;
      });
      measures.set(category.id, {
        chrome: empty,
        gap: px(style.marginBottom),
        head: outerHeight(head),
        items: itemEls.map(outerHeight),
      });
      measurer.removeChild(seg);
    }
    body.removeChild(measurer);

    /** split=false — категории не разрываются; если какая-то длиннее колонки, раскладка невозможна (null). */
    const pack = (limit: number, split = true): Page[] | null => {
      const pages: Page[] = [];
      let page: Page = [[]];
      let remaining = limit;
      const column = () => page[page.length - 1]!;
      const nextColumn = () => {
        if (page.length >= columns) {
          pages.push(page);
          page = [[]];
        } else {
          page.push([]);
        }
        remaining = limit;
      };

      for (const category of scene.categories) {
        const items = visibleItems(category, scene);
        const m = measures.get(category.id);
        if (!m || items.length === 0) continue;
        const whole = m.chrome + m.head + items.reduce((sum, _x, k) => sum + m.items[k]!, 0);
        if (!split && whole > limit) return null;
        // Небольшую категорию не разрываем: если целиком не влезает в остаток, переносим в новую колонку.
        if (column().length > 0 && m.gap + whole > remaining && whole <= limit) nextColumn();
        let i = 0;
        let continued = false;
        while (i < items.length) {
          const fresh = column().length === 0;
          const head = (fresh ? 0 : m.gap) + m.chrome + m.head;
          let used = head;
          let n = 0;
          while (i + n < items.length && (n === 0 || used + m.items[i + n]! <= remaining)) {
            used += m.items[i + n]!;
            n++;
          }
          const left = items.length - i - n;
          // Не оставляем в конце колонки огрызок категории из одной-двух строк — начинаем её в следующей.
          if (!fresh && (used > remaining || (left > 0 && n < MIN_SPLIT))) {
            nextColumn();
            continue;
          }
          // И не переносим в следующую колонку одну-две строки: отдаём туда ещё несколько.
          if (left > 0 && left < MIN_SPLIT && n - (MIN_SPLIT - left) >= MIN_SPLIT) {
            for (let k = 0; k < MIN_SPLIT - left; k++) used -= m.items[i + n - 1 - k]!;
            n -= MIN_SPLIT - left;
          }
          column().push({ category, continued, items: items.slice(i, i + n) });
          i += n;
          remaining -= used;
          continued = true;
          if (i < items.length) nextColumn();
        }
      }
      if (page.some((c) => c.length > 0)) pages.push(page);
      return pages;
    };

    const full = pack(height)!;
    if (full.length !== 1 || columns === 1) return full;
    // Всё помещается на один экран — выравниваем колонки по высоте, чтобы не оставалось пустых.
    // Сначала ищем раскладку без разрыва категорий, и только если её нет — с разрывами.
    const balance = (split: boolean): Page[] | null => {
      let lo = Math.floor(height / columns) - 1;
      let hi = height;
      let best: Page[] | null = null;
      const top = pack(hi, split);
      if (!top || top.length !== 1) return null;
      best = top;
      while (hi - lo > 8) {
        const mid = Math.floor((lo + hi) / 2);
        const attempt = pack(mid, split);
        if (attempt && attempt.length === 1) {
          best = attempt;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return best;
    };
    return balance(false) ?? balance(true) ?? full;
  }

  function buildScene(scene: SceneView, ctx: RenderContext, previous: typeof current) {
    const s = scene.settings;
    const sameScene = previous !== null && previous.scene.id === scene.id && previous.scene.template === scene.template;
    const snowy = SNOW_TEMPLATES.includes(scene.template) ? ' dm-snowy' : '';
    const el = h('div', `dm-scene dm-tpl-${scene.template}${snowy} dm-${orientation}${sameScene ? ' dm-quiet' : ' dm-enter'}`);
    if (s.accentColor) el.style.setProperty('--accent', s.accentColor);

    const bgUrl = scene.background?.url ?? null;
    const prevBg = sameScene ? (previous!.el.querySelector('.dm-bg') as HTMLElement | null) : null;
    if (bgUrl && prevBg && prevBg.getAttribute('data-src') === bgUrl) {
      el.appendChild(prevBg);
    } else if (bgUrl && scene.background) {
      const bg = h('div', 'dm-bg');
      bg.setAttribute('data-src', bgUrl);
      if (scene.background.kind === 'video') {
        const video = document.createElement('video');
        video.src = resolveUrl(bgUrl);
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('crossorigin', 'anonymous');
        bg.appendChild(video);
        void video.play?.()?.catch?.(() => {});
      } else {
        bg.appendChild(imageEl(bgUrl, 'dm-bg-img'));
      }
      el.appendChild(bg);
    }
    if (bgUrl) {
      const dim = h('div', 'dm-bg-dim');
      dim.style.opacity = String(s.backgroundDim);
      el.appendChild(dim);
    } else {
      el.appendChild(h('div', 'dm-deco'));
    }
    // Сезонное оформление (снег, гирлянда, сосульки) рисуется и поверх фото-фона — без него шаблон теряет смысл.
    // При обновлении цен той же сцены переносим его целиком, чтобы снегопад не начинался заново.
    const prevDecor = sameScene ? Array.prototype.slice.call(previous!.el.querySelectorAll('[data-decor]')) as HTMLElement[] : [];
    for (const d of prevDecor.length ? prevDecor : templateDecor(scene.template, SIZE[orientation])) el.appendChild(d);

    const head = s.title || s.subtitle
      ? h('div', 'dm-head', [
          s.title ? h('div', 'dm-title', [s.title]) : null,
          h('div', 'dm-rule'),
          s.subtitle ? h('div', 'dm-subtitle', [s.subtitle]) : null,
        ])
      : null;
    const body = h('div', 'dm-body');
    const dots = h('div', 'dm-dots');
    const foot = h('div', 'dm-foot', [h('div', 'dm-note', [s.footerNote]), dots]);
    if (head) el.appendChild(head);
    el.appendChild(body);
    el.appendChild(foot);
    return { el, body, dots, sameScene };
  }

  async function show(scene: SceneView, ctx: RenderContext) {
    const seq = ++renderSeq;
    await fontsReady();
    if (seq !== renderSeq) return;
    fit();
    const previous = current;
    const { el, body, dots, sameScene } = buildScene(scene, ctx, previous);
    el.style.visibility = 'hidden';
    stage.appendChild(el);

    const columns = Math.max(1, scene.settings.columns ?? autoColumns(scene, orientation));
    const gap = px(getComputedStyle(el).getPropertyValue('--col-gap')) || 64;
    const colWidth = Math.floor((body.clientWidth - gap * (columns - 1)) / columns);
    const pages = paginate(scene, ctx, body, columns, colWidth);

    const prices: Record<string, string> = {};
    const pageEls: HTMLElement[] = [];
    let index = 0;
    for (const page of pages) {
      const pageEl = h('div', 'dm-page');
      for (const col of page) {
        const colEl = h('div', 'dm-col');
        colEl.style.width = `${colWidth}px`;
        for (const seg of col) {
          const segEl = segmentEl(seg.category);
          segEl.appendChild(buildCategoryHead(seg.category, scene, seg.continued));
          for (const item of seg.items) {
            const key = priceKey(item);
            prices[item.id] = key;
            const flash = sameScene && previous!.prices[item.id] !== undefined && previous!.prices[item.id] !== key;
            segEl.appendChild(buildItem(item, seg.category, scene, ctx, index++, flash));
          }
          colEl.appendChild(segEl);
        }
        pageEl.appendChild(colEl);
      }
      body.appendChild(pageEl);
      pageEls.push(pageEl);
    }
    if (pageEls.length === 0) {
      body.appendChild(h('div', 'dm-empty', [labels(ctx).empty]));
    }

    const startPage = sameScene ? Math.min(previous!.page, Math.max(0, pageEls.length - 1)) : 0;
    if (pageEls.length > 1) {
      for (let i = 0; i < pageEls.length; i++) dots.appendChild(h('span', 'dm-dot'));
    }
    current = { scene, ctx, el, prices, pages: pageEls, page: startPage };
    setPage(startPage);
    el.style.visibility = '';

    if (previous) {
      const old = previous.el;
      old.classList.add('dm-leave');
      setTimeout(() => old.parentNode?.removeChild(old), sameScene ? 350 : 900);
    }
    // Двойной кадр: браузер сначала рисует сцену прозрачной, затем запускает переход.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-shown')));

    if (pageTimer) clearInterval(pageTimer);
    pageTimer = null;
    if (pageEls.length > 1) {
      pageTimer = setInterval(() => {
        if (current) setPage((current.page + 1) % current.pages.length);
      }, scene.settings.pageDurationSec * 1000);
    }
  }

  function setPage(page: number) {
    if (!current) return;
    current.page = page;
    current.pages.forEach((p, i) => p.classList.toggle('is-active', i === page));
    const dots = current.el.querySelectorAll('.dm-dot');
    for (let i = 0; i < dots.length; i++) dots[i]!.classList.toggle('is-active', i === page);
  }

  return {
    show,
    setOrientation(next) {
      if (next === orientation) return;
      orientation = next;
      fit();
      if (current) {
        const { scene, ctx } = current;
        current = null;
        stage.innerHTML = '';
        void show(scene, ctx);
      }
    },
    state() {
      return { sceneId: current?.scene.id ?? null, pages: current?.pages.length ?? 0, page: current?.page ?? 0 };
    },
    destroy() {
      renderSeq++;
      if (pageTimer) clearInterval(pageTimer);
      window.removeEventListener('resize', fit);
      observer?.disconnect();
      root.parentNode?.removeChild(root);
    },
  };
}
