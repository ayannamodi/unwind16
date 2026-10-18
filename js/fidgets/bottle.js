import { TAU, clamp, rand, pick, el, makeButton, makeCanvas, makeLoop } from './wutil.js';

export function mountBottle(root, api) {
  const W = 320, H = 300, TABLE = 262, BW = 34, BH = 92;
  const G = 0.5;                  // gravity, px / frame^2
  const STAND_TOLERANCE = 18;     // degrees from upright that still counts as standing
  const WOBBLE_TOLERANCE = 36;    // near misses wobble, and sometimes stand anyway
  const CAP_TOLERANCE = 8;        // landing upside-down on the cap = bonus
  const REST_Y = TABLE - BH / 2;
  const LIE_Y = TABLE - BW / 2;

  const c = makeCanvas(W, H, 'Water bottle flip arena. Flick upward to launch the bottle.');
  const { ctx } = c;
  const stats = el('p', 'widget-stats');
  const hint = el('p', 'widget-hint');
  const row = el('div', 'chips');
  const aimBtn = makeButton('aim assist: on');
  const resetBtn = makeButton('stand it back up');
  resetBtn.hidden = true;
  row.append(aimBtn, resetBtn);
  root.append(c.canvas, stats, hint, row);

  // idle | flying | settling | wobble | tipping | tipped
  let mode = 'idle';
  let x = W / 2, y = REST_Y, vy = 0, angle = 0, omega = 0, spring = 0, base = 0;
  let tipFrom = 0, tipTo = 0, tipT = 0;
  let wobT = 0, wobDev = 0, wobStand = false;
  let slosh = 0, sloshV = 0;
  let drag = null;
  let landed = 0, streak = 0, best = 0, capFlips = 0;
  let aimAssist = true;
  let particles = [];
  const COLORS = ['#f7a8cf', '#9bd1f7', '#cdb4f6', '#bfe8d3', '#ffd6b8', '#f3cf8e'];

  const IDLE_HINT = 'flick the bottle upward — faster swipe = more spin (flick left for a backflip)';
  const setHint = (t) => { hint.textContent = t; };
  const updateStats = () => {
    stats.textContent = `landed ${landed} · streak ${streak} · best ${best} · cap flips ${capFlips}`;
  };
  setHint(IDLE_HINT);
  updateStats();

  const normalize = (a) => ((((a % 360) + 540) % 360) - 180);

  function burst(mult = 1) {
    const n = Math.round((api.reducedMotion ? 10 : 38) * mult);
    for (let i = 0; i < n; i++) {
      particles.push({
        x: W / 2 + rand(-10, 10), y: REST_Y - 30,
        vx: rand(-3.4, 3.4) * Math.sqrt(mult), vy: rand(-8.5, -3) * Math.sqrt(mult),
        r: rand(0, TAU), vr: rand(-0.3, 0.3),
        w: rand(4, 8), h: rand(3, 5), c: pick(COLORS), life: 1,
      });
    }
  }

  function standUp(dev, note) {
    mode = 'settling';
    base = 0;
    angle = dev;
    spring = 0;
    landed++;
    streak++;
    best = Math.max(best, streak);
    api.audio.thud();
    api.audio.cheer();
    burst(1 + Math.min(streak, 6) * 0.25);
    setHint(streak >= 3 ? `ON FIRE \u{1F525} x${streak} — flick again` : note);
    updateStats();
  }

  function startTip(from, to) {
    streak = 0;
    mode = 'tipping';
    tipFrom = from;
    tipTo = to;
    tipT = 0;
    updateStats();
  }

  function land() {
    const dev = normalize(angle);
    const a = Math.abs(dev);
    y = REST_Y;
    sloshV += rand(-0.15, 0.15);
    api.audio.thud();
    if (a < STAND_TOLERANCE) {
      standUp(dev, 'LANDED ✨ flick again');
    } else if (a > 180 - CAP_TOLERANCE) {
      mode = 'settling';
      base = dev > 0 ? 180 : -180;
      angle = dev;
      spring = 0;
      landed++;
      streak++;
      best = Math.max(best, streak);
      capFlips++;
      api.audio.cheer();
      burst(2.6);
      setHint('CAP FLIP!! legendary \u{1F3C6}');
      updateStats();
    } else if (a < WOBBLE_TOLERANCE) {
      mode = 'wobble';
      wobT = 0;
      wobDev = dev;
      wobStand = Math.random() < 0.45;
      setHint('so close… \u{1F62C}');
    } else {
      startTip(dev, dev >= 0 ? 90 : -90);
    }
  }

  function resetBottle() {
    mode = 'idle';
    x = W / 2; y = REST_Y; angle = 0; base = 0; vy = 0; omega = 0;
    resetBtn.hidden = true;
    setHint(IDLE_HINT);
    loop.kick();
  }

  const loop = makeLoop((dt) => {
    const f = dt / 16.667;
    let cont = false;

    if (mode === 'flying') {
      y += vy * f;
      vy += G * f;
      angle += omega * f;
      sloshV += ((omega * Math.PI) / 180) * 0.05 * f;
      cont = true;
      if (y >= REST_Y && vy > 0) land();
    } else if (mode === 'settling') {
      const e = angle - base;
      spring += -0.09 * e * f;
      spring *= Math.pow(0.82, f);
      angle += spring * f;
      y = REST_Y;
      cont = true;
      if (Math.abs(angle - base) < 0.15 && Math.abs(spring) < 0.1) {
        angle = base;
        mode = 'idle';
        cont = false;
      }
    } else if (mode === 'wobble') {
      wobT += dt / 1000;
      angle = wobDev * Math.exp(-wobT * 3.5) * Math.cos(wobT * 13);
      y = REST_Y;
      cont = true;
      if (wobT > 0.7) {
        if (wobStand) {
          standUp(angle, 'wobbled… and STOOD ✨');
        } else {
          setHint('so close! tipped over');
          startTip(angle, wobDev >= 0 ? 90 : -90);
        }
      }
    } else if (mode === 'tipping') {
      tipT = Math.min(1, tipT + dt / 380);
      const e = tipT * tipT;
      angle = tipFrom + (tipTo - tipFrom) * e;
      y = REST_Y + (LIE_Y - REST_Y) * e;
      cont = true;
      if (tipT >= 1) {
        mode = 'tipped';
        cont = false;
        api.audio.clatter();
        resetBtn.hidden = false;
        if (!hint.textContent.startsWith('so close')) setHint('tipped over! tap anywhere to reset');
      }
    }

    // water slosh (spring on the surface tilt)
    sloshV += -0.12 * slosh * f;
    sloshV *= Math.pow(0.9, f);
    slosh = clamp(slosh + sloshV * f, -0.6, 0.6);
    if (Math.abs(slosh) > 0.003 || Math.abs(sloshV) > 0.003) cont = true;

    particles.forEach((p) => {
      p.x += p.vx * f;
      p.vy += 0.18 * f;
      p.y += p.vy * f;
      p.r += p.vr * f;
      p.life -= 0.012 * f;
    });
    particles = particles.filter((p) => p.life > 0);

    draw();
    return cont || particles.length > 0;
  });

  function drawBottle(cx, cy, deg) {
    const top = -BH / 2, bot = BH / 2, hw = BW / 2;
    const rot = (deg * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const body = new Path2D();
    body.moveTo(-9, top + 6);
    body.lineTo(9, top + 6);
    body.lineTo(9, top + 16);
    body.quadraticCurveTo(hw, top + 22, hw, top + 36);
    body.lineTo(hw, bot - 8);
    body.quadraticCurveTo(hw, bot, hw - 8, bot);
    body.lineTo(-hw + 8, bot);
    body.quadraticCurveTo(-hw, bot, -hw, bot - 8);
    body.lineTo(-hw, top + 36);
    body.quadraticCurveTo(-hw, top + 22, -9, top + 16);
    body.closePath();

    ctx.fillStyle = 'rgba(214,236,250,0.55)';
    ctx.fill(body);

    ctx.save();
    ctx.clip(body);
    // Water keeps a level surface in the world frame (and sloshes), whatever the bottle does.
    const waterLevelLocal = (bot - BH * 0.42) * Math.cos(rot);
    ctx.save();
    ctx.translate(0, waterLevelLocal);
    ctx.rotate(-rot + slosh);
    ctx.fillStyle = 'rgba(110,185,238,0.82)';
    ctx.fillRect(-70, 0, 140, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-70, 0, 140, 2.5);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-hw, top + 44, BW, 14);
    ctx.restore();

    ctx.strokeStyle = 'rgba(120,160,190,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke(body);

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-hw + 5, top + 40);
    ctx.lineTo(-hw + 5, bot - 14);
    ctx.stroke();

    ctx.fillStyle = '#4aa3df';
    ctx.beginPath();
    ctx.roundRect(-11, top - 2, 22, 9, 3);
    ctx.fill();
    ctx.restore();
  }

  // What would this swipe do if released right now?
  function predicted() {
    if (!drag || !aimAssist) return null;
    const dy = drag.y0 - drag.cy;
    if (dy < 24) return null;
    const v = dy / Math.max(16, performance.now() - drag.t0);
    const vyp = clamp(6 + v * 4.5, 8, 13);
    const om = clamp(v * 7, 5, 25);
    const rot = om * ((2 * vyp) / G);
    return { flips: rot / 360, perfect: Math.abs(normalize(rot)) < STAND_TOLERANCE };
  }

  function drawPill(px, py, text, good) {
    ctx.save();
    ctx.font = '600 12px "Trebuchet MS", sans-serif';
    const w = ctx.measureText(text).width + 16;
    const bx = clamp(px - w / 2, 4, W - w - 4), by = Math.max(4, py - 34);
    ctx.fillStyle = good ? 'rgba(204,242,224,0.95)' : 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = good ? '#2f8f68' : '#8d7ea1';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 8, by + 11.5);
    ctx.restore();
  }

  function draw() {
    const wall = ctx.createLinearGradient(0, 0, 0, TABLE);
    wall.addColorStop(0, '#fdeef6');
    wall.addColorStop(1, '#e8f3fb');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    const wood = ctx.createLinearGradient(0, TABLE, 0, H);
    wood.addColorStop(0, '#f6dfcf');
    wood.addColorStop(1, '#e8c3ae');
    ctx.fillStyle = wood;
    ctx.fillRect(0, TABLE, W, H - TABLE);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, TABLE, W, 2);

    const height = Math.max(0, REST_Y - y);
    const s = 1 / (1 + height / 160);
    ctx.fillStyle = `rgba(90,70,110,${0.18 * s})`;
    ctx.beginPath();
    ctx.ellipse(x, TABLE + 5, 24 * s + 4, 5 * s + 1, 0, 0, TAU);
    ctx.fill();

    drawBottle(x, y, angle);

    if (drag && drag.cx != null) {
      ctx.save();
      ctx.strokeStyle = 'rgba(169,138,216,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 7]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drag.x0, drag.y0);
      ctx.lineTo(drag.cx, drag.cy);
      ctx.stroke();
      ctx.restore();
      const pr = predicted();
      if (pr) drawPill(drag.cx, drag.cy, `${pr.flips.toFixed(1)} flips${pr.perfect ? ' ✓' : ''}`, pr.perfect);
    }

    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
  }

  c.canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'tipped') { resetBottle(); return; }
    if (mode !== 'idle') return;
    c.canvas.setPointerCapture(e.pointerId);
    const p = c.toLocal(e);
    drag = { x0: p.x, y0: p.y, t0: performance.now(), cx: p.x, cy: p.y };
  });
  c.canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = c.toLocal(e);
    drag.cx = p.x;
    drag.cy = p.y;
    draw();
  });
  c.canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const p = c.toLocal(e);
    const d = drag;
    drag = null;
    const dy = d.y0 - p.y;
    const dx = p.x - d.x0;
    if (dy < 24) {
      setHint('flick it up a little harder ↑');
      draw();
      return;
    }
    const v = dy / Math.max(16, performance.now() - d.t0); // px per ms, upward
    vy = -clamp(6 + v * 4.5, 8, 13);
    omega = clamp(v * 7, 5, 25) * (dx < -30 ? -1 : 1);
    if (base !== 0) { angle = base; base = 0; } else { angle = 0; }
    mode = 'flying';
    setHint('…');
    api.audio.whoosh();
    loop.kick();
  });
  c.canvas.addEventListener('pointercancel', () => { drag = null; draw(); });
  resetBtn.addEventListener('click', resetBottle);
  aimBtn.addEventListener('click', () => {
    aimAssist = !aimAssist;
    aimBtn.textContent = `aim assist: ${aimAssist ? 'on' : 'off'}`;
  });

  draw();
  return () => loop.stop();
}
