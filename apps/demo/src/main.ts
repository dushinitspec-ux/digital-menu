import { createRenderer } from '@dm/renderer';
import { DEFAULT_SCENE_SETTINGS, formatAmount, parsePrice, TEMPLATE_INFO, TEMPLATE_IDS, type SceneView, type TemplateId } from '@dm/shared';
import { loadMenu, MARKET, type Business, type DemoMenu, type Market } from './data';
import './demo.css';

const BUSINESSES: { id: Business; label: string }[] = [
  { id: 'coffee', label: 'Кофейня' },
  { id: 'bar', label: 'Бар' },
  { id: 'hookah', label: 'Кальянная' },
];
const LOCAL_COMMAND = 'docker compose -f docker-compose.local.yml up --build';

const state = {
  market: 'ru' as Market,
  business: 'coffee' as Business,
  template: 'crema' as TemplateId,
  scene: 0,
  portrait: false,
  menu: loadMenu('ru', 'coffee') as DemoMenu,
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

document.getElementById('app')!.innerHTML = `
  <header class="top">
    <div class="brand"><span class="mark" aria-hidden="true"></span><span class="brand-name">Digital Menu</span></div>
    <p class="lede">Меняйте цены и стоп-лист справа — экран слева обновляется сразу, как телевизор в зале.</p>
    <div class="seg" role="group" aria-label="Рынок" id="market">
      <button type="button" data-v="ru">Россия · ₽</button><button type="button" data-v="eu">Europe · €</button>
    </div>
  </header>
  <main class="layout">
    <section class="stage" aria-label="Экран телевизора">
      <div class="tv" id="tv-frame"><div class="tv-screen" id="tv"></div></div>
      <div class="stand" aria-hidden="true"></div>
      <div class="stage-bar">
        <span class="hint" id="scene-hint"></span>
        <button type="button" class="ghost" id="fullscreen">На весь экран</button>
      </div>
    </section>
    <aside class="panel">
      <div class="block">
        <h2>Заведение</h2>
        <div class="seg seg-wide" role="group" aria-label="Заведение" id="business"></div>
      </div>
      <div class="block">
        <h2>Шаблон</h2>
        <div class="tpls" role="group" aria-label="Шаблон" id="templates"></div>
      </div>
      <div class="block" id="scene-block">
        <h2>Время суток</h2>
        <p class="note">В сервисе сцены меняются по расписанию сами. Здесь — вручную.</p>
        <div class="seg seg-wide" role="group" aria-label="Сцена" id="scenes"></div>
      </div>
      <div class="block">
        <h2>Ориентация экрана</h2>
        <div class="seg seg-wide" role="group" aria-label="Ориентация" id="orientation">
          <button type="button" data-v="landscape">Горизонтально</button><button type="button" data-v="portrait">Вертикально</button>
        </div>
      </div>
      <div class="block">
        <h2>Меню</h2>
        <p class="note">Цена применяется после ввода. Переключатель — стоп-лист.</p>
        <div id="menu"></div>
      </div>
      <div class="block full">
        <h2>Полная версия на ноутбуке</h2>
        <p class="note">Панель владельца, подключение ТВ по коду, офлайн-режим. Нужен Docker Desktop; в папке проекта выполните:</p>
        <div class="cmd"><code id="cmd">${LOCAL_COMMAND}</code><button type="button" class="ghost" id="copy">Копировать</button></div>
        <p class="note">Затем откройте <b>localhost:3000/admin</b> — панель, и <b>localhost:3000/player</b> — экран.</p>
      </div>
    </aside>
  </main>`;

const tv = $('#tv');
const renderer = createRenderer(tv, { orientation: 'landscape' });

function sceneView(): SceneView {
  const def = state.menu.scenes[state.scene] ?? state.menu.scenes[0]!;
  const collator = new Intl.Collator(MARKET[state.market].locale);
  const categories = def.categories.map((i) => {
    const c = state.menu.categories[i]!;
    const items = c.compliance === 'tobacco' ? [...c.items].sort((a, b) => collator.compare(a.name, b.name)) : c.items;
    return { ...c, items: items.map((it) => ({ ...it })) };
  });
  return {
    id: `${state.market}-${state.business}-${state.scene}`,
    name: def.name,
    template: state.template,
    settings: { ...DEFAULT_SCENE_SETTINGS, title: def.title, subtitle: def.subtitle, categoryIds: categories.map((c) => c.id) },
    background: null,
    categories,
  };
}

function draw() {
  void renderer.show(sceneView(), MARKET[state.market]);
  const def = state.menu.scenes[state.scene]!;
  $('#scene-hint').textContent = `Сцена «${def.name}» · ${TEMPLATE_INFO[state.template].name}`;
}

function setSeg(id: string, value: string) {
  document.querySelectorAll<HTMLButtonElement>(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === value)));
}

function money(minor: number) {
  return formatAmount(minor, MARKET[state.market].locale);
}

function renderControls() {
  setSeg('market', state.market);
  setSeg('orientation', state.portrait ? 'portrait' : 'landscape');

  $('#business').innerHTML = BUSINESSES.map((b) => `<button type="button" data-v="${b.id}">${b.label}</button>`).join('');
  setSeg('business', state.business);

  $('#templates').innerHTML = TEMPLATE_IDS.map(
    (t) => `<button type="button" class="tpl tpl-${t}" data-v="${t}"><span class="tpl-name">${TEMPLATE_INFO[t].name}</span><span class="tpl-desc">${TEMPLATE_INFO[t].description.ru}</span></button>`,
  ).join('');
  setSeg('templates', state.template);

  const scenes = state.menu.scenes;
  $('#scene-block').hidden = scenes.length < 2;
  $('#scenes').innerHTML = scenes.map((s, i) => `<button type="button" data-v="${i}">${s.name}</button>`).join('');
  setSeg('scenes', String(state.scene));

  const sym = MARKET[state.market].currency === 'RUB' ? '₽' : '€';
  $('#menu').innerHTML = state.menu.categories
    .map(
      (c) => `
      <div class="cat">
        <h3>${c.name}${c.compliance === 'tobacco' ? ' <span class="tag" title="Перечень по 15-ФЗ: одинаковый шрифт, чёрное на белом, по алфавиту, без картинок">15-ФЗ</span>' : ''}</h3>
        ${c.items
          .map((it) => {
            const prices = it.variants.length
              ? it.variants
                  .map(
                    (v, vi) =>
                      `<label class="price"><span>${v.label}</span><input id="p-${it.id}-${vi}" inputmode="decimal" value="${money(v.price)}" data-item="${it.id}" data-variant="${vi}" aria-label="${it.name} ${v.label}, ${sym}"></label>`,
                  )
                  .join('')
              : `<label class="price"><span>${sym}</span><input id="p-${it.id}" inputmode="decimal" value="${money(it.price ?? 0)}" data-item="${it.id}" aria-label="${it.name}, ${sym}"></label>`;
            return `<div class="row${it.soldOut ? ' is-off' : ''}">
              <span class="name">${it.name}</span>
              <span class="prices">${prices}</span>
              <button type="button" role="switch" class="switch" aria-checked="${!it.soldOut}" aria-label="${it.name}: в наличии" data-stop="${it.id}"><span></span></button>
            </div>`;
          })
          .join('')}
      </div>`,
    )
    .join('');
}

function findItem(id: string) {
  for (const c of state.menu.categories) for (const it of c.items) if (it.id === id) return it;
  return null;
}

function reset(market: Market, business: Business) {
  state.market = market;
  state.business = business;
  state.menu = loadMenu(market, business);
  state.template = state.menu.template;
  state.scene = 0;
  renderControls();
  draw();
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const group = btn.parentElement?.id;
  const v = btn.dataset.v;
  if (group === 'market' && v) reset(v as Market, state.business);
  else if (group === 'business' && v) reset(state.market, v as Business);
  else if (group === 'templates' && v) {
    state.template = v as TemplateId;
    setSeg('templates', v);
    draw();
  } else if (group === 'scenes' && v) {
    state.scene = Number(v);
    setSeg('scenes', v);
    draw();
  } else if (group === 'orientation' && v) {
    state.portrait = v === 'portrait';
    setSeg('orientation', v);
    $('#tv-frame').classList.toggle('is-portrait', state.portrait);
    renderer.setOrientation(state.portrait ? 'portrait' : 'landscape');
    draw();
  } else if (btn.dataset.stop) {
    const it = findItem(btn.dataset.stop);
    if (!it) return;
    it.soldOut = !it.soldOut;
    btn.setAttribute('aria-checked', String(!it.soldOut));
    btn.closest('.row')?.classList.toggle('is-off', it.soldOut);
    draw();
  } else if (btn.id === 'fullscreen') {
    void $('#tv-frame').requestFullscreen?.().catch(() => {});
  } else if (btn.id === 'copy') {
    const done = () => (btn.textContent = 'Скопировано');
    navigator.clipboard?.writeText(LOCAL_COMMAND).then(done, () => {
      const range = document.createRange();
      range.selectNodeContents($('#cmd'));
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
  }
});

/** Цена применяется по Enter или при уходе из поля — как в панели сервиса. */
function applyPrice(input: HTMLInputElement) {
  const it = findItem(input.dataset.item ?? '');
  if (!it) return;
  const value = parsePrice(input.value);
  const current = input.dataset.variant !== undefined ? it.variants[Number(input.dataset.variant)]!.price : (it.price ?? 0);
  if (value === null) {
    input.value = money(current);
    input.classList.add('is-bad');
    setTimeout(() => input.classList.remove('is-bad'), 900);
    return;
  }
  if (value === current) return;
  if (input.dataset.variant !== undefined) it.variants[Number(input.dataset.variant)]!.price = value;
  else it.price = value;
  input.value = money(value);
  draw();
}
document.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.dataset.item) applyPrice(input);
});
document.addEventListener('keydown', (e) => {
  const input = e.target as HTMLInputElement;
  if (e.key === 'Enter' && input.dataset?.item) input.blur();
});

renderControls();
draw();
