// Leopard-print fur rug. Every bit of pile has a lean direction; brushing combs it the way
// your finger moves, and the light catches combed pile differently (sheen, fibre streaks),
// so strokes show up as changing texture, like running a hand over a real faux-fur rug.

import { TAU, clamp, rand, el, makeButton, makeCanvas, makeLoop, mulberry } from './wutil.js';

const W = 320, H = 240;
const RX = 22, RY = 24, RWl = 276, RHl = 192; // rug rectangle on the canvas (logical px)
const BS = 1.6;                               // render-buffer scale
const BW = Math.round(RWl * BS), BH = Math.round(RHl * BS);
const CELL = 2;                               // nap grid cell in buffer px
const GW = Math.ceil(BW / CELL), GH = Math.ceil(BH / CELL);
const BRUSH = 22 * BS / CELL;                 // brush radius in grid cells

// Light direction in the plane of the rug (pile leaning toward it looks brighter).
const LPX = -0.5, LPY = -0.866;

// Fine random tile used to streak fibres along the lean direction.
const TS = 128;
const TILE = (() => {
  const t = new Float32Array(TS * TS);
  const rnd = mulberry(77);
  for (let i = 0; i < t.length; i++) t[i] = rnd();
  return t;
})();

// Leopard-fur base colour, painted once into an offscreen canvas (no fibres; they are live).
function paintFur() {
  const cv = document.createElement('canvas');
  cv.width = BW;
  cv.height = BH;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(BS, 0, 0, BS, 0, 0);
  const rnd = mulberry(2016);
  const base = g.createLinearGradient(0, 0, RWl, RHl);
  base.addColorStop(0, '#ecbd68');
  base.addColorStop(0.5, '#dfa24b');
  base.addColorStop(1, '#e8b25a');
  g.fillStyle = base;
  g.fillRect(0, 0, RWl, RHl);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * RWl, y = rnd() * RHl, r = 18 + rnd() * 34;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rnd() > 0.5 ? 'rgba(160,92,30,.22)' : 'rgba(255,225,150,.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const blotch = (bx, by, rx, ry, rot, fill, blur) => {
    g.save();
    g.translate(bx, by);
    g.rotate(rot);
    g.fillStyle = fill;
    g.shadowColor = fill;
    g.shadowBlur = blur;
    g.beginPath();
    const n = 10;
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * TAU;
      const wob = 0.75 + rnd() * 0.45;
      const px = Math.cos(t) * rx * wob, py = Math.sin(t) * ry * wob;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.restore();
  };
  const rosette = (cx, cy, s) => {
    g.fillStyle = 'rgba(196,118,48,.55)';
    g.beginPath();
    g.ellipse(cx, cy, s * 0.62, s * 0.52, rnd() * TAU, 0, TAU);
    g.fill();
    const n = 6 + Math.floor(rnd() * 3), rot0 = rnd() * TAU;
    for (let k = 0; k < n; k++) {
      const a = rot0 + (k / n) * TAU + (rnd() - 0.5) * 0.35;
      const rr = s * (0.78 + rnd() * 0.18);
      blotch(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s * (0.34 + rnd() * 0.16), s * (0.2 + rnd() * 0.1), a + Math.PI / 2, '#24110a', 2.4);
    }
    for (let k = 0; k < 2; k++) {
      blotch(cx + (rnd() - 0.5) * s * 0.5, cy + (rnd() - 0.5) * s * 0.5, s * 0.14, s * 0.1, rnd() * TAU, 'rgba(60,28,10,.8)', 1.5);
    }
  };
  for (let gy = -1; gy <= Math.ceil(RHl / 44); gy++) {
    for (let gx = -1; gx <= Math.ceil(RWl / 44); gx++) {
      const cx = gx * 44 + (gy % 2 ? 22 : 0) + (rnd() - 0.5) * 14;
      const cy = gy * 44 + (rnd() - 0.5) * 14;
      if (rnd() < 0.85) rosette(cx, cy, 12 + rnd() * 5);
    }
  }
  for (let i = 0; i < 70; i++) blotch(rnd() * RWl, rnd() * RHl, 2 + rnd() * 3, 1.6 + rnd() * 2, rnd() * TAU, '#2a1409', 1.6);
  return g.getImageData(0, 0, BW, BH).data;
}

export function mountRug(root, api) {
  const c = makeCanvas(W, H, 'A leopard-print fur rug. Brush it with your finger and the pile changes direction.');
  const { ctx } = c;
  const hint = el('p', 'widget-hint', 'brush the rug · combed fur catches the light differently');
  const fluffBtn = makeButton('fluff it up');
  root.append(c.canvas, hint, fluffBtn);

  const fur = paintFur();
  const buf = document.createElement('canvas');
  buf.width = BW;
  buf.height = BH;
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(BW, BH);
  const out = img.data;

  // Pile state per grid cell: lean direction (unit vector) and how flat it's been combed (0..1).
  const nx = new Float32Array(GW * GH);
  const ny = new Float32Array(GW * GH);
  const flat = new Float32Array(GW * GH);

  function fluff() {
    const rnd = mulberry((Math.random() * 1e9) | 0);
    const ox = rnd() * 100, oy = rnd() * 100;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const u = x / GW * 3 + ox, v = y / GH * 2.2 + oy;
        const a = (Math.sin(u * 2.1 + Math.cos(v * 1.7)) + Math.sin(v * 2.9 - u * 0.8)) * 1.6 + 0.9;
        const i = y * GW + x;
        nx[i] = Math.cos(a);
        ny[i] = Math.sin(a);
        flat[i] = 0.18;
      }
    }
  }
  fluff();

  function render() {
    for (let y = 0; y < BH; y++) {
      const gy = Math.min(GH - 1, (y / CELL) | 0);
      for (let x = 0; x < BW; x++) {
        const gi = gy * GW + Math.min(GW - 1, (x / CELL) | 0);
        const ux = nx[gi], uy = ny[gi], fl = flat[gi];
        // fibre streaks: long along the lean direction, fine across it
        const u = ((x * ux + y * uy) * 0.12 + 4096) | 0;
        const v = ((-x * uy + y * ux) * 0.95 + 4096) | 0;
        const f = TILE[((v & 127) << 7) | (u & 127)];
        const cosL = ux * LPX + uy * LPY; // -1..1: leaning toward the light
        let m = 1 + 0.26 * cosL + (f - 0.5) * (0.5 - 0.28 * fl);
        const sheen = (cosL > 0 ? cosL * cosL : 0) * fl * 46;
        const o = (y * BW + x) * 4;
        const r = fur[o] * m + sheen * 1.0;
        const g = fur[o + 1] * m + sheen * 0.9;
        const b = fur[o + 2] * m + sheen * 0.62;
        out[o] = r > 255 ? 255 : r < 0 ? 0 : r;
        out[o + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        out[o + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
        out[o + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
  }

  const RUG = new Path2D();
  RUG.roundRect(RX, RY, RWl, RHl, 12);

  function draw() {
    // wooden floor
    const fl = ctx.createLinearGradient(0, 0, 0, H);
    fl.addColorStop(0, '#f1dfcb');
    fl.addColorStop(1, '#e6cfb6');
    ctx.fillStyle = fl;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(150,110,80,0.18)';
    ctx.lineWidth = 1;
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    }
    for (let y = 0, r = 0; y < H; y += 40, r++) {
      for (let x = (r % 2) * 90 + 30; x < W; x += 180) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 20); ctx.stroke();
      }
    }
    // tassels
    ctx.strokeStyle = '#f6e3b8';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let y = RY + 8; y < RY + RHl - 6; y += 5) {
      ctx.beginPath(); ctx.moveTo(RX + 2, y); ctx.lineTo(RX - 9, y + 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(RX + RWl - 2, y); ctx.lineTo(RX + RWl + 9, y + 0.6); ctx.stroke();
    }
    // soft shadow + the rug
    ctx.save();
    ctx.shadowColor = 'rgba(80,50,30,0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#c99342';
    ctx.fill(RUG);
    ctx.restore();
    ctx.save();
    ctx.clip(RUG);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, RX, RY, RWl, RHl);
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,35,8,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke(RUG);
  }

  const loop = makeLoop(() => {
    render();
    draw();
    return false;
  });
  const redraw = () => loop.kick();

  let brushing = false;
  let last = null;
  let lastSound = 0;

  // Comb the pile toward (dx,dy) around grid cell (cx,cy).
  function comb(cx, cy, dx, dy, strength) {
    const x0 = Math.max(0, Math.floor(cx - BRUSH)), x1 = Math.min(GW - 1, Math.ceil(cx + BRUSH));
    const y0 = Math.max(0, Math.floor(cy - BRUSH)), y1 = Math.min(GH - 1, Math.ceil(cy + BRUSH));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / BRUSH;
        if (d >= 1) continue;
        const w = (1 - d * d) * strength;
        const i = y * GW + x;
        let ax = nx[i] * (1 - w) + dx * w, ay = ny[i] * (1 - w) + dy * w;
        const l = Math.hypot(ax, ay) || 1;
        nx[i] = ax / l;
        ny[i] = ay / l;
        flat[i] = Math.min(1, flat[i] + w * 0.5);
      }
    }
  }

  function brushTo(p) {
    const gx = ((p.x - RX) * BS) / CELL, gy = ((p.y - RY) * BS) / CELL;
    if (last) {
      const dx = p.x - last.x, dy = p.y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.8) return;
      const ux = dx / dist, uy = dy / dist;
      const steps = Math.max(1, Math.ceil(dist / 3));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        comb(((last.x + dx * t - RX) * BS) / CELL, ((last.y + dy * t - RY) * BS) / CELL, ux, uy, 0.55);
      }
      const now = performance.now();
      if (now - lastSound > 90) {
        api.audio.brush();
        lastSound = now;
      }
      redraw();
    }
    last = { x: p.x, y: p.y };
  }

  c.canvas.addEventListener('pointerdown', (e) => {
    c.canvas.setPointerCapture(e.pointerId);
    brushing = true;
    last = null;
    brushTo(c.toLocal(e));
  });
  c.canvas.addEventListener('pointermove', (e) => { if (brushing) brushTo(c.toLocal(e)); });
  const release = () => { brushing = false; last = null; };
  c.canvas.addEventListener('pointerup', release);
  c.canvas.addEventListener('pointercancel', release);

  fluffBtn.addEventListener('click', () => {
    fluff();
    api.audio.brush();
    redraw();
  });

  redraw();
  return () => loop.stop();
}
