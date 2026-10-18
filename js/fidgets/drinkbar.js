// The drink bar: Unicorn Frappe (pour -> whipped cream -> glitter) and
// Pink Drink (pour -> strawberries -> ice + stir).

import { TAU, clamp, rand, pick, el, makeButton, makeCanvas, makeLoop, star } from './wutil.js';

const W = 320, H = 300, CX = 160, TOPY = 100, BOTY = 272, TW = 72, BWH = 50;

const RECIPES = {
  unicorn: {
    label: 'unicorn frappe',
    hints: {
      1: '1/3 · press & hold to pour the swirl',
      2: '2/3 · tap to whip the cream',
      3: '3/3 · drag to sprinkle glitter ✨',
    },
    a: [247, 168, 207], b: [155, 209, 247],
  },
  pink: {
    label: 'pink drink',
    hints: {
      1: '1/3 · press & hold to pour the pink base',
      2: '2/3 · tap to drop in strawberries \u{1F353}',
      3: '3/3 · tap for ice · drag to stir',
    },
    a: [255, 160, 196], b: [255, 218, 232],
  },
};

const mix = (a, b, t) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

// Half-width of the cup interior at height y.
const halfWidthAt = (y) => TW + (BWH - TW) * clamp((y - TOPY) / (BOTY - TOPY), 0, 1);

function drawBerry(g, x, y, size, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(size / 20, size / 20);
  const heart = (k) => {
    g.beginPath();
    g.moveTo(0, 16 * k);
    g.bezierCurveTo(-18 * k, 6 * k, -16 * k, -12 * k, 0, -8 * k);
    g.bezierCurveTo(16 * k, -12 * k, 18 * k, 6 * k, 0, 16 * k);
    g.closePath();
  };
  g.fillStyle = '#ff4f6e';
  heart(1);
  g.fill();
  g.fillStyle = '#ff9bb0';
  heart(0.68);
  g.fill();
  g.fillStyle = '#ffe9a8';
  [[-5, 2], [5, 2], [0, 7], [-3, -2], [3, -2]].forEach(([sx, sy]) => {
    g.beginPath(); g.ellipse(sx, sy, 0.9, 1.4, 0, 0, TAU); g.fill();
  });
  g.fillStyle = '#5fbf72';
  g.beginPath();
  g.moveTo(-6, -8); g.lineTo(0, -14); g.lineTo(6, -8); g.lineTo(0, -10); g.closePath();
  g.fill();
  g.restore();
}

function drawIce(g, x, y, size, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.strokeStyle = 'rgba(190,220,242,0.95)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-size / 2, -size / 2, size, size, 5);
  g.fill();
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-size / 2 + 4, -size / 2 + 4);
  g.lineTo(-size / 2 + 4, 0);
  g.stroke();
  g.restore();
}

export function mountDrinkBar(root, api) {
  const c = makeCanvas(W, H, 'Drink bar. Hold to pour, then add toppings.');
  const { ctx } = c;
  const chips = el('div', 'chips');
  const hint = el('p', 'widget-hint');
  const again = makeButton('new drink');
  root.append(chips, c.canvas, hint, again);

  const CUP = new Path2D();
  CUP.moveTo(CX - TW, TOPY);
  CUP.lineTo(CX + TW, TOPY);
  CUP.lineTo(CX + BWH, BOTY);
  CUP.quadraticCurveTo(CX, BOTY + 12, CX - BWH, BOTY);
  CUP.closePath();

  let recipe = 'unicorn';
  let step = 1, level = 0, pouring = false, stopPour = null;
  let cream = 0, whipping = false, phase = 0, lastChime = 0, lastDraw = 0;
  let sparkles = [];
  let items = [];       // pink drink: strawberries + ice
  let berryCount = 0, iceCount = 0;
  let down = null;      // { moved, lastX, t }
  let lastStir = 0;

  const setStep = (n) => { step = n; hint.textContent = RECIPES[recipe].hints[n]; };

  const chipEls = {};
  Object.entries(RECIPES).forEach(([key, r]) => {
    const b = makeButton(r.label, 'chip');
    b.addEventListener('click', () => { recipe = key; reset(); mark(); });
    chipEls[key] = b;
    chips.append(b);
  });
  const mark = () => Object.entries(chipEls).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === recipe)));

  const liquidTop = () => BOTY + 6 - level * (BOTY - TOPY - 10);

  function strawSegment(y0, y1) {
    const xAt = (y) => 176 - (y - 14) * (26 / 224);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ff9fc2';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(xAt(y0), y0);
    ctx.lineTo(xAt(y1), y1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.setLineDash([7, 9]);
    ctx.stroke();
    ctx.restore();
  }

  function drawCream(p) {
    for (let k = 0; k < 3; k++) {
      const local = clamp((p - k / 3) * 3, 0, 1);
      if (local <= 0) continue;
      const cy = TOPY - 8 - k * 17;
      const rx = (78 - k * 20) * local;
      const ry = (15 - k * 1.5) * local;
      ctx.fillStyle = '#fffdf8';
      ctx.strokeStyle = 'rgba(214,176,196,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(CX, cy, rx, ry + 3, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(214,176,196,0.6)';
      ctx.beginPath();
      ctx.ellipse(CX, cy + 1, rx * 0.78, ry * 0.6, 0, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
    const tip = clamp((p - 0.85) / 0.15, 0, 1);
    if (tip > 0) {
      const base = TOPY - 8 - 2 * 17 - 6;
      ctx.fillStyle = '#fffdf8';
      ctx.strokeStyle = 'rgba(214,176,196,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 13 * tip, base);
      ctx.quadraticCurveTo(CX - 2, base - 6 * tip, CX + 5 * tip, base - 24 * tip);
      ctx.quadraticCurveTo(CX + 7, base - 8 * tip, CX + 13 * tip, base);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawItem(it, t) {
    const bob = it.landed && it.k === 'i' ? Math.sin(t * 0.002 + it.ph) * 1.5 : 0;
    if (it.k === 's') drawBerry(ctx, it.x, it.y + bob, it.size, it.rot);
    else drawIce(ctx, it.x, it.y + bob, it.size, it.rot);
  }

  function draw(t) {
    const R = RECIPES[recipe];
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fdeef6');
    bg.addColorStop(1, '#e6f4f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(90,70,110,0.15)';
    ctx.beginPath();
    ctx.ellipse(CX, BOTY + 14, 70, 9, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill(CUP);
    strawSegment(100, 238);

    const topLiq = liquidTop();
    ctx.save();
    ctx.clip(CUP);
    if (level > 0) {
      for (let y = topLiq; y < BOTY + 16; y += 4) {
        let m = 0.5 + 0.5 * Math.sin(y * 0.075 + phase);
        if (recipe === 'pink') m = clamp(0.35 + 0.65 * (1 - (y - topLiq) / 120) * 0.6 + 0.2 * m, 0, 1);
        ctx.fillStyle = mix(R.a, R.b, m);
        ctx.beginPath();
        ctx.moveTo(CX - TW - 6, y);
        for (let x = CX - TW - 6; x <= CX + TW + 6; x += 10) {
          ctx.lineTo(x, y + Math.sin(x * 0.07 + y * 0.06 + phase) * 3.5);
        }
        ctx.lineTo(CX + TW + 6, BOTY + 24);
        ctx.lineTo(CX - TW - 6, BOTY + 24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = CX - TW - 6; x <= CX + TW + 6; x += 10) {
        const yy = topLiq + Math.sin(x * 0.07 + topLiq * 0.06 + phase) * 3.5;
        if (x === CX - TW - 6) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // things floating in the drink
    items.forEach((it) => { if (it.landed) drawItem(it, t); });
    ctx.restore();

    if (pouring && step === 1) {
      const g = ctx.createLinearGradient(0, 8, 0, topLiq);
      g.addColorStop(0, mix(R.a, R.b, 0.5 + 0.5 * Math.sin(phase)));
      g.addColorStop(1, mix(R.b, R.a, 0.5 + 0.5 * Math.sin(phase)));
      ctx.strokeStyle = g;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(CX, 8);
      ctx.lineTo(CX, topLiq);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(168,148,200,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke(CUP);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX - TW + 9, TOPY + 12);
    ctx.lineTo(CX - BWH + 8, BOTY - 14);
    ctx.stroke();

    if (cream > 0) drawCream(cream);
    strawSegment(14, 100);

    // falling toppings (above the liquid)
    items.forEach((it) => { if (!it.landed) drawItem(it, t); });

    sparkles.forEach((s) => {
      ctx.globalAlpha = api.reducedMotion ? 0.9 : 0.55 + 0.45 * Math.sin(t * 0.004 + s.ph);
      ctx.fillStyle = s.c;
      star(ctx, s.x, s.y, s.s);
    });
    ctx.globalAlpha = 1;
  }

  function endPour() {
    if (stopPour) { stopPour(); stopPour = null; }
    pouring = false;
  }

  const loop = makeLoop((dt, t) => {
    const f = dt / 16.667;
    let cont = false;
    const busy = (pouring && step === 1) || whipping;

    if (pouring && step === 1) {
      level = Math.min(1, level + 0.0042 * f);
      phase += 0.07 * f;
      cont = true;
      if (level >= 1) { endPour(); setStep(2); }
    }
    if (whipping) {
      cream = Math.min(1, cream + dt / 700);
      cont = true;
      if (cream >= 1) { whipping = false; setStep(3); }
    }

    // toppings: fall, splash, then float / sink gently
    let moving = false;
    for (const it of items) {
      const top = liquidTop();
      if (!it.landed) {
        it.vy += 0.35 * f;
        it.y += it.vy * f;
        it.rot += it.vr * f;
        moving = true;
        if (it.y >= top - 4) {
          it.landed = true;
          it.ty = it.k === 'i' ? top + rand(2, 16) : top + rand(10, 70);
          it.ty = Math.min(it.ty, BOTY - 24);
          it.vr *= 0.3;
          if (it.k === 'i') api.audio.clink(); else api.audio.plop();
        }
      } else {
        it.y += (it.ty - it.y) * 0.04 * f;
        it.x += it.vx * f;
        it.vx *= Math.pow(0.94, f);
        it.rot += it.vr * f;
        it.vr *= Math.pow(0.97, f);
        const lim = halfWidthAt(it.y) - it.size * 0.55 - 3;
        it.x = clamp(it.x, CX - lim, CX + lim);
        if (Math.abs(it.ty - it.y) > 0.3 || Math.abs(it.vx) > 0.05 || Math.abs(it.vr) > 0.003 || it.k === 'i') moving = true;
      }
    }
    if (moving && !api.reducedMotion) cont = true;
    if (items.some((it) => !it.landed)) cont = true;
    if (sparkles.length && !api.reducedMotion) cont = true;

    if (!busy && cont && t - lastDraw < 33) return true;
    lastDraw = t;
    draw(t);
    return cont;
  });

  function sprinkle(p) {
    if (p.x < CX - TW - 15 || p.x > CX + TW + 15 || p.y < 10 || p.y > BOTY + 10) return;
    for (let i = 0; i < 3; i++) {
      sparkles.push({
        x: p.x + rand(-14, 14), y: p.y + rand(-14, 14),
        c: pick(['#f7a8cf', '#9bd1f7', '#ffffff', '#d9c2f5']),
        s: rand(2, 4.5), ph: rand(0, TAU),
      });
    }
    if (sparkles.length > 220) sparkles.splice(0, sparkles.length - 220);
    const now = performance.now();
    if (now - lastChime > 100) {
      api.audio.chime(Math.floor(rand(0, 6)));
      lastChime = now;
    }
    loop.kick();
  }

  function addTopping(kind) {
    if (items.length > 14) return;
    items.push({
      k: kind,
      x: CX + rand(-38, 38), y: 14, vy: 0, vx: 0,
      rot: rand(0, TAU), vr: rand(-0.12, 0.12),
      size: kind === 's' ? rand(17, 22) : rand(19, 23),
      ph: rand(0, TAU), landed: false, ty: 0,
    });
    loop.kick();
  }

  function stir(dx) {
    phase += Math.abs(dx) * 0.03;
    items.forEach((it) => { if (it.landed) { it.vx += dx * 0.06; it.vr += dx * 0.002; } });
    const now = performance.now();
    if (now - lastStir > 160) { api.audio.squelch(0.2); lastStir = now; }
    loop.kick();
  }

  c.canvas.addEventListener('pointerdown', (e) => {
    c.canvas.setPointerCapture(e.pointerId);
    const p = c.toLocal(e);
    down = { moved: 0, lastX: p.x };
    if (step === 1) {
      pouring = true;
      stopPour = api.audio.pourStart();
      loop.kick();
    } else if (recipe === 'unicorn') {
      if (step === 2 && !whipping) {
        whipping = true;
        api.audio.whip();
        loop.kick();
      }
    } else if (step === 2) {
      addTopping('s');
      berryCount++;
      if (berryCount >= 3) setStep(3);
    }
  });

  c.canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const p = c.toLocal(e);
    const dx = p.x - down.lastX;
    down.moved += Math.abs(dx);
    down.lastX = p.x;
    if (step === 3 && recipe === 'unicorn') sprinkle(p);
    else if (step === 3 && recipe === 'pink' && down.moved > 6) stir(dx);
  });

  const up = () => {
    endPour();
    if (down && step === 3 && recipe === 'pink' && down.moved <= 6 && iceCount < 4) {
      addTopping('i');
      iceCount++;
    }
    if (down && step === 3 && recipe === 'unicorn' && down.moved <= 6) { /* sprinkle handled on down below */ }
    down = null;
    loop.kick();
  };
  // unicorn: a plain tap should also drop some glitter
  c.canvas.addEventListener('pointerdown', (e) => {
    if (step === 3 && recipe === 'unicorn') sprinkle(c.toLocal(e));
  });
  c.canvas.addEventListener('pointerup', up);
  c.canvas.addEventListener('pointercancel', up);

  function reset() {
    endPour();
    level = 0; cream = 0; whipping = false; sparkles = []; items = [];
    berryCount = 0; iceCount = 0; down = null;
    setStep(1);
    loop.kick();
  }
  again.addEventListener('click', reset);

  mark();
  setStep(1);
  loop.kick();
  return () => { endPour(); loop.stop(); };
}
