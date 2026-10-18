// Slow-rise kawaii panda bun. Press your finger *into* it: the foam dents and pinches the
// face around your fingertip, then slowly pushes back up when you let go.

import { TAU, clamp, rand, el, makeCanvas, makeLoop } from './wutil.js';

const BS = 1.75;                                  // render-buffer scale
const RX = 50, RY = 18, RWl = 220, RHl = 214;     // region on the canvas (logical px)
const BW = Math.round(RWl * BS), BH = Math.round(RHl * BS);
const CXl = 110, CYl = 118;                       // bun centre inside the region
const BRX = 90, BRY = 84;
const A = 15 * BS;                                // deepest dent (buffer px)
const SIG = 21 * BS;                              // dent radius
const KW = 13;                                    // how far the print slides into a dent
const SH = 1.9;                                   // dent steepness for shading

// Light from the top-left.
const LL = Math.hypot(-0.5, -0.62, 0.6);
const LX = -0.5 / LL, LY = -0.62 / LL, LZ = 0.6 / LL;

function paintBun(squeezed) {
  const cv = document.createElement('canvas');
  cv.width = BW;
  cv.height = BH;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(BS, 0, 0, BS, CXl * BS, CYl * BS);

  // ears
  g.fillStyle = '#2d2830';
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * 60, -62, 21, 0, TAU); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,.14)';
  [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(s * 56, -68, 9, 5, s * -0.5, 0, TAU); g.fill(); });

  // phone-strap loop
  g.strokeStyle = '#a9a3b3';
  g.lineWidth = 2.4;
  g.beginPath(); g.ellipse(0, -90, 5.5, 7, 0, 0, TAU); g.stroke();

  // body
  const body = g.createRadialGradient(-28, -40, 8, 0, 0, 130);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.5, '#fffaf2');
  body.addColorStop(1, '#eedfce');
  g.fillStyle = body;
  g.beginPath(); g.ellipse(0, 0, BRX, BRY, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(190,160,140,.4)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.6)';
  g.beginPath(); g.ellipse(-32, -52, 28, 12, -0.5, 0, TAU); g.fill();

  // eye patches
  g.fillStyle = '#2d2830';
  [[-1, 0.5], [1, -0.5]].forEach(([s, rot]) => {
    g.beginPath(); g.ellipse(s * 31, 6, 14.5, 20, rot, 0, TAU); g.fill();
  });
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (squeezed) {
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    [-1, 1].forEach((s) => {
      g.beginPath();
      g.moveTo(s * 37, -1);
      g.lineTo(s * 25, 6);
      g.lineTo(s * 37, 13);
      g.stroke();
    });
  } else {
    g.fillStyle = '#fff';
    [-1, 1].forEach((s) => {
      g.beginPath(); g.arc(s * 31, 6, 6.2, 0, TAU); g.fill();
      g.fillStyle = '#2d2830';
      g.beginPath(); g.arc(s * 31 + 0.4, 6.6, 4.1, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s * 31 - 1, 4.6, 1.5, 0, TAU); g.fill();
    });
  }
  // nose, mouth, blush
  g.fillStyle = '#2d2830';
  g.beginPath(); g.ellipse(0, 20, 6.5, 4.4, 0, 0, TAU); g.fill();
  g.strokeStyle = '#4a3a42';
  g.lineWidth = 1.8;
  g.beginPath(); g.arc(-4.5, 27, 4.5, 0.1 * Math.PI, 0.95 * Math.PI); g.stroke();
  g.beginPath(); g.arc(4.5, 27, 4.5, 0.05 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,128,165,.55)';
  [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(s * 56, 24, 10, 6, 0, 0, TAU); g.fill(); });

  // bow
  g.save();
  g.translate(48, -56);
  g.fillStyle = '#e8344f';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-16, -17, -21, -3); g.quadraticCurveTo(-18, 12, 0, 0); g.fill();
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(16, -17, 21, -3); g.quadraticCurveTo(18, 12, 0, 0); g.fill();
  g.fillStyle = '#c7243e';
  g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath(); g.ellipse(-11, -7, 4.5, 2, -0.5, 0, TAU); g.fill();
  g.restore();

  return g.getImageData(0, 0, BW, BH).data;
}

export function mountSquishy(root, api) {
  const W = 320, H = 270;
  const c = makeCanvas(W, H, 'A kawaii panda squishy bun. Press and hold to push your finger into it.');
  const { ctx } = c;
  const hint = el('p', 'widget-hint', 'press into it · let go and watch it slowly rise');
  root.append(c.canvas, hint);

  const sprites = [paintBun(false), paintBun(true)];
  const buf = document.createElement('canvas');
  buf.width = BW;
  buf.height = BH;
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(BW, BH);
  const out = img.data;

  const hf = new Float32Array(BW * BH); // dent height (negative = pushed in)
  let sq = 0;                           // 0..1 how squished it looks overall
  let face = 0;
  let ptr = null;                       // { bx, by, depth, t0 }

  function inBun(p) {
    const dx = (p.x - RX - CXl) / (BRX + 6), dy = (p.y - RY - CYl) / (BRY + 6);
    return dx * dx + dy * dy <= 1;
  }
  const toBuf = (p) => ({ bx: (p.x - RX) * BS, by: (p.y - RY) * BS });

  function press(bx, by, depth, rate) {
    const R = SIG * 3.1;
    const x0 = Math.max(1, Math.floor(bx - R)), x1 = Math.min(BW - 2, Math.ceil(bx + R));
    const y0 = Math.max(1, Math.floor(by - R)), y1 = Math.min(BH - 2, Math.ceil(by + R));
    const amp = A * depth;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - bx, dy = y - by;
        const r2 = dx * dx + dy * dy;
        if (r2 > R * R) continue;
        const q = Math.sqrt(r2) / SIG;
        const prof = -Math.exp(-q * q * 0.8);
        const target = amp * prof;
        const i = y * BW + x;
        const cur = hf[i];
        if (target < cur) hf[i] = cur + (target - cur) * rate;
      }
    }
  }

  function render() {
    const base = sprites[face];
    for (let y = 0; y < BH; y++) {
      for (let x = 0; x < BW; x++) {
        const i = y * BW + x;
        const o = i * 4;
        const hv = hf[i];
        let hx = 0, hy = 0;
        if (x > 0 && x < BW - 1 && y > 0 && y < BH - 1) {
          hx = (hf[i + 1] - hf[i - 1]) * 0.5;
          hy = (hf[i + BW] - hf[i - BW]) * 0.5;
        }
        if (hv === 0 && hx === 0 && hy === 0) {
          out[o] = base[o]; out[o + 1] = base[o + 1]; out[o + 2] = base[o + 2]; out[o + 3] = base[o + 3];
          continue;
        }
        // slide the print down the slope (pinches the face into the dent)
        const sx = x + hx * KW, sy = y + hy * KW;
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        if (x0 < 0 || y0 < 0 || x0 >= BW - 1 || y0 >= BH - 1) { out[o + 3] = 0; continue; }
        const fx = sx - x0, fy = sy - y0;
        const i00 = (y0 * BW + x0) * 4, i10 = i00 + 4, i01 = i00 + BW * 4, i11 = i01 + 4;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        const a00 = base[i00 + 3] * w00, a10 = base[i10 + 3] * w10, a01 = base[i01 + 3] * w01, a11 = base[i11 + 3] * w11;
        const a = a00 + a10 + a01 + a11;
        if (a < 0.5) { out[o + 3] = 0; continue; }
        let r = (base[i00] * a00 + base[i10] * a10 + base[i01] * a01 + base[i11] * a11) / a;
        let g = (base[i00 + 1] * a00 + base[i10 + 1] * a10 + base[i01 + 1] * a01 + base[i11 + 1] * a11) / a;
        let b = (base[i00 + 2] * a00 + base[i10 + 2] * a10 + base[i01 + 2] * a01 + base[i11 + 2] * a11) / a;
        // soft matte shading from the dent's normal + a little occlusion at the bottom
        const nzz = 1 / Math.sqrt(1 + (hx * SH) * (hx * SH) + (hy * SH) * (hy * SH));
        const dot = -hx * SH * nzz * LX - hy * SH * nzz * LY + nzz * LZ;
        let m = 1 + 1.0 * (dot - LZ);
        if (hv < 0) m *= 1 + 0.16 * (hv / A);
        m = m < 0.66 ? 0.66 : m > 1.12 ? 1.12 : m;
        r *= m;
        g *= m;
        b *= m < 1 ? m * 0.95 : m; // shadows lean a little warm
        out[o] = r > 255 ? 255 : r < 0 ? 0 : r;
        out[o + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        out[o + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
        out[o + 3] = a > 255 ? 255 : a;
      }
    }
    bctx.putImageData(img, 0, 0);
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fdeef6');
    bg.addColorStop(1, '#e6f4f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const table = ctx.createLinearGradient(0, 188, 0, H);
    table.addColorStop(0, '#f6dfcf');
    table.addColorStop(1, '#ecd0bf');
    ctx.fillStyle = table;
    ctx.fillRect(0, 188, W, H - 188);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, 188, W, 2);

    const cx = RX + CXl, bottom = RY + CYl + BRY;
    ctx.fillStyle = 'rgba(90,70,110,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, bottom + 3, (BRX + 4) * (1 + 0.04 * sq), 12, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, bottom);
    ctx.scale(1 + 0.035 * sq, 1 - 0.05 * sq);
    ctx.translate(-cx, -bottom);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, RX, RY, RWl, RHl);
    ctx.restore();

    if (ptr) {
      const px = RX + ptr.bx / BS, py = RY + ptr.by / BS;
      const g = ctx.createRadialGradient(px, py, 2, px, py, 17);
      g.addColorStop(0, 'rgba(255,224,214,0.5)');
      g.addColorStop(0.75, 'rgba(255,214,200,0.28)');
      g.addColorStop(1, 'rgba(255,214,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, 17, 0, TAU);
      ctx.fill();
    }
  }

  const loop = makeLoop((dt) => {
    const f = Math.min(2, dt / 16.667);
    if (ptr) {
      ptr.depth += (1 - ptr.depth) * 0.04 * f;
      press(ptr.bx, ptr.by, ptr.depth, Math.min(0.5, 0.2 * f));
    }
    // slow rise: a gentle exponential tail plus a steady linear push back up
    const e = 1 - 0.012 * f, lin = 0.12 * f;
    let lo = 0;
    for (let i = 0; i < hf.length; i++) {
      let v = hf[i];
      if (v === 0) continue;
      v *= e;
      if (v > lin) v -= lin; else if (v < -lin) v += lin; else v = 0;
      hf[i] = v;
      if (v < lo) lo = v;
    }
    sq = clamp(-lo / A, 0, 1);
    if (face === 0 && sq > 0.5) face = 1;
    else if (face === 1 && sq < 0.3) face = 0;
    render();
    draw();
    return !!ptr || lo < -0.02;
  });

  c.canvas.addEventListener('pointerdown', (e) => {
    const p = c.toLocal(e);
    if (!inBun(p)) return;
    c.canvas.setPointerCapture(e.pointerId);
    ptr = { ...toBuf(p), depth: 0.35 };
    api.audio.squeak(0.85 + rand(0, 0.3));
    loop.kick();
  });
  c.canvas.addEventListener('pointermove', (e) => {
    if (!ptr) return;
    const n = toBuf(c.toLocal(e));
    const dx = n.bx - ptr.bx, dy = n.by - ptr.by;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / (SIG * 0.15));
    for (let k = 1; k <= steps; k++) press(ptr.bx + (dx * k) / steps, ptr.by + (dy * k) / steps, ptr.depth, 0.6);
    ptr.bx = n.bx;
    ptr.by = n.by;
    loop.kick();
  });
  const release = () => {
    if (!ptr) return;
    ptr = null;
    api.audio.squeak(1.25);
    loop.kick();
  };
  c.canvas.addEventListener('pointerup', release);
  c.canvas.addEventListener('pointercancel', release);

  render();
  draw();
  return () => loop.stop();
}
