import { TAU, clamp, rand, el, makeButton, makeCanvas, makeLoop, normAngle } from './wutil.js';

const COLORS = {
  galaxy: { label: 'galaxy', stops: [[0, '#25135e'], [0.5, '#9a45d8'], [1, '#3cd0e0']], stars: true },
  chrome: { label: 'chrome', stops: [[0, '#aeb4c4'], [0.5, '#f7f9fc'], [1, '#9aa1b3']] },
};

export function mountSpinner(root, api) {
  const W = 320, H = 260, CX = 160, CY = 126;
  const S = 230, LD = 58, LR = 30;
  const c = makeCanvas(W, H, 'Fidget spinner. Drag or flick to spin it.');
  const { ctx } = c;
  const stats = el('p', 'widget-stats', 'give it a flick');
  const chips = el('div', 'chips');
  const hint = el('p', 'widget-hint', 'drag it around, let go, watch it whirr');
  root.append(c.canvas, stats, chips, hint);

  const sprites = new Map();
  let colorKey = 'galaxy';

  function makeSprite(key) {
    const pal = COLORS[key];
    const dpr = c.dpr;
    const o = document.createElement('canvas');
    o.width = o.height = Math.ceil(S * dpr);
    const g = o.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(S / 2, S / 2);
    const lobes = [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 + (i * TAU) / 3;
      return { x: Math.cos(a) * LD, y: Math.sin(a) * LD };
    });

    g.fillStyle = '#000';
    g.strokeStyle = '#000';
    g.beginPath();
    g.arc(0, 0, 30, 0, TAU);
    lobes.forEach((l) => { g.moveTo(l.x + LR, l.y); g.arc(l.x, l.y, LR, 0, TAU); });
    g.fill();
    g.lineWidth = 40;
    g.lineCap = 'round';
    lobes.forEach((l) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(l.x, l.y); g.stroke(); });

    g.globalCompositeOperation = 'source-in';
    const grad = g.createLinearGradient(-90, -90, 90, 90);
    pal.stops.forEach(([p, col]) => grad.addColorStop(p, col));
    g.fillStyle = grad;
    g.fillRect(-S / 2, -S / 2, S, S);

    g.globalCompositeOperation = 'source-atop';
    if (pal.stars) {
      for (let i = 0; i < 70; i++) {
        g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
        g.beginPath();
        g.arc(rand(-90, 90), rand(-90, 90), rand(0.5, 1.6), 0, TAU);
        g.fill();
      }
    }
    const hi = g.createRadialGradient(-30, -40, 10, 0, 0, 120);
    hi.addColorStop(0, 'rgba(255,255,255,0.5)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi;
    g.fillRect(-S / 2, -S / 2, S, S);
    const lo = g.createLinearGradient(0, -40, 0, 100);
    lo.addColorStop(0, 'rgba(60,30,100,0)');
    lo.addColorStop(1, 'rgba(60,30,100,0.25)');
    g.fillStyle = lo;
    g.fillRect(-S / 2, -S / 2, S, S);

    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    lobes.forEach((l) => { g.beginPath(); g.arc(l.x, l.y, 14, 0, TAU); g.fill(); });

    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 2;
    lobes.forEach((l) => { g.beginPath(); g.arc(l.x, l.y, 14.5, 0, TAU); g.stroke(); });
    g.strokeStyle = 'rgba(70,40,110,0.25)';
    g.lineWidth = 1;
    lobes.forEach((l) => { g.beginPath(); g.arc(l.x, l.y, 13.5, 0.2, Math.PI - 0.2); g.stroke(); });

    // bearing
    const metal = g.createRadialGradient(-5, -6, 2, 0, 0, 18);
    metal.addColorStop(0, '#fbfbfe');
    metal.addColorStop(1, '#8c90a4');
    g.fillStyle = metal;
    g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,60,90,0.35)';
    g.lineWidth = 1;
    g.stroke();
    const cap = g.createRadialGradient(-3, -3, 1, 0, 0, 9);
    cap.addColorStop(0, '#ffffff');
    cap.addColorStop(1, '#bcc0d2');
    g.fillStyle = cap;
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();

    // soft drop shadow sprite
    const sh = document.createElement('canvas');
    sh.width = sh.height = o.width;
    const sg = sh.getContext('2d');
    sg.drawImage(o, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = '#3b2a55';
    sg.fillRect(0, 0, sh.width, sh.height);
    const blur = document.createElement('canvas');
    blur.width = blur.height = o.width;
    const bg = blur.getContext('2d');
    bg.filter = `blur(${5 * dpr}px)`;
    bg.drawImage(sh, 0, 0);

    return { body: o, shadow: blur };
  }

  function sprite() {
    if (!sprites.has(colorKey)) sprites.set(colorKey, makeSprite(colorKey));
    return sprites.get(colorKey);
  }

  const chipEls = {};
  Object.entries(COLORS).forEach(([key, pal]) => {
    const b = makeButton(pal.label, 'chip');
    b.addEventListener('click', () => { colorKey = key; mark(); loop.kick(); });
    chipEls[key] = b;
    chips.append(b);
  });
  const mark = () => Object.entries(chipEls).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === colorKey)));
  mark();

  let angle = rand(0, TAU), omega = 0;
  let grabbing = false, lastAng = 0, lastT = 0;
  let whirr = null;
  let spinStart = null, best = 0, lastLobe = 0;

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fdeef6');
    bg.addColorStop(1, '#e6f4f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const sp = sprite();
    const w = Math.abs(omega);

    ctx.save();
    ctx.translate(CX + 7, CY + 11);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sp.shadow, -S / 2, -S / 2, S, S);
    ctx.restore();

    if (w > 0.1) {
      const n = Math.min(7, Math.floor(w * 14));
      for (let k = 1; k <= n; k++) {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle - Math.sign(omega) * w * k * 0.55);
        ctx.globalAlpha = 0.16 * (1 - k / (n + 1));
        ctx.drawImage(sp.body, -S / 2, -S / 2, S, S);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.globalAlpha = w > 0.35 ? 0.75 : 1;
    ctx.drawImage(sp.body, -S / 2, -S / 2, S, S);
    ctx.restore();
  }

  function finishSpin() {
    if (spinStart != null) {
      const secs = (performance.now() - spinStart) / 1000;
      best = Math.max(best, secs);
      stats.textContent = `last spin ${secs.toFixed(1)}s · best ${best.toFixed(1)}s`;
      spinStart = null;
    }
  }

  const loop = makeLoop((dt) => {
    const f = dt / 16.667;
    if (!grabbing) {
      omega *= Math.pow(0.9968, f);
      omega -= Math.sign(omega) * 0.00004 * f;
      if (Math.abs(omega) < 0.0035) {
        omega = 0;
        finishSpin();
      }
      angle += omega * f;
    }
    const lobe = Math.floor(angle / (TAU / 3));
    if (lobe !== lastLobe) {
      lastLobe = lobe;
      if (Math.abs(omega) < 0.18 && Math.abs(omega) > 0.01) api.audio.tick();
    }
    if (whirr) {
      const sp = clamp(Math.abs(omega) / 0.6, 0, 1);
      whirr.set(sp);
      if (sp === 0) { whirr.stop(); whirr = null; }
    }
    draw();
    return grabbing || Math.abs(omega) > 0.0035;
  });

  const ang = (p) => Math.atan2(p.y - CY, p.x - CX);

  c.canvas.addEventListener('pointerdown', (e) => {
    c.canvas.setPointerCapture(e.pointerId);
    const p = c.toLocal(e);
    grabbing = true;
    omega = 0;
    spinStart = null;
    lastAng = ang(p);
    lastT = performance.now();
    loop.kick();
  });
  c.canvas.addEventListener('pointermove', (e) => {
    if (!grabbing) return;
    const p = c.toLocal(e);
    if (Math.hypot(p.x - CX, p.y - CY) < 25) return;
    const a = ang(p);
    const now = performance.now();
    const d = normAngle(a - lastAng);
    angle += d;
    const inst = (d / Math.max(4, now - lastT)) * 16.667;
    omega = clamp(omega * 0.5 + inst * 0.5, -0.9, 0.9);
    lastAng = a;
    lastT = now;
    if (!whirr && Math.abs(omega) > 0.02) whirr = api.audio.whirrStart();
    loop.kick();
  });
  const release = () => {
    if (!grabbing) return;
    grabbing = false;
    if (performance.now() - lastT > 90) omega = 0;
    if (Math.abs(omega) > 0.08) spinStart = performance.now();
    if (!whirr && Math.abs(omega) > 0.02) whirr = api.audio.whirrStart();
    loop.kick();
  };
  c.canvas.addEventListener('pointerup', release);
  c.canvas.addEventListener('pointercancel', release);

  draw();
  return () => {
    loop.stop();
    if (whirr) whirr.stop();
  };
}
