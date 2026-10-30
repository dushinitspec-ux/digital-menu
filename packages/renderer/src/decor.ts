import type { TemplateId } from '@dm/shared';
import { h } from './dom';

// Оформление шаблонов, которое нельзя описать одним CSS: снегопад и гирлянда новогоднего шаблона.
// Всё анимируется только через transform и opacity — это тянут и слабые ТВ-приставки.

interface Size {
  w: number;
  h: number;
}

/** Детерминированный ГПСЧ: у каждого экрана одинаковый «узор» снега, без мерцания между перерисовками. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

interface SnowLayer {
  name: string;
  tile: number;
  flakes: number;
  radius: [number, number];
  alpha: [number, number];
  fallSec: number;
  swaySec: number;
}

const SNOW: SnowLayer[] = [
  { name: 'far', tile: 300, flakes: 14, radius: [1, 1.9], alpha: [0.3, 0.55], fallSec: 22, swaySec: 9 },
  { name: 'mid', tile: 420, flakes: 10, radius: [2, 3.2], alpha: [0.5, 0.8], fallSec: 15, swaySec: 7 },
  { name: 'near', tile: 620, flakes: 6, radius: [3.6, 5.4], alpha: [0.65, 0.9], fallSec: 10, swaySec: 5 },
];

/**
 * Снег — три слоя с повторяющимся фоном из точек. Слой выше экрана на одну плитку и сдвигается вниз
 * ровно на её высоту, поэтому цикл бесшовный, а браузер растеризует слой один раз.
 */
function snow(): HTMLElement {
  const rand = random(20261231);
  const wrap = h('div', 'dm-snow');
  for (const layer of SNOW) {
    const dots: string[] = [];
    for (let i = 0; i < layer.flakes; i++) {
      const x = r1(rand() * layer.tile);
      const y = r1(rand() * layer.tile);
      const r = r1(layer.radius[0] + rand() * (layer.radius[1] - layer.radius[0]));
      const a = (layer.alpha[0] + rand() * (layer.alpha[1] - layer.alpha[0])).toFixed(2);
      dots.push(`radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,${a}) 0, rgba(255,255,255,${a}) ${r1(r * 0.55)}px, rgba(255,255,255,0) ${r}px)`);
    }
    const fall = h('div', `dm-snow-fall dm-snow--${layer.name}`);
    fall.style.top = `-${layer.tile}px`;
    fall.style.height = `calc(100% + ${layer.tile}px)`;
    fall.style.backgroundImage = dots.join(',');
    fall.style.backgroundSize = `${layer.tile}px ${layer.tile}px`;
    fall.style.setProperty('--tile', `${layer.tile}px`);
    fall.style.animationDuration = `${layer.fallSec}s`;
    const sway = h('div', 'dm-snow-sway', [fall]);
    sway.style.animationDuration = `${layer.swaySec}s`;
    wrap.appendChild(sway);
  }
  return wrap;
}

const BULB_COLORS = 4;

/** Гирлянда: провод провисает дугами, лампочки висят по нормали к проводу и мерцают вразнобой. */
function garland(size: Size): HTMLElement {
  const rand = random(1231);
  const swags = Math.max(2, Math.round(size.w / 480));
  const span = size.w / swags;
  const top = 6;
  const sag = 46;
  const yAt = (x: number) => {
    const local = (x % span) / span; // 0…1 внутри дуги
    return top + sag * 4 * local * (1 - local);
  };
  const slopeAt = (x: number) => {
    const local = (x % span) / span;
    return (sag * 4 * (1 - 2 * local)) / span;
  };

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'dm-garland-wire');
  svg.setAttribute('width', String(size.w));
  svg.setAttribute('height', '80');
  svg.setAttribute('viewBox', `0 0 ${size.w} 80`);
  let d = `M0 ${top}`;
  for (let i = 0; i < swags; i++) {
    const x0 = i * span;
    // Квадратичная кривая Безье с контрольной точкой на глубине 2·sag даёт ту же параболу.
    d += ` Q${r1(x0 + span / 2)} ${top + sag * 2} ${r1(x0 + span)} ${top}`;
  }
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);

  const el = h('div', 'dm-garland');
  el.appendChild(svg);
  const step = span / Math.max(5, Math.round(span / 82));
  let n = 0;
  for (let x = step / 2; x < size.w; x += step) {
    const bulb = h('span', `dm-bulb dm-bulb--c${n % BULB_COLORS}`);
    const angle = (Math.atan(slopeAt(x)) * 180) / Math.PI;
    bulb.style.left = `${r1(x - 7)}px`;
    bulb.style.top = `${r1(yAt(x) - 2)}px`;
    bulb.style.transform = `rotate(${r1(angle)}deg)`;
    bulb.style.animationDuration = `${r1(1.4 + rand() * 1.6)}s`;
    bulb.style.animationDelay = `-${r1(rand() * 3)}s`;
    el.appendChild(bulb);
    n++;
  }
  return el;
}

/** Ёлочные шары по углам: качаются на нитке, не заходя в поле меню. */
function baubles(size: Size): HTMLElement[] {
  const spec = [
    { x: 46, len: 118, cls: 'dm-bauble--red', sec: 6.5 },
    { x: size.w - 46, len: 168, cls: 'dm-bauble--gold', sec: 7.5 },
  ];
  return spec.map((b) => {
    const el = h('div', `dm-bauble ${b.cls}`, [h('span', 'dm-bauble-ball')]);
    el.style.left = `${b.x}px`;
    el.style.height = `${b.len}px`;
    el.style.animationDuration = `${b.sec}s`;
    return el;
  });
}

/** Звёздочки-блёстки за меню. */
function sparkles(size: Size): HTMLElement {
  const rand = random(2027);
  const wrap = h('div', 'dm-sparkles');
  for (let i = 0; i < 16; i++) {
    const s = h('span', 'dm-sparkle');
    const scale = 0.5 + rand() * 0.8;
    s.style.left = `${Math.round(rand() * (size.w - 40))}px`;
    s.style.top = `${Math.round(120 + rand() * (size.h - 180))}px`;
    s.style.width = s.style.height = `${Math.round(26 * scale)}px`;
    s.style.animationDuration = `${r1(2.6 + rand() * 3)}s`;
    s.style.animationDelay = `-${r1(rand() * 5)}s`;
    wrap.appendChild(s);
  }
  return wrap;
}

export function templateDecor(template: TemplateId, size: Size): HTMLElement[] {
  if (template !== 'newyear') return [];
  const parts = [sparkles(size), snow(), garland(size), ...baubles(size)];
  for (const p of parts) p.setAttribute('data-decor', '');
  return parts;
}
