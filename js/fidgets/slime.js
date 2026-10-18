// Glossy slime on a table. A heightfield is shaded per pixel (diffuse + specular +
// refraction of an iridescent colour field), your finger pushes it around, and it
// slowly flows back into a blob.

import { TAU, clamp, el, makeButton, makeCanvas, makeLoop } from './wutil.js';

const GW = 256, GH = 192, N = GW * GH, HMAX = 15;
const SC = GW / 200; // everything below was tuned at 200 cells wide
const W = 320, H = 240;

const PALETTES = {
  galaxy: {
    label: 'galaxy',
    stops: [[12, 8, 52], [52, 22, 122], [128, 50, 188], [214, 86, 206], [60, 204, 222], [226, 204, 248]],
    stars: 0.99, glitter: 0.989,
  },
  sunset: {
    label: 'sunset',
    stops: [[92, 32, 98], [176, 52, 118], [238, 98, 100], [252, 150, 98], [255, 194, 128], [255, 222, 176]],
    stars: 0, glitter: 0.996,
  },
};

/* ---------- noise ---------- */
function hash(x, y, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 4; o++) {
    sum += amp * vnoise(x * f, y * f, s + o);
    f *= 2;
    amp *= 0.5;
  }
  return sum;
}

function sampleStops(stops, f, out) {
  const n = stops.length - 1;
  const p = clamp(f, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(p));
  const t = p - i;
  const a = stops[i], b = stops[i + 1];
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

// Swirly iridescent colour field that the slime "refracts".
function buildField(pal) {
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const col = [0, 0, 0];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const dx = x / GW - 0.5, dy = (y / GH - 0.5) * 0.75;
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) + r * 6;
      const sx = Math.cos(ang) * r * 4 + 3, sy = Math.sin(ang) * r * 4 + 3;
      const w = fbm(sx + 1.7, sy + 9.2, 3);
      let f = fbm((sx + w * 1.8) * 1.4, (sy + w * 1.8) * 1.4, 11);
      f = clamp((f - 0.12) / 0.62, 0, 1);
      f = clamp(f + 0.18 * Math.sin(ang * 2 - r * 12), 0, 1);
      sampleStops(pal.stops, f, col);
      let rr = col[0], gg = col[1], bb = col[2];
      if (pal.stars && hash(x, y, 77) > pal.stars) {
        const s = 90 + 165 * hash(x, y, 78);
        rr = Math.min(255, rr + s);
        gg = Math.min(255, gg + s);
        bb = Math.min(255, bb + s);
      }
      const i = y * GW + x;
      R[i] = rr;
      G[i] = gg;
      B[i] = bb;
    }
  }
  return { R, G, B };
}

function buildGlitter(pal) {
  const GL = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = i % GW, y = (i / GW) | 0;
    if (hash(x, y, 5) > pal.glitter) GL[i] = 0.4 + 0.6 * hash(x, y, 6);
  }
  return GL;
}

// Pale pink marble tabletop.
function buildTable() {
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const u = x / GW, v = y / GH;
      const light = 1.04 - 0.1 * (u * 0.6 + v * 0.9);
      const vein = Math.max(0, 1 - Math.abs(fbm(u * 5 + v * 1.5, v * 4, 21) - 0.45) * 14);
      const fine = (fbm(u * 18, v * 14, 5) - 0.45) * 8;
      const i = y * GW + x;
      R[i] = 247 * light - vein * 10 + fine;
      G[i] = 237 * light - vein * 11 + fine;
      B[i] = 232 * light - vein * 8 + fine;
    }
  }
  return { R, G, B };
}

// Gentle static ripples in the surface normal: gives the flowing, marbled reflections
// of a real glossy gel.
function buildRipples() {
  const MX = new Float32Array(N), MY = new Float32Array(N);
  const du = (2 / GW) * 9, dv = (2 / GH) * 7;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const u = (x / GW) * 9, v = (y / GH) * 7;
      const i = y * GW + x;
      MX[i] = (fbm(u + du, v, 31) - fbm(u - du, v, 31)) * 2.4;
      MY[i] = (fbm(u, v + dv, 31) - fbm(u, v - dv, 31)) * 2.4;
    }
  }
  return { MX, MY };
}

// Blob-shaped target thickness: the resting shape of the slime.
function buildTarget() {
  const t = new Float32Array(N);
  const cx = GW * 0.5, cy = GH * 0.53, rx = GW * 0.4, ry = GH * 0.38;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const q0 = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const rr = 1 + 0.07 * Math.sin(3 * ang + 1.2) + 0.05 * Math.sin(5 * ang + 0.4) + 0.03 * Math.sin(2 * ang);
      const q = q0 / rr;
      t[y * GW + x] = q < 1 ? HMAX * Math.pow(1 - q * q * q, 0.55) : 0;
    }
  }
  return t;
}

// Light from the top-left.
const LX = -0.45, LY = -0.6, LZ = 0.66;
const hl0 = Math.hypot(LX, LY, LZ + 1);
const HX = LX / hl0, HY = LY / hl0, HZ = (LZ + 1) / hl0;
const NS = 2.4 * SC;
const S3 = Math.round(3 * SC), S4 = Math.round(4 * SC), S6 = Math.round(6 * SC), S8 = Math.round(8 * SC), S11 = Math.round(11 * SC), S14 = Math.round(14 * SC);

const ringIdx = new Int32Array(5200);
const ringW = new Float32Array(5200);

export function mountSlime(root, api) {
  const main = makeCanvas(W, H, 'Glossy slime on a table. Press and drag to squish it.');
  const fx = makeCanvas(W, H, '');
  fx.canvas.removeAttribute('aria-label');
  fx.canvas.setAttribute('aria-hidden', 'true');
  const stack = el('div', 'stack');
  stack.style.touchAction = 'none';
  stack.append(main.canvas, fx.canvas);

  const swatchRow = el('div', 'chips');
  const hint = el('p', 'widget-hint', 'press & drag to squish · it slowly flows back');
  const smoothBtn = makeButton('smooth out');
  root.append(stack, swatchRow, hint, smoothBtn);

  const ctx = main.ctx;
  const fctx = fx.ctx;

  const buf = document.createElement('canvas');
  buf.width = GW;
  buf.height = GH;
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(GW, GH);
  const px = img.data;

  const TB = buildTable();
  const { MX, MY } = buildRipples();
  const T = buildTarget();
  let h = new Float32Array(T);
  let h2 = new Float32Array(N);
  let palKey = 'galaxy';
  let field = buildField(PALETTES[palKey]);
  let GL = buildGlitter(PALETTES[palKey]);

  // Little droplets sitting on the slime (they vanish where you squish).
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const bx = 30 + hash(i, 1, 9) * (GW - 60);
    const by = 25 + hash(i, 2, 9) * (GH - 50);
    const idx = Math.round(by) * GW + Math.round(bx);
    if (T[idx] > 7) bubbles.push({ gx: bx, gy: by, r: (1.6 + hash(i, 3, 9) * 3.2) * SC, idx });
  }

  /* ---------- palette swatches ---------- */
  const swatches = {};
  Object.entries(PALETTES).forEach(([key, pal]) => {
    const b = el('button', 'swatch');
    b.type = 'button';
    b.setAttribute('aria-label', pal.label + ' slime');
    b.title = pal.label;
    const s = pal.stops;
    b.style.background = `linear-gradient(135deg, rgb(${s[0]}), rgb(${s[2]}), rgb(${s[s.length - 2]}))`;
    b.addEventListener('click', () => setPalette(key));
    swatches[key] = b;
    swatchRow.append(b);
  });
  function markSwatches() {
    Object.entries(swatches).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === palKey)));
  }
  function setPalette(key) {
    palKey = key;
    field = buildField(PALETTES[key]);
    GL = buildGlitter(PALETTES[key]);
    markSwatches();
    loop.kick();
  }
  markSwatches();

  /* ---------- physics ---------- */
  function dynamics(relax) {
    const K = 0.1;
    let maxd = 0;
    for (let y = 1; y < GH - 1; y++) {
      for (let x = 1; x < GW - 1; x++) {
        const i = y * GW + x;
        const c = h[i];
        const lap = h[i - 1] + h[i + 1] + h[i - GW] + h[i + GW] - 4 * c;
        let nv = c + K * lap + (T[i] - c) * relax;
        if (nv < 0) nv = 0;
        h2[i] = nv;
        const d = nv > c ? nv - c : c - nv;
        if (d > maxd) maxd = d;
      }
    }
    const tmp = h;
    h = h2;
    h2 = tmp;
    return maxd;
  }

  // Finger press: squash slime under the fingertip and shove it into a ring around it
  // (more of it in front when dragging).
  function press(gx, gy, k, dirx, diry) {
    const R = 9 * SC, RR = R * 2.6;
    const x0 = Math.max(1, Math.floor(gx - RR)), x1 = Math.min(GW - 2, Math.ceil(gx + RR));
    const y0 = Math.max(1, Math.floor(gy - RR)), y1 = Math.min(GH - 2, Math.ceil(gy + RR));
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - gx, y - gy) / R;
        if (d >= 1) continue;
        const w0 = 1 - d * d, w = w0 * w0;
        const i = y * GW + x;
        const floor = Math.max(0.6, T[i] * 0.34);
        if (h[i] > floor) {
          const dec = (h[i] - floor) * k * w;
          h[i] -= dec;
          removed += dec;
        }
      }
    }
    if (removed <= 0) return;
    let n = 0, wsum = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ddx = x - gx, ddy = y - gy;
        const dd = Math.hypot(ddx, ddy);
        const d = dd / R;
        if (d < 1 || d >= 2.6) continue;
        const rw = Math.max(0, 1 - Math.abs(d - 1.6) / 1.0);
        const bias = Math.max(0.1, 1 + 0.9 * ((ddx * dirx + ddy * diry) / (dd || 1)));
        const wt = rw * bias;
        if (wt <= 0) continue;
        ringIdx[n] = y * GW + x;
        ringW[n] = wt;
        wsum += wt;
        n++;
      }
    }
    if (!wsum) return;
    const amt = (removed * 0.95) / wsum;
    for (let j = 0; j < n; j++) h[ringIdx[j]] += ringW[j] * amt;
  }

  /* ---------- rendering ---------- */
  const sampleH = (x, y) => {
    if (x < 0 || y < 0) return 0;
    const v = h[y * GW + x] / 7;
    return v > 1 ? 1 : v;
  };

  function render() {
    const FR = field.R, FG = field.G, FB = field.B;
    for (let y = 1; y < GH - 1; y++) {
      for (let x = 1; x < GW - 1; x++) {
        const i = y * GW + x;
        const hh = h[i];
        let tr = 0, tg = 0, tb = 0;
        if (hh < 2.2) {
          const sh = sampleH(x - S3, y - S4) * 0.5 + sampleH(x - S6, y - S8) * 0.3 + sampleH(x - S11, y - S14) * 0.2;
          const k = 1 - 0.36 * sh;
          tr = TB.R[i] * k;
          tg = TB.G[i] * k * 0.99;
          tb = TB.B[i] * k;
        }
        let r, g, b;
        if (hh <= 0.05) {
          r = tr; g = tg; b = tb;
        } else {
          const rp = hh >= 4 ? 1 : hh / 4;
          const nxr = (h[i - 1] - h[i + 1]) * NS * 0.5 + MX[i] * rp;
          const nyr = (h[i - GW] - h[i + GW]) * NS * 0.5 + MY[i] * rp;
          const inv = 1 / Math.sqrt(nxr * nxr + nyr * nyr + 1);
          const nx = nxr * inv, ny = nyr * inv, nz = inv;
          const diff = Math.max(0, nx * LX + ny * LY + nz * LZ);
          const sp = Math.max(0, nx * HX + ny * HY + nz * HZ);
          const s2 = sp * sp, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8, s32 = s16 * s16;
          const spec = s32 * s32;
          const soft = s8 * 0.35;

          let sx = x + nx * 9 * SC, sy = y + ny * 9 * SC;
          sx = sx < 0 ? 0 : sx > GW - 1 ? GW - 1 : sx;
          sy = sy < 0 ? 0 : sy > GH - 1 ? GH - 1 : sy;
          const fi = (sy | 0) * GW + (sx | 0);

          const th = Math.min(1.2, hh / HMAX);
          const shade = 0.5 + 0.5 * diff + 0.16 * th;
          const thin = 1 - Math.min(1, hh / 5);
          let sr = FR[fi] * shade + thin * 22;
          let sg = FG[fi] * shade + thin * 22;
          let sb = FB[fi] * shade + thin * 22;

          const hl = spec * 190 + soft * 28;
          sr += hl; sg += hl; sb += hl * 1.02;

          const rim = 1 - nz;
          const rimk = rim * rim * rim * 105;
          const tt = 0.5 + 0.5 * nx; // pink on one edge, cyan on the other
          sr += rimk * (1 - tt * 0.6);
          sg += rimk * (0.5 + 0.5 * tt);
          sb += rimk;

          const gl = GL[i];
          if (gl > 0) {
            const tw = 0.3 + 2.2 * Math.max(0, sp - 0.55);
            const add = gl * tw * 120 * shade;
            sr += add; sg += add; sb += add;
          }

          const a = hh >= 2.2 ? 1 : hh / 2.2;
          if (a < 1) {
            r = tr * (1 - a) + sr * a;
            g = tg * (1 - a) + sg * a;
            b = tb * (1 - a) + sb * a;
          } else {
            r = sr; g = sg; b = sb;
          }
        }
        const o = i * 4;
        px[o] = r > 255 ? 255 : r < 0 ? 0 : r;
        px[o + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        px[o + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
        px[o + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, 0, 0, W, H);
    drawBubbles();
  }

  function drawBubbles() {
    const sx = W / GW, sy = H / GH;
    for (const b of bubbles) {
      const ratio = clamp(h[b.idx] / Math.max(T[b.idx], 0.01), 0, 1);
      if (ratio < 0.75) continue;
      const a = (ratio - 0.75) * 4;
      const x = b.gx * sx, y = b.gy * sy, r = b.r * sx;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0.45)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,50,140,0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x + 0.6, y + 0.6, r, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.4, Math.max(0.7, r * 0.22), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFinger(p) {
    fctx.clearRect(0, 0, W, H);
    if (!p) return;
    const g = fctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 19);
    g.addColorStop(0, 'rgba(255,224,214,0.5)');
    g.addColorStop(0.75, 'rgba(255,214,200,0.3)');
    g.addColorStop(1, 'rgba(255,214,200,0)');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(p.x, p.y, 19, 0, TAU);
    fctx.fill();
  }

  /* ---------- loop + input ---------- */
  let pointer = null; // { x, y, gx, gy, down, t0 }
  let smoothing = 0;
  let lastSquelch = 0;

  const loop = makeLoop((dt) => {
    const f = Math.min(2, dt / 16.667);
    if (pointer && pointer.down) press(pointer.gx, pointer.gy, 0.09 * f, 0, 0);
    const relax = (smoothing > 0 ? 0.22 : 0.014) * f;
    if (smoothing > 0) smoothing -= f;
    const maxd = dynamics(relax);
    render();
    return !!(pointer && pointer.down) || smoothing > 0 || maxd > 0.004;
  });

  const toGrid = (p) => ({ gx: (p.x / W) * GW, gy: (p.y / H) * GH });

  stack.addEventListener('pointerdown', (e) => {
    stack.setPointerCapture(e.pointerId);
    const p = main.toLocal(e);
    pointer = { ...p, ...toGrid(p), down: true, t0: performance.now() };
    api.audio.squelch(0.6);
    drawFinger(p);
    loop.kick();
  });

  stack.addEventListener('pointermove', (e) => {
    const p = main.toLocal(e);
    if (!pointer || !pointer.down) return;
    const g = toGrid(p);
    const dx = g.gx - pointer.gx, dy = g.gy - pointer.gy;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.3) {
      const steps = Math.ceil(dist / 2.5);
      for (let k = 1; k <= steps; k++) {
        press(pointer.gx + (dx * k) / steps, pointer.gy + (dy * k) / steps, 0.32, dx / dist, dy / dist);
      }
      const now = performance.now();
      if (now - lastSquelch > 100) {
        api.audio.squelch(dist / 6);
        lastSquelch = now;
      }
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.gx = g.gx;
    pointer.gy = g.gy;
    drawFinger(p);
    loop.kick();
  });

  const release = () => {
    if (!pointer) return;
    const held = performance.now() - pointer.t0;
    pointer = null;
    drawFinger(null);
    if (held > 250) api.audio.pop();
    loop.kick();
  };
  stack.addEventListener('pointerup', release);
  stack.addEventListener('pointercancel', release);

  smoothBtn.addEventListener('click', () => {
    smoothing = api.reducedMotion ? 4 : 28;
    api.audio.squelch(0.3);
    loop.kick();
  });

  loop.kick();
  return () => loop.stop();
}
