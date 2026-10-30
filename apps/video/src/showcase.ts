import { templateDecor } from '@dm/renderer';
import { formatPrice, type Currency, type Locale, type Orientation, type ShowcaseSlide } from '@dm/shared';
import './showcase.css';

// Промо-ролик: по слайду на позицию (крупно название, описание, цена) и финальное поздравление.
// Оформление — новогоднего шаблона (newyear или winter): тот же снег, гирлянда и палитра, что и на экранах меню.

export interface ShowcaseOptions {
  template: 'newyear' | 'winter';
  orientation: Orientation;
  currency: Currency;
  locale: Locale;
  orgName: string;
  kicker?: string;
  closingTitle?: string;
  closingSubtitle?: string;
  slideSec: number;
}

const DEFAULTS: Record<Locale, { kicker: string; closing: string }> = {
  tr: { kicker: 'Yılbaşına özel', closing: 'Mutlu Yıllar' },
  en: { kicker: 'New Year special', closing: 'Happy New Year' },
  ru: { kicker: 'Новогоднее предложение', closing: 'С Новым годом' },
};

const SIZE: Record<Orientation, { w: number; h: number }> = {
  landscape: { w: 1920, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Новый год, к которому готовится меню: с сентября — следующий. */
function comingYear(now = new Date()): number {
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
}

function priceLine(slide: ShowcaseSlide, o: ShowcaseOptions): HTMLElement {
  const box = el('div', 'sc-price');
  const { item } = slide;
  if (item.variants.length) {
    for (const v of item.variants) {
      const chip = el('span', 'sc-chip');
      chip.appendChild(el('span', 'sc-chip-label', v.label));
      chip.appendChild(el('span', 'sc-chip-amt', formatPrice(v.price, o.currency, o.locale)));
      box.appendChild(chip);
    }
  } else if (item.price !== null) {
    box.appendChild(el('span', 'sc-amt', formatPrice(item.price, o.currency, o.locale)));
  }
  return box;
}

function itemSlide(slide: ShowcaseSlide, o: ShowcaseOptions, kicker: string): HTMLElement {
  const { item } = slide;
  const root = el('div', `sc-slide${item.image ? ' has-img' : ''}`);
  const visual = el('div', 'sc-visual');
  if (item.image) {
    const img = document.createElement('img');
    img.className = 'sc-img';
    img.src = item.image.url;
    img.alt = '';
    visual.appendChild(img);
  } else {
    visual.appendChild(el('div', 'sc-flake'));
  }
  root.appendChild(visual);

  const text = el('div', 'sc-text');
  text.appendChild(el('div', 'sc-kicker', kicker));
  const name = el('div', 'sc-name', item.name);
  if (item.name.length > 26) name.classList.add('is-xlong');
  else if (item.name.length > 16) name.classList.add('is-long');
  text.appendChild(name);
  if (item.nameSecondary) text.appendChild(el('div', 'sc-sub', item.nameSecondary));
  const details = [item.description, item.portion].filter(Boolean).join(' · ');
  if (details) text.appendChild(el('div', 'sc-desc', details));
  text.appendChild(priceLine(slide, o));
  root.appendChild(text);
  return root;
}

function closingSlide(o: ShowcaseOptions): HTMLElement {
  const root = el('div', 'sc-slide sc-closing');
  root.appendChild(el('div', 'sc-closing-title', o.closingTitle || DEFAULTS[o.locale].closing));
  const year = el('div', 'sc-year');
  String(comingYear()).split('').forEach((d, i) => {
    const digit = el('span', 'sc-digit', d);
    digit.style.animationDelay = `${0.5 + i * 0.16}s`;
    year.appendChild(digit);
  });
  root.appendChild(year);
  root.appendChild(el('div', 'sc-closing-sub', o.closingSubtitle || o.orgName));
  return root;
}

export function createShowcase(container: HTMLElement, slides: ShowcaseSlide[], o: ShowcaseOptions): { durationMs: number } {
  const size = SIZE[o.orientation];
  const scene = el('div', `dm-scene dm-tpl-${o.template} dm-festive dm-${o.orientation} is-shown sc-root`);
  scene.style.width = `${size.w}px`;
  scene.style.height = `${size.h}px`;
  scene.appendChild(el('div', 'dm-deco'));
  for (const d of templateDecor(o.template, size)) scene.appendChild(d);

  const kicker = o.kicker || DEFAULTS[o.locale].kicker;
  const stage = el('div', 'sc-stage');
  const all = [...slides.map((s) => itemSlide(s, o, kicker)), closingSlide(o)];
  for (const s of all) stage.appendChild(s);
  scene.appendChild(stage);

  const bar = el('div', 'sc-progress');
  const fill = el('span', 'sc-progress-fill');
  bar.appendChild(fill);
  scene.appendChild(bar);
  container.appendChild(scene);

  const slideMs = o.slideSec * 1000;
  const show = (i: number) => {
    all.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      s.classList.toggle('is-leaving', k === i - 1);
    });
    // Перезапуск полосы прогресса: новый элемент — новая анимация.
    const next = fill.cloneNode() as HTMLElement;
    next.style.animationDuration = `${o.slideSec}s`;
    bar.replaceChild(next, bar.firstChild!);
    if (i + 1 < all.length) setTimeout(() => show(i + 1), slideMs);
  };
  requestAnimationFrame(() => show(0));
  return { durationMs: all.length * slideMs };
}
