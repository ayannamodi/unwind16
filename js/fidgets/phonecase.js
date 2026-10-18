// Liquid-glitter phone case: a galaxy nebula full of glitter sloshing behind clear glass.
// Drag to stir; the glitter settles slowly.

import { TAU, clamp, rand, pick, el, makeCanvas, makeLoop, star } from './wutil.js';

export function mountPhoneCase(root, api) {
  const W = 320, H = 336;
  // outer case, inner liquid chamber, camera island
  const PX0 = 86, PX1 = 234, PY0 = 12, PY1 = 322, PR = 32;
  const INS = 10;
  const IX0 = PX0 + INS, IX1 = PX1 - INS, IY0 = PY0 + INS, IY1 = PY1 - INS, IR = PR - INS;
  const CAMW = 54, CAMH = 58;
  const c = makeCanvas(W, H, 'A liquid glitter phone case. Drag to swirl the glitter around.');
  const { ctx } = c;
  const hint = el('p', 'widget-hint', 'drag to stir the glitter · watch it settle');
  root.append(c.canvas, hint);

  const OUTER = new Path2D();
  OUTER.roundRect(PX0, PY0, PX1 - PX0, PY1 - PY0, PR);
  const CHAMBER = new Path2D();
  CHAMBER.roundRect(IX0, IY0, IX1 - IX0, IY1 - IY0, IR);
  const RING = new Path2D();
  RING.roundRect(PX0, PY0, PX1 - PX0, PY1 - PY0, PR);
  RING.roundRect(IX0, IY0, IX1 - IX0, IY1 - IY0, IR);

  const inCam = (x, y) => x < IX0 + CAMW && y < IY0 + CAMH;

  const COLORS = ['#ff9ee0', '#9fd8ff', '#ffe9a6', '#ffffff', '#c9a6ff', '#7ef0e0'];
  const N = 320;
  const parts = Array.from({ length: N }, () => {
    let x, y;
    do { x = rand(IX0, IX1); y = rand(IY0, IY1 - 80); } while (inCam(x, y));
    return {
      x, y,
      vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
      rot: rand(0, TAU), vrot: rand(-0.05, 0.05),
      s: rand(1.2, 3.6), c: pick(COLORS), fl: IY1 - rand(0, 18),
    };
  });
  const stars = Array.from({ length: 60 }, () => ({ x: rand(IX0, IX1), y: rand(IY0, IY1), ph: rand(0, TAU) }));
  const NEB = [
    { x: 130, y: 90, r: 110, c: '138,63,252', a: 0.6, sp: 0.7, ph: 0 },
    { x: 200, y: 140, r: 100, c: '255,79,216', a: 0.45, sp: 0.9, ph: 1.7 },
    { x: 140, y: 215, r: 115, c: '49,214,232', a: 0.42, sp: 0.6, ph: 3.1 },
    { x: 195, y: 268, r: 95, c: '59,91,255', a: 0.45, sp: 1.1, ph: 4.4 },
    { x: 150, y: 60, r: 80, c: '255,179,240', a: 0.28, sp: 0.8, ph: 5.5 },
  ];

  let phase = 0, agit = 0, agitS = 0, pointer = null, lastChime = 0;

  function drawCameraIsland() {
    const x = IX0, y = IY0;
    const g = ctx.createLinearGradient(x, y, x + CAMW, y + CAMH);
    g.addColorStop(0, '#f7dcd8');
    g.addColorStop(1, '#e8bdb8');
    const p = new Path2D();
    p.roundRect(x, y, CAMW, CAMH, [IR, 16, 16, 16]);
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke(p);
    ctx.strokeStyle = 'rgba(150,100,110,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke(p);
    // lens
    const lx = x + 19, ly = y + 20;
    const ring = ctx.createRadialGradient(lx - 2, ly - 2, 1, lx, ly, 12);
    ring.addColorStop(0, '#e9e2ea');
    ring.addColorStop(1, '#a89fae');
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(lx, ly, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1a24';
    ctx.beginPath(); ctx.arc(lx, ly, 8.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4d8f';
    ctx.beginPath(); ctx.arc(lx, ly, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(lx - 2.6, ly - 3, 1.7, 0, TAU); ctx.fill();
    // flash + mic
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath(); ctx.arc(x + 41, y + 16, 4.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,100,0.55)';
    ctx.beginPath(); ctx.arc(x + 41, y + 30, 1.7, 0, TAU); ctx.fill();
  }

  function draw(t) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fdeef6');
    bg.addColorStop(1, '#e6f4f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(90,70,110,0.16)';
    ctx.beginPath();
    ctx.ellipse(160, PY1 + 8, 86, 8, 0, 0, TAU);
    ctx.fill();

    // side buttons
    ctx.fillStyle = '#f2cfd4';
    ctx.beginPath(); ctx.roundRect(PX0 - 4, 92, 5, 26, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(PX0 - 4, 126, 5, 26, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(PX1 - 1, 104, 5, 38, 2); ctx.fill();

    // case shell (clear, pale pink tint)
    const shell = ctx.createLinearGradient(PX0, PY0, PX1, PY1);
    shell.addColorStop(0, 'rgba(255,255,255,0.9)');
    shell.addColorStop(1, 'rgba(250,208,226,0.9)');
    ctx.fillStyle = shell;
    ctx.fill(RING, 'evenodd');

    ctx.save();
    ctx.clip(CHAMBER);
    const base = ctx.createLinearGradient(0, IY0, 0, IY1);
    base.addColorStop(0, '#1d1250');
    base.addColorStop(1, '#3a1a6e');
    ctx.fillStyle = base;
    ctx.fillRect(IX0, IY0, IX1 - IX0, IY1 - IY0);
    NEB.forEach((b) => {
      const ox = Math.sin(phase * b.sp + b.ph) * (14 + 50 * agitS);
      const oy = Math.cos(phase * b.sp * 0.8 + b.ph) * (10 + 40 * agitS);
      const g = ctx.createRadialGradient(b.x + ox, b.y + oy, 0, b.x + ox, b.y + oy, b.r);
      g.addColorStop(0, `rgba(${b.c},${b.a})`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(IX0, IY0, IX1 - IX0, IY1 - IY0);
    });
    ctx.fillStyle = '#fff';
    stars.forEach((s, i) => {
      ctx.globalAlpha = api.reducedMotion ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 0.002 + s.ph + i));
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.9, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    parts.forEach((p) => {
      ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.cos(p.rot));
      ctx.fillStyle = p.c;
      if (p.s > 2.6) star(ctx, p.x, p.y, p.s * 1.4);
      else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    drawCameraIsland();

    // glass edges + glare
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke(CHAMBER);
    ctx.strokeStyle = 'rgba(170,130,170,0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke(OUTER);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(IX0 + 9, IY0 + 74, 8, IY1 - IY0 - 130, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(IX1 - 18, IY0 + 30, 4, IY1 - IY0 - 90, 2);
    ctx.fill();
  }

  const loop = makeLoop((dt, t) => {
    const f = dt / 16.667;
    let sum = 0;
    const damp = Math.pow(0.987, f);
    for (const p of parts) {
      if (pointer && pointer.down) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 80) {
          const fall = (1 - d / 80) ** 2;
          const inv = 1 / (d || 1);
          p.vx += pointer.vx * 0.22 * fall * f - dy * inv * 0.05 * fall * f;
          p.vy += pointer.vy * 0.22 * fall * f + dx * inv * 0.05 * fall * f;
        }
      }
      p.vy += (0.0025 + p.s * 0.0012) * f;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * f;
      p.y += p.vy * f;
      if (p.x < IX0) { p.x = IX0; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > IX1) { p.x = IX1; p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < IY0) { p.y = IY0; p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > p.fl) { p.y = p.fl; p.vy = -Math.abs(p.vy) * 0.2; }
      // keep glitter out from under the camera island
      if (inCam(p.x, p.y)) {
        const px = IX0 + CAMW - p.x, py = IY0 + CAMH - p.y;
        if (px < py) { p.x = IX0 + CAMW; p.vx = Math.abs(p.vx) * 0.5; }
        else { p.y = IY0 + CAMH; p.vy = Math.abs(p.vy) * 0.5; }
      }
      const sp = Math.hypot(p.vx, p.vy);
      p.vrot = 0.02 + sp * 0.25;
      p.rot += p.vrot * f;
      sum += sp;
    }
    agit = sum / N;
    agitS += (clamp(agit * 3, 0, 1) - agitS) * 0.08 * f;
    phase += (0.004 + agit * 0.05) * f;
    if (pointer) { pointer.vx *= 0.8; pointer.vy *= 0.8; }

    const now = performance.now();
    if (pointer && pointer.down && agit > 0.3 && now - lastChime > 280) {
      api.audio.chime(Math.floor(rand(0, 6)));
      lastChime = now;
    }
    draw(t);
    return !!(pointer && pointer.down) || agit > 0.012;
  });

  c.canvas.addEventListener('pointerdown', (e) => {
    c.canvas.setPointerCapture(e.pointerId);
    const p = c.toLocal(e);
    pointer = { x: p.x, y: p.y, vx: 0, vy: 0, down: true, t: performance.now() };
    loop.kick();
  });
  c.canvas.addEventListener('pointermove', (e) => {
    if (!pointer || !pointer.down) return;
    const p = c.toLocal(e);
    const now = performance.now();
    const k = 16.667 / Math.max(8, now - pointer.t);
    pointer.vx = clamp((p.x - pointer.x) * k, -14, 14);
    pointer.vy = clamp((p.y - pointer.y) * k, -14, 14);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.t = now;
    loop.kick();
  });
  const release = () => { if (pointer) pointer.down = false; loop.kick(); };
  c.canvas.addEventListener('pointerup', release);
  c.canvas.addEventListener('pointercancel', release);

  loop.kick();
  return () => loop.stop();
}
