// Зимние экраны Understone: раскладка один в один с текущими экранами Merkez,
// вместо сакуры — кристаллы снежинок, на синем — снег и сугроб.
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const amp = (s) => esc(s).replace(/&amp;/g, '<span class="amp">&amp;</span>');
const num = (p) => (p >= 1000 ? `${Math.floor(p / 1000)}.${String(p % 1000).padStart(3, '0')}` : String(p));
const tl = (p) => `${num(p)}<span class="tl">₺</span>`;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Кристалл снежинки: луч из многоугольников, повторённый 6 раз ----------
const S60 = Math.sin(Math.PI / 3), C60 = Math.cos(Math.PI / 3);
function armShapes(type) {
  const R = 100;
  const shapes = [];
  const spine = (w0, w1) => shapes.push([[-w0, 0], [-w1, -R * 0.9], [0, -R], [w1, -R * 0.9], [w0, 0]]);
  const branch = (t, L, w, ang = Math.PI / 3) => {
    const y = -t * R, s = Math.sin(ang), c = Math.cos(ang);
    for (const side of [-1, 1]) {
      const ex = side * s * L, ey = y - c * L;
      shapes.push([[side * w * 0.2, y + w], [ex - side * w * 0.25, ey + w * 0.15], [ex, ey], [side * w * 0.2, y - w]]);
    }
  };
  const diamond = (t, r) => { const y = -t * R; shapes.push([[0, y + r * 1.4], [r, y], [0, y - r * 1.4], [-r, y]]); };
  if (type === 0) { spine(5.5, 2.2); branch(0.36, 34, 5); branch(0.6, 25, 4); branch(0.8, 14, 3); diamond(0.6, 4.5); }
  if (type === 1) { spine(4, 1.6); [[0.26, 18], [0.4, 24], [0.54, 24], [0.68, 19], [0.82, 12]].forEach(([t, L]) => branch(t, L, 2.8)); }
  if (type === 2) { spine(6, 3); branch(0.72, 26, 5, Math.PI / 4); diamond(0.42, 7); diamond(0.93, 4); }
  if (type === 3) { spine(5, 2); branch(0.5, 30, 4.5); branch(0.5, 14, 3, Math.PI / 6); branch(0.78, 16, 3); }
  return shapes;
}
function crystalPaths(type) {
  const arm = armShapes(type);
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, ca = Math.cos(a), sa = Math.sin(a);
    for (const poly of arm) {
      d += 'M' + poly.map(([x, y]) => `${(x * ca - y * sa).toFixed(1)} ${(x * sa + y * ca).toFixed(1)}`).join(' L') + 'Z';
    }
  }
  const hex = (r) => 'M' + Array.from({ length: 6 }, (_, k) => `${(r * Math.cos((k * Math.PI) / 3 + Math.PI / 6)).toFixed(1)} ${(r * Math.sin((k * Math.PI) / 3 + Math.PI / 6)).toFixed(1)}`).join(' L') + 'Z';
  d += hex(type === 2 ? 30 : 14);
  return { d, inner: type === 2 ? hex(20) : hex(7) };
}
let gid = 0;
/** Снежинка: размытый ореол, контур (только внешний — заливка сверху его перекрывает) и заливка градиентом. */
function crystal(type, size, x, y, rot, tone) {
  const { d, inner } = crystalPaths(type);
  const id = `g${gid++}`;
  const ice = tone === 'ice';
  const fill = ice
    ? `<radialGradient id="${id}"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d9ebfb"/><stop offset="1" stop-color="#9cc5ea"/></radialGradient>`
    : `<radialGradient id="${id}"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f3f9ff"/><stop offset="1" stop-color="#cfe4f7"/></radialGradient>`;
  const line = ice ? '#4f86bf' : 'rgba(170,205,240,.9)';
  const halo = ice ? 'rgba(150,195,240,.35)' : 'rgba(255,255,255,.35)';
  return `<svg class="cr" viewBox="-120 -120 240 240" style="left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;transform:rotate(${rot}deg)">
    <defs>${fill}</defs>
    <path d="${d}" fill="${halo}" stroke="${halo}" stroke-width="14" stroke-linejoin="round" style="filter:blur(6px)"/>
    <path d="${d}" fill="none" stroke="${line}" stroke-width="${ice ? 4.2 : 3}" stroke-linejoin="round"/>
    <path d="${d}" fill="url(#${id})"/>
    <path d="${inner}" fill="none" stroke="${ice ? 'rgba(79,134,191,.55)' : 'rgba(150,190,230,.7)'}" stroke-width="2"/>
  </svg>`;
}

/** Полоса снежинок вдоль края синей панели — там, где сейчас сакура. */
function flakeStrip(seed, edgeX, dir) {
  const r = rng(seed);
  let out = '';
  const ys = [70, 205, 330, 470, 600, 735, 870, 1000];
  ys.forEach((y0, i) => {
    const big = i % 2 === 0;
    const size = big ? 92 + r() * 34 : 52 + r() * 22;
    const x = edgeX - dir * (big ? 50 + r() * 22 : 26 + r() * 40);
    out += crystal(Math.floor(r() * 4), size, x, y0 + (r() - 0.5) * 40, r() * 60, 'ice');
    if (r() < 0.8) out += crystal(Math.floor(r() * 4), 26 + r() * 14, edgeX - dir * (90 + r() * 30), y0 + 50 + r() * 20, r() * 60, 'ice');
  });
  // Мелкие снежинки уже на синей панели — продолжают полосу.
  for (let k = 0; k < 6; k++) out += crystal(Math.floor(r() * 4), 22 + r() * 18, edgeX + dir * (18 + r() * 34), 90 + r() * 900, r() * 60, 'white');
  // Снежная пыль.
  for (let k = 0; k < 26; k++) {
    const s = 3 + r() * 5;
    out += `<i class="dot ice" style="left:${edgeX - dir * (10 + r() * 120)}px;top:${r() * 1080}px;width:${s}px;height:${s}px"></i>`;
  }
  return out;
}

/** Падающий снег: точки разного размера, крупные — размытые, как в кадре. */
function snow(seed, x0, x1, n, cls = '') {
  const r = rng(seed);
  let out = '';
  for (let k = 0; k < n; k++) {
    const s = r() < 0.1 ? 7 + r() * 6 : 2 + r() * 3.5;
    out += `<i class="dot ${s > 7 ? 'soft' : ''} ${cls}" style="left:${x0 + r() * (x1 - x0)}px;top:${r() * 1080}px;width:${s}px;height:${s}px;opacity:${(0.3 + r() * 0.45).toFixed(2)}"></i>`;
  }
  return out;
}

function list(groups) {
  return groups
    .filter((g) => g.length)
    .map((g) => `<div class="grp">${g.map((i) => `<div class="row"><span class="nm">${esc(i.name)}</span><span class="pr">${tl(i.price)}</span></div>`).join('')}</div>`)
    .join('<div class="div"></div>');
}
function block(b, align) {
  return `<section class="blk ${align}"><h2>${amp(b.title)}${b.flake ? crystalInline() : ''}</h2><div class="rule"></div>${list(b.groups)}</section>`;
}
function crystalInline() {
  const { d } = crystalPaths(0);
  return `<svg class="hflake" viewBox="-120 -120 240 240"><path d="${d}" fill="#4f86bf"/></svg>`;
}
function tiles(ts) {
  return `<div class="tiles">${ts.map((t) => `<figure class="tile"><img src="${t.img}" alt=""><figcaption><span class="tn">${esc(t.name)}</span><span class="tp">${tl(t.price)}</span></figcaption></figure>`).join('')}</div>`;
}

function drinks(s, seed) {
  return `<div class="screen drinks">
    <div class="col left">${s.left.map((b) => block(b, 'l')).join('')}</div>
    <div class="panel">${snow(seed, 0, 704, 42)}<div class="drift"></div>
      <h2>${amp(s.center.title)}</h2><div class="rule"></div>${list([s.center.rows])}${tiles(s.center.tiles)}</div>
    <div class="col right">${s.right.map((b) => block(b, 'r')).join('')}</div>
    <div class="deco">${flakeStrip(seed + 1, 626, 1)}${flakeStrip(seed + 2, 1330, -1)}</div>
  </div>`;
}

function food(dishes, seed) {
  const r = rng(seed);
  return `<div class="screen food">
    <div class="tex"></div>
    <div class="frost l"></div><div class="frost r"></div>
    ${snow(seed, 0, 1920, 95)}
    ${crystal(0, 120, 130, 120, 12, 'white')}${crystal(3, 66, 250, 70, 30, 'white')}${crystal(1, 44, 70, 250, 5, 'white')}
    ${crystal(2, 116, 1790, 118, 20, 'white')}${crystal(0, 60, 1670, 64, 40, 'white')}${crystal(3, 42, 1855, 248, 15, 'white')}
    <header><h1>${amp('FOOD & CO.')}</h1><div class="rule"></div></header>
    <div class="grid">${dishes.map((d) => `<div class="dish"><div class="ph"><img src="${d.img}" alt=""></div>
      <div class="tx"><div class="nm">${esc(d.name)}</div><div class="ds">${esc(d.desc)}</div><div class="pr">${tl(d.price)}</div></div></div>`).join('')}</div>
    <svg class="snowbank" viewBox="0 0 1920 140" preserveAspectRatio="none"><path d="M0 140 L0 92 Q120 60 250 84 T520 76 T800 92 T1080 70 T1360 88 T1640 72 T1920 86 L1920 140 Z" fill="rgba(255,255,255,.18)"/><path d="M0 140 L0 112 Q160 88 330 108 T660 100 T980 114 T1300 96 T1620 110 T1920 102 L1920 140 Z" fill="rgba(255,255,255,.32)"/></svg>
  </div>`;
}

const q2 = new URLSearchParams(location.hash.slice(1));
const screen = q2.get('s') || 'hot';
let html = '';
if (screen === 'hot') html = drinks(D.hot, 101);
if (screen === 'cold') html = drinks(D.cold, 202);
if (screen.startsWith('food')) html = food(D.food[Number(screen.slice(4) || 1) - 1], 300 + Number(screen.slice(4) || 1));
document.getElementById('app').innerHTML = html;
