import { createRenderer, type Renderer } from '@dm/renderer';
import { resolveSceneId, type PlayerManifest } from '@dm/shared';
import { DEMO_LOGIN, type MockApi } from './mock-api';
import './tv.css';

/**
 * «Телевизор в зале» в углу страницы. Ведёт себя как настоящий плеер: показывает код
 * сопряжения, пока экран не добавлен в панели, получает события об изменениях,
 * сам выбирает сцену по расписанию и шлёт пульс.
 */
export function mountTv(api: MockApi) {
  const root = document.createElement('section');
  root.className = 'stv';
  root.setAttribute('aria-label', 'Телевизор в зале');
  root.innerHTML = `
    <header class="stv-head">
      <span class="stv-dot" aria-hidden="true"></span>
      <span class="stv-title" id="stv-title">Телевизор в зале</span>
      <button type="button" class="stv-btn" data-act="size" aria-label="Увеличить или уменьшить">⤢</button>
      <button type="button" class="stv-btn" data-act="full" aria-label="На весь экран">⛶</button>
      <button type="button" class="stv-btn" data-act="hide" aria-label="Свернуть">—</button>
    </header>
    <div class="stv-frame"><div class="stv-screen" id="stv-screen"></div></div>
    <footer class="stv-foot">
      <span>Демо в браузере. Вход: <b>${DEMO_LOGIN.email}</b> / <b>${DEMO_LOGIN.password}</b></span>
      <button type="button" class="stv-link" data-act="reset">Начать заново</button>
    </footer>
    <button type="button" class="stv-pill" data-act="show">Показать телевизор</button>`;
  document.body.appendChild(root);
  document.body.classList.add('has-tv');

  const screenEl = root.querySelector<HTMLElement>('#stv-screen')!;
  const title = root.querySelector<HTMLElement>('#stv-title')!;
  let renderer: Renderer | null = null;
  let shownKey = '';
  let sceneId: string | null = null;
  let manifest: PlayerManifest | null = null;
  let pairingTimer: ReturnType<typeof setInterval> | null = null;

  function setPairing(code: string) {
    renderer?.destroy();
    renderer = null;
    shownKey = '';
    root.classList.remove('is-online');
    title.textContent = 'Новый экран · ждёт подключения';
    screenEl.innerHTML = `
      <div class="stv-pair">
        <div class="stv-pair-kicker">Подключение экрана</div>
        <div class="stv-pair-code">${code.slice(0, 3)} ${code.slice(3)}</div>
        <div class="stv-pair-text">В панели: <b>Экраны → Добавить экран</b> и введите этот код</div>
      </div>`;
  }

  function startPairing() {
    const pairing = api.createPairing(api.db.tvToken);
    setPairing(pairing.code);
    if (pairingTimer) clearInterval(pairingTimer);
    pairingTimer = setInterval(() => {
      if (api.screenByToken(api.db.tvToken)) {
        clearInterval(pairingTimer!);
        pairingTimer = null;
        refresh();
      }
    }, 700);
  }

  function tick() {
    const m = manifest;
    if (!m) return;
    if (!renderer) {
      screenEl.innerHTML = '';
      renderer = createRenderer(screenEl, { orientation: m.screen.orientation });
    }
    renderer.setOrientation(m.screen.orientation);
    root.classList.toggle('is-portrait', m.screen.orientation === 'portrait');
    let id = resolveSceneId(m.schedule, new Date(), m.location.timezone);
    if (!id || !m.scenes[id]) id = m.schedule.defaultSceneId;
    const scene = id ? m.scenes[id] : undefined;
    const key = `${m.version}:${id}`;
    if (key === shownKey || !scene) return;
    shownKey = key;
    sceneId = id;
    title.textContent = `${m.screen.name} · ${m.location.name} · сцена «${scene.name}»`;
    void renderer.show(scene, { currency: m.org.currency, locale: m.org.locale });
  }

  function refresh() {
    manifest = api.manifest(api.db.tvToken);
    if (!manifest) return startPairing();
    root.classList.add('is-online');
    api.heartbeat(api.db.tvToken, sceneId);
    tick();
  }

  api.subscribe((event) => {
    if (event.type === 'manifest') refresh();
    const mine = manifest?.screen.id;
    if (event.type === 'reload' && event.screenId === mine) {
      renderer?.destroy();
      renderer = null;
      shownKey = '';
      refresh();
    }
    if (event.type === 'unpaired' && event.screenId === mine) {
      manifest = null;
      startPairing();
    }
  });

  root.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'size') document.body.classList.toggle('tv-large', root.classList.toggle('is-large'));
    if (act === 'hide') {
      root.classList.add('is-hidden');
      document.body.classList.remove('has-tv');
    }
    if (act === 'show') {
      root.classList.remove('is-hidden');
      document.body.classList.add('has-tv');
    }
    if (act === 'full') void root.querySelector<HTMLElement>('.stv-frame')!.requestFullscreen?.().catch(() => {});
    if (act === 'reset') {
      api.reset();
      location.reload();
    }
  });

  setInterval(tick, 15_000);
  setInterval(() => manifest && api.heartbeat(api.db.tvToken, sceneId), 20_000);
  refresh();
}
