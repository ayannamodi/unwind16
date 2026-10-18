// Instant camera: click the shutter and it prints a random cute 2016-ish photo with a
// handwritten caption. Eight shots per film pack, then it reloads itself.

import { TAU, clamp, rand, pick, el, makeCanvas, mulberry, star } from './wutil.js';

const CAPTIONS = [
  'good vibes only',
  'stay golden ✨',
  "you're doing amazing, sweetie",
  'be a unicorn in a field of horses',
  'no filter, just focus',
  'squad goals: finish this sprint',
  'adulting is hard. snacks help.',
  'rise & grind (gently)',
  'dream big, sparkle more',
  'mood: unbothered',
  'you got this ♡',
  'keep calm & study on',
  'treat yo self (after the sprint)',
  'bottle flip your worries away',
  'less scroll, more soul',
  'future you says thanks',
];

const BGS = [
  ['#ffe3ef', '#ffc9df'],
  ['#e3f4ff', '#cbe7ff'],
  ['#e6f9ee', '#c8efd9'],
  ['#fff1dc', '#ffdcb5'],
  ['#efe6ff', '#dccbff'],
  ['#fff9d9', '#ffeea3'],
];

/* ---------- little illustrations (160x160 canvas) ---------- */

function face(g, x, y, s = 1) {
  g.fillStyle = '#4a3552';
  for (const dx of [-9, 9]) {
    g.beginPath();
    g.ellipse(x + dx * s, y, 2.6 * s, 3.2 * s, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x + dx * s + 0.8 * s, y - 1 * s, 0.9 * s, 0, TAU);
    g.fill();
    g.fillStyle = '#4a3552';
  }
  g.fillStyle = 'rgba(255,130,160,.55)';
  for (const dx of [-16, 16]) {
    g.beginPath();
    g.ellipse(x + dx * s, y + 6 * s, 4.5 * s, 3 * s, 0, 0, TAU);
    g.fill();
  }
  g.strokeStyle = '#4a3552';
  g.lineWidth = 1.6 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y + 5 * s, 3.2 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
}

const SCENES = {
  avocado(g) {
    g.fillStyle = '#456f35';
    g.beginPath(); g.ellipse(80, 86, 40, 54, 0, 0, TAU); g.fill();
    g.fillStyle = '#d4e79a';
    g.beginPath(); g.ellipse(80, 88, 33, 46, 0, 0, TAU); g.fill();
    g.fillStyle = '#9a6b45';
    g.beginPath(); g.arc(80, 106, 17, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.beginPath(); g.arc(74, 100, 5, 0, TAU); g.fill();
    face(g, 80, 68, 1.05);
  },
  pizza(g) {
    g.fillStyle = '#ffd36b';
    g.beginPath(); g.moveTo(80, 142); g.lineTo(34, 52); g.quadraticCurveTo(80, 32, 126, 52); g.closePath(); g.fill();
    g.strokeStyle = '#e8a95a'; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(36, 52); g.quadraticCurveTo(80, 32, 124, 52); g.stroke();
    g.fillStyle = '#e8575b';
    [[58, 70], [102, 70], [70, 112], [92, 112]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); });
    face(g, 80, 86, 0.9);
  },
  donut(g) {
    g.fillStyle = '#e6b47a';
    g.beginPath(); g.arc(80, 84, 46, 0, TAU); g.moveTo(95, 84); g.arc(80, 84, 15, 0, TAU); g.fill('evenodd');
    g.fillStyle = '#ff9ec7';
    g.beginPath(); g.arc(80, 84, 40, 0, TAU); g.moveTo(97, 84); g.arc(80, 84, 17, 0, TAU); g.fill('evenodd');
    const cols = ['#fff', '#7fd6ff', '#ffe36b', '#9cf0c0', '#c9a6ff'];
    const rnd = mulberry(5);
    g.lineWidth = 2.4; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU, d = 22 + rnd() * 16;
      const sx = 80 + Math.cos(a) * d, sy = 84 + Math.sin(a) * d, r = rnd() * TAU;
      g.strokeStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(r) * 5, sy + Math.sin(r) * 5); g.stroke();
    }
    face(g, 80, 118, 0.8);
  },
  icecream(g) {
    const cone = new Path2D();
    cone.moveTo(54, 88); cone.lineTo(106, 88); cone.lineTo(80, 148); cone.closePath();
    g.fillStyle = '#e8b36a'; g.fill(cone);
    g.save(); g.clip(cone);
    g.strokeStyle = 'rgba(150,100,50,.45)'; g.lineWidth = 1.4;
    for (let i = -6; i < 8; i++) {
      g.beginPath(); g.moveTo(40 + i * 11, 80); g.lineTo(80 + i * 11, 150); g.stroke();
      g.beginPath(); g.moveTo(120 + i * 11, 80); g.lineTo(80 + i * 11, 150); g.stroke();
    }
    g.restore();
    g.fillStyle = '#ffb6d3'; g.beginPath(); g.arc(80, 58, 24, 0, TAU); g.fill();
    g.fillStyle = '#bff0d8'; g.beginPath(); g.arc(80, 80, 28, 0, TAU); g.fill();
    g.fillStyle = '#e8434f'; g.beginPath(); g.arc(80, 30, 7, 0, TAU); g.fill();
    g.strokeStyle = '#6b8a3a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(80, 24); g.quadraticCurveTo(86, 12, 94, 14); g.stroke();
    face(g, 80, 82, 0.95);
  },
  pineapple(g) {
    g.fillStyle = '#5fb36a';
    for (let i = 0; i < 5; i++) {
      const a = (-50 + i * 25) * (Math.PI / 180);
      const tx = 80 + Math.sin(a) * 36, ty = 54 - Math.cos(a) * 36;
      g.beginPath(); g.moveTo(72, 56); g.lineTo(tx, ty); g.lineTo(88, 56); g.closePath(); g.fill();
    }
    g.fillStyle = '#ffd24d';
    g.beginPath(); g.ellipse(80, 100, 34, 46, 0, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.ellipse(80, 100, 34, 46, 0, 0, TAU); g.clip();
    g.strokeStyle = '#e9a92f'; g.lineWidth = 1.4;
    for (let i = -8; i < 9; i++) {
      g.beginPath(); g.moveTo(80 + i * 14 - 60, 40); g.lineTo(80 + i * 14 + 60, 160); g.stroke();
      g.beginPath(); g.moveTo(80 + i * 14 + 60, 40); g.lineTo(80 + i * 14 - 60, 160); g.stroke();
    }
    g.restore();
    face(g, 80, 100, 1);
  },
  cactus(g) {
    g.fillStyle = '#69b87a';
    [[64, 48, 32, 76, 16], [44, 72, 16, 32, 8], [44, 92, 28, 12, 6], [100, 60, 16, 30, 8], [90, 80, 26, 12, 6]].forEach(([x, y, w, h, r]) => {
      g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
    });
    g.fillStyle = '#d98f6b'; g.beginPath(); g.roundRect(58, 116, 44, 32, 6); g.fill();
    g.fillStyle = '#e6a07c'; g.beginPath(); g.roundRect(54, 110, 52, 12, 5); g.fill();
    g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(80, 46, 8, 0, TAU); g.fill();
    g.fillStyle = '#ffe36b'; g.beginPath(); g.arc(80, 46, 3, 0, TAU); g.fill();
    face(g, 80, 84, 0.95);
  },
  rainbow(g) {
    const cols = ['#ff7a8a', '#ffb76b', '#ffe36b', '#7fd69a', '#6bb7ff', '#b48cff'];
    g.lineWidth = 7;
    cols.forEach((c, i) => {
      g.strokeStyle = c;
      g.beginPath(); g.arc(80, 118, 56 - i * 7, Math.PI, TAU); g.stroke();
    });
    g.fillStyle = '#fff';
    [[50, 120, 17], [72, 110, 22], [98, 112, 23], [116, 122, 16]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.fillRect(50, 120, 66, 18);
    face(g, 82, 122, 0.9);
  },
  cat(g) {
    g.fillStyle = '#fffaf5';
    g.strokeStyle = '#e6d3dc'; g.lineWidth = 2;
    [[[46, 66], [56, 26], [84, 50]], [[114, 66], [104, 26], [76, 50]]].forEach((t) => {
      g.beginPath(); g.moveTo(...t[0]); g.lineTo(...t[1]); g.lineTo(...t[2]); g.closePath(); g.fill(); g.stroke();
    });
    g.fillStyle = '#ffc2d2';
    [[[54, 58], [58, 38], [74, 52]], [[106, 58], [102, 38], [86, 52]]].forEach((t) => {
      g.beginPath(); g.moveTo(...t[0]); g.lineTo(...t[1]); g.lineTo(...t[2]); g.closePath(); g.fill();
    });
    g.fillStyle = '#fffaf5';
    g.beginPath(); g.ellipse(80, 92, 48, 42, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#d9c7bf'; g.lineWidth = 2; g.lineCap = 'round';
    [-8, 0, 8].forEach((dx) => { g.beginPath(); g.moveTo(80 + dx, 54); g.lineTo(80 + dx, 62); g.stroke(); });
    face(g, 80, 90, 1.15);
    g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(80, 99, 2.4, 0, TAU); g.fill();
    g.strokeStyle = '#b9a5b5'; g.lineWidth = 1.3;
    [-1, 1].forEach((sgn) => [0, 6, 12].forEach((o) => {
      g.beginPath(); g.moveTo(80 + sgn * 34, 96 + o * 0.5); g.lineTo(80 + sgn * 62, 90 + o); g.stroke();
    }));
  },
};

function drawPhoto(g) {
  const [c0, c1] = pick(BGS);
  const bg = g.createLinearGradient(0, 0, 160, 160);
  bg.addColorStop(0, c0);
  bg.addColorStop(1, c1);
  g.fillStyle = bg;
  g.fillRect(0, 0, 160, 160);

  const pattern = pick(['dots', 'stars', 'stripes']);
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 8;
  if (pattern === 'dots') {
    for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(rand(0, 160), rand(0, 160), rand(3, 7), 0, TAU); g.fill(); }
  } else if (pattern === 'stars') {
    for (let i = 0; i < 12; i++) star(g, rand(8, 152), rand(8, 152), rand(5, 10));
  } else {
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 28, 0); g.lineTo(i * 28 + 160, 160); g.stroke(); }
  }

  pick(Object.values(SCENES))(g);

  // vintage vignette + warm cast
  const v = g.createRadialGradient(80, 80, 50, 80, 80, 120);
  v.addColorStop(0, 'rgba(60,30,80,0)');
  v.addColorStop(1, 'rgba(60,30,80,.16)');
  g.fillStyle = v;
  g.fillRect(0, 0, 160, 160);
  g.fillStyle = 'rgba(255,200,150,.07)';
  g.fillRect(0, 0, 160, 160);
}

export function mountPolaroid(root, api) {
  const IDLE = 'click the shutter (or the lens) — it prints a surprise';
  const wrap = el('div', 'pol');
  wrap.innerHTML = `
    <div class="pol-prints"></div>
    <div class="pol-camera">
      <div class="pol-top">
        <div class="pol-flashwin"></div>
        <div class="pol-vf"></div>
        <button type="button" class="pol-shutter" aria-label="Take a photo"></button>
      </div>
      <div class="pol-lensring"><div class="pol-glass"></div></div>
      <div class="pol-stripe"></div>
      <div class="pol-slot"></div>
      <div class="pol-film" role="img" aria-label="Film remaining"></div>
      <div class="pol-fx"></div>
    </div>`;
  const hint = el('p', 'widget-hint', IDLE);
  root.append(wrap, hint);

  const tray = wrap.querySelector('.pol-prints');
  const shutter = wrap.querySelector('.pol-shutter');
  const lens = wrap.querySelector('.pol-lensring');
  const fx = wrap.querySelector('.pol-fx');
  const filmEl = wrap.querySelector('.pol-film');
  const dots = [];
  for (let i = 0; i < 8; i++) {
    const d = document.createElement('i');
    filmEl.append(d);
    dots.push(d);
  }

  const MAX_PRINTS = 3;
  let film = 8;
  let busy = false;
  const prints = [];
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  };

  function renderFilm() {
    dots.forEach((d, i) => d.classList.toggle('on', i < film));
    filmEl.setAttribute('aria-label', `${film} shots left`);
  }
  renderFilm();

  function layout() {
    const dxs = [0, 64, -64], dys = [0, 12, 16];
    prints.forEach((p, i) => {
      p.style.setProperty('--dx', (dxs[i] || 0) + 'px');
      p.style.setProperty('--dy', (dys[i] || 0) + 'px');
      p.style.zIndex = String(10 - i);
    });
  }

  function printPhoto() {
    api.audio.printWhirr();
    const fig = document.createElement('figure');
    fig.className = 'print new' + (api.reducedMotion ? '' : ' developing');
    fig.style.setProperty('--rot', rand(-5, 5).toFixed(1) + 'deg');
    const cv = makeCanvas(160, 160, 'A freshly printed instant photo');
    drawPhoto(cv.ctx);
    const caption = pick(CAPTIONS);
    fig.append(cv.canvas, el('figcaption', null, caption));
    fig.addEventListener('animationend', () => fig.classList.remove('new'));
    fig.addEventListener('click', () => {
      const i = prints.indexOf(fig);
      if (i > 0) { prints.splice(i, 1); prints.unshift(fig); layout(); }
    });
    prints.unshift(fig);
    tray.append(fig);
    if (prints.length > MAX_PRINTS) prints.pop().remove();
    layout();
    hint.textContent = `printing… "${caption}"`;
    later(() => fig.classList.remove('developing'), api.reducedMotion ? 0 : 1800);
  }

  function shoot() {
    if (busy) return;
    busy = true;
    if (film === 0) {
      hint.textContent = 'loading a fresh film pack…';
      api.audio.thud();
      later(() => { film = 8; renderFilm(); busy = false; hint.textContent = 'new film pack ✨'; }, 900);
      return;
    }
    film--;
    renderFilm();
    api.audio.shutter();
    fx.classList.add('on');
    later(() => fx.classList.remove('on'), 80);
    later(printPhoto, 260);
    later(() => { busy = false; }, 1100);
  }

  shutter.addEventListener('click', shoot);
  lens.addEventListener('click', shoot);

  return () => timers.forEach(clearTimeout);
}
