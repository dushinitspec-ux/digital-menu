import { createRenderer, type Renderer } from '@dm/renderer';
import { resolveSceneId, type PlayerEvent, type PlayerManifest } from '@dm/shared';
import qrcode from 'qrcode-generator';
import './player.css';

const PLAYER_VERSION = '0.1.0';
const HEARTBEAT_MS = 60_000;
const POLL_MS = 60_000;
const SCHEDULE_TICK_MS = 15_000;
const OFFLINE_BADGE_AFTER_MS = 2 * 60_000;

const KEYS = { token: 'dm.token', pairing: 'dm.pairing', manifest: 'dm.manifest', clockOffset: 'dm.clockOffset' };

// --- Хранилище устройства. На некоторых ТВ localStorage может бросать исключения. ---

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // переполнение или запрет — живём без кэша
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += ('0' + bytes[i]!.toString(16)).slice(-2);
  return out;
}

const app = document.getElementById('app')!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ui(html: string) {
  app.innerHTML = html;
}

/** Часы ТВ часто сбиты: расписание считаем по времени сервера. */
function now(): Date {
  return new Date(Date.now() + (load<number>(KEYS.clockOffset) ?? 0));
}

// --- Сопряжение ---

interface Pairing {
  id: string;
  code: string;
  token: string;
  expiresAt: string;
}

function renderPairing(p: Pairing | null, message: string) {
  const code = p ? `${p.code.slice(0, 3)} ${p.code.slice(3)}` : '··· ···';
  let qr = '';
  if (p) {
    const q = qrcode(0, 'M');
    q.addData(`${location.origin}/admin/screens?pair=${p.code}`);
    q.make();
    qr = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }
  ui(`
    <div class="pp">
      <div class="pp-card">
        <div class="pp-kicker">Подключение экрана · Screen pairing</div>
        <div class="pp-code">${code}</div>
        <div class="pp-steps">
          <p>Откройте панель управления → <b>Экраны</b> → <b>Добавить экран</b> и введите код.</p>
          <p class="pp-en">Open the dashboard → <b>Screens</b> → <b>Add screen</b> and enter the code.</p>
        </div>
        <div class="pp-msg">${message}</div>
      </div>
      <div class="pp-qr">${qr}<span>Или отсканируйте телефоном<br/>Or scan with your phone</span></div>
    </div>`);
}

async function pair(): Promise<string> {
  let pairing = load<Pairing>(KEYS.pairing);
  for (;;) {
    try {
      if (!pairing || new Date(pairing.expiresAt).getTime() < Date.now()) {
        const token = pairing?.token ?? randomToken();
        const res = await fetch('/api/player/pairings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error(`pairing ${res.status}`);
        const body = (await res.json()) as Omit<Pairing, 'token'>;
        pairing = { ...body, token };
        save(KEYS.pairing, pairing);
      }
      renderPairing(pairing, 'Ожидаем подтверждения… · Waiting…');
      const res = await fetch(`/api/player/pairings/${pairing.id}`, { headers: { authorization: `Bearer ${pairing.token}` } });
      if (res.status === 404) {
        pairing = null;
        continue;
      }
      const status = (await res.json()) as { status: string };
      if (status.status === 'claimed') {
        save(KEYS.pairing, null);
        save(KEYS.token, pairing.token);
        return pairing.token;
      }
      if (status.status === 'expired') pairing = { ...pairing, expiresAt: new Date(0).toISOString() };
      await sleep(3000);
    } catch {
      renderPairing(pairing, 'Нет подключения к интернету · No internet connection');
      await sleep(5000);
    }
  }
}

// --- Работа экрана ---

class Player {
  private renderer: Renderer;
  private manifest: PlayerManifest | null = load<PlayerManifest>(KEYS.manifest);
  private shownKey = '';
  private events: EventSource | null = null;
  private fetching: Promise<void> | null = null;
  private refetch = false;
  private lastOnline = Date.now();
  private online = navigator.onLine !== false;
  private readonly startedAt = Date.now();
  private sceneId: string | null = null;
  private offlineBadge: HTMLElement;

  constructor(private readonly token: string) {
    app.innerHTML = '';
    this.renderer = createRenderer(app, { orientation: this.manifest?.screen.orientation ?? 'landscape' });
    this.offlineBadge = document.createElement('div');
    this.offlineBadge.className = 'pl-offline';
    document.body.appendChild(this.offlineBadge);
  }

  start() {
    // Сначала показываем то, что уже есть в кэше: экран оживает мгновенно и без сети.
    if (this.manifest) this.tick();
    void this.fetchManifest();
    this.connect();
    setInterval(() => void this.fetchManifest(), POLL_MS);
    setInterval(() => void this.heartbeat(), HEARTBEAT_MS);
    setInterval(() => this.tick(), SCHEDULE_TICK_MS);
    setInterval(() => this.updateOfflineBadge(), 10_000);
    void this.heartbeat();
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  private setOnline(online: boolean) {
    this.online = online;
    if (online) this.lastOnline = Date.now();
    this.updateOfflineBadge();
  }

  private updateOfflineBadge() {
    const offlineFor = Date.now() - this.lastOnline;
    this.offlineBadge.classList.toggle('is-visible', !this.online && offlineFor > OFFLINE_BADGE_AFTER_MS);
  }

  private connect() {
    if (typeof EventSource === 'undefined') return;
    this.events?.close();
    const es = new EventSource(`/api/player/events?token=${encodeURIComponent(this.token)}`);
    this.events = es;
    es.onopen = () => this.setOnline(true);
    es.onerror = () => this.setOnline(false);
    es.onmessage = (e) => {
      let event: PlayerEvent;
      try {
        event = JSON.parse(e.data) as PlayerEvent;
      } catch {
        return;
      }
      if (event.type === 'manifest') void this.fetchManifest();
      if (event.type === 'reload') location.reload();
      if (event.type === 'unpaired') this.unpair();
    };
  }

  private unpair() {
    this.events?.close();
    save(KEYS.token, null);
    save(KEYS.manifest, null);
    location.reload();
  }

  /** Склеивает частые события в один запрос; ETag экономит трафик, если ничего не поменялось. */
  private fetchManifest(): Promise<void> {
    if (this.fetching) {
      this.refetch = true;
      return this.fetching;
    }
    this.fetching = (async () => {
      try {
        const headers: Record<string, string> = { authorization: `Bearer ${this.token}` };
        if (this.manifest) headers['if-none-match'] = `"${this.manifest.version}"`;
        const res = await fetch('/api/player/manifest', { headers, cache: 'no-store' });
        if (res.status === 401) return this.unpair();
        this.setOnline(true);
        if (res.status === 304) return;
        if (!res.ok) return;
        const manifest = (await res.json()) as PlayerManifest;
        this.manifest = manifest;
        save(KEYS.manifest, manifest);
        this.precache(manifest.media);
        this.tick();
      } catch {
        this.setOnline(false);
      } finally {
        this.fetching = null;
        if (this.refetch) {
          this.refetch = false;
          void this.fetchManifest();
        }
      }
    })();
    return this.fetching;
  }

  private precache(urls: string[]) {
    const sw = navigator.serviceWorker?.controller;
    if (!sw || typeof MessageChannel === 'undefined') return;
    const channel = new MessageChannel();
    sw.postMessage({ type: 'precache', urls }, [channel.port2]);
  }

  private async heartbeat() {
    try {
      const res = await fetch('/api/player/heartbeat', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          version: this.manifest?.version ?? null,
          playerVersion: PLAYER_VERSION,
          sceneId: this.sceneId,
          online: this.online,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        }),
      });
      if (res.status === 401) return this.unpair();
      if (res.ok) {
        const { serverTime } = (await res.json()) as { serverTime: string };
        save(KEYS.clockOffset, new Date(serverTime).getTime() - Date.now());
      }
    } catch {
      // нет сети — экран продолжает показывать кэш
    }
    this.maybeNightlyReload();
  }

  /** Раз в сутки ночью перезагружаем страницу: долгоживущие страницы на ТВ копят память. */
  private maybeNightlyReload() {
    const local = now();
    const uptimeH = (Date.now() - this.startedAt) / 3_600_000;
    if (this.online && uptimeH > 6 && local.getHours() === 4) location.reload();
  }

  private tick() {
    const m = this.manifest;
    if (!m) return;
    this.renderer.setOrientation(m.screen.orientation);
    let sceneId = resolveSceneId(m.schedule, now(), m.location.timezone);
    if (!sceneId || !m.scenes[sceneId]) sceneId = m.schedule.defaultSceneId;
    const scene = sceneId ? m.scenes[sceneId] : undefined;
    const key = `${m.version}:${sceneId}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.sceneId = sceneId;
    if (!scene) {
      ui(`<div class="pp"><div class="pp-card"><div class="pp-kicker">${m.screen.name}</div>
        <div class="pp-steps"><p>Для экрана не выбрана сцена. Назначьте её в панели.</p>
        <p class="pp-en">No scene is assigned to this screen yet.</p></div></div></div>`);
      return;
    }
    if (!app.querySelector('.dm-root')) {
      app.innerHTML = '';
      this.renderer = createRenderer(app, { orientation: m.screen.orientation });
    }
    void this.renderer.show(scene, { currency: m.org.currency, locale: m.org.locale });
  }
}

async function keepAwake() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } };
    await nav.wakeLock?.request('screen');
  } catch {
    // не поддерживается — экран держит включённым приложение-обёртка или настройки ТВ
  }
}

async function main() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
  void keepAwake();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void keepAwake();
  });
  document.addEventListener('dblclick', () => {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  });
  (window as Window & { dmPlayerVersion?: string }).dmPlayerVersion = PLAYER_VERSION;

  const token = load<string>(KEYS.token) ?? (await pair());
  new Player(token).start();
}

void main();
