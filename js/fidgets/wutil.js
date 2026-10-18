// Shared helpers for the fidget modules.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function makeButton(label, cls = 'btn small') {
  const b = el('button', cls, label);
  b.type = 'button';
  return b;
}

// HiDPI canvas with logical (w x h) coordinates and a pointer->canvas mapper.
export function makeCanvas(w, h, label) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.className = 'fidget-canvas';
  if (label) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * h) / r.height };
  };
  return { canvas, ctx, dpr, w, h, toLocal };
}

// requestAnimationFrame loop that sleeps when step() returns false.
export function makeLoop(step) {
  let raf = 0;
  let last = 0;
  let running = false;
  function frame(t) {
    const dt = Math.min(50, last ? t - last : 16.667);
    last = t;
    const cont = step(dt, t);
    if (cont) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
      last = 0;
    }
  }
  return {
    kick() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      running = false;
    },
  };
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function star(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s);
  g.quadraticCurveTo(x, y, x + s, y);
  g.quadraticCurveTo(x, y, x, y + s);
  g.quadraticCurveTo(x, y, x - s, y);
  g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}
