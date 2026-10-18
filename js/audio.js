// Tiny synthesized sound kit (no asset files needed). Master volume is hard-clamped
// to 0.2 so everything stays calm and low-stim.

const MAX_VOLUME = 0.2;

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

function ensure() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MAX_VOLUME;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : MAX_VOLUME, ctx.currentTime, 0.01);
}

function tone({ freq, to, dur = 0.12, type = 'sine', vol = 0.5, delay = 0, attack = 0.005 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise({ dur = 0.05, type = 'bandpass', freq = 2000, to, q = 1, vol = 0.4, delay = 0, attack = 0.002 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 1.2);
  s.stop(t + dur + 0.03);
}

const PENTA = [784, 880, 988, 1175, 1319, 1568];

export function pop() {
  const f = 320 + Math.random() * 120;
  tone({ freq: f, to: f * 2.6, dur: 0.11, vol: 0.55 });
  noise({ dur: 0.04, type: 'highpass', freq: 3000, vol: 0.12 });
}

export function squelch(speed = 1) {
  const f = 150 + Math.min(1, speed) * 120;
  tone({ freq: f, to: f * 0.5, dur: 0.16, type: 'triangle', vol: 0.4 });
  noise({ dur: 0.12, type: 'lowpass', freq: 700, to: 250, vol: 0.18 });
}

export function brush() {
  noise({ dur: 0.06, type: 'bandpass', freq: 3200 + Math.random() * 800, q: 0.7, vol: 0.3 });
}

export function shutter() {
  noise({ dur: 0.018, type: 'highpass', freq: 2500, vol: 0.9 });
  tone({ freq: 1800, to: 700, dur: 0.035, type: 'square', vol: 0.12 });
  noise({ dur: 0.03, type: 'bandpass', freq: 1400, q: 1.5, vol: 0.7, delay: 0.07 });
  noise({ dur: 0.05, type: 'lowpass', freq: 600, vol: 0.3, delay: 0.1 });
}

export function thud() {
  tone({ freq: 110, to: 45, dur: 0.12, vol: 0.7 });
  noise({ dur: 0.05, type: 'lowpass', freq: 500, vol: 0.4 });
}

export function clatter() {
  [0, 0.07, 0.15, 0.24].forEach((d, i) => {
    noise({ dur: 0.05, type: 'bandpass', freq: 1100 + i * 350, q: 2, vol: 0.5 - i * 0.08, delay: d });
  });
  tone({ freq: 140, to: 70, dur: 0.1, vol: 0.4, delay: 0.02 });
}

// Soft party-horn arpeggio + a little crowd shimmer (kept gentle on purpose).
export function cheer() {
  [523, 659, 784, 1047].forEach((f, i) => {
    tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.45, delay: i * 0.08 });
  });
  noise({ dur: 0.7, type: 'bandpass', freq: 1800, q: 0.4, vol: 0.18, delay: 0.05, attack: 0.15 });
  for (let i = 0; i < 8; i++) {
    noise({ dur: 0.03, type: 'highpass', freq: 2500, vol: 0.2, delay: 0.1 + Math.random() * 0.6 });
  }
}

export function chime(i = 0) {
  const f = PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length];
  tone({ freq: f, dur: 0.7, vol: 0.3 });
  tone({ freq: f * 2, dur: 0.4, vol: 0.1 });
}

export function whip() {
  noise({ dur: 0.35, type: 'lowpass', freq: 500, to: 1600, vol: 0.4, attack: 0.08 });
}

export function done() {
  tone({ freq: 659, dur: 0.5, vol: 0.4 });
  tone({ freq: 988, dur: 0.7, vol: 0.4, delay: 0.16 });
}

export function whoosh() {
  noise({ dur: 0.28, type: 'bandpass', freq: 500, to: 2400, q: 0.9, vol: 0.35, attack: 0.06 });
}

export function squeak(p = 1) {
  const f = 520 * p;
  tone({ freq: f, to: f * 1.5, dur: 0.1, type: 'triangle', vol: 0.35 });
  tone({ freq: f * 0.5, to: f * 0.8, dur: 0.13, vol: 0.15, delay: 0.02 });
}

export function plop() {
  tone({ freq: 420, to: 160, dur: 0.09, vol: 0.4 });
  noise({ dur: 0.05, type: 'lowpass', freq: 900, vol: 0.15 });
}

export function clink() {
  tone({ freq: 2300 + Math.random() * 500, dur: 0.12, vol: 0.18 });
  tone({ freq: 3400, dur: 0.08, vol: 0.1 });
}

export function tick() {
  noise({ dur: 0.012, type: 'highpass', freq: 3500, vol: 0.25 });
  tone({ freq: 900, to: 500, dur: 0.02, type: 'square', vol: 0.05 });
}

// Instant-camera print motor.
export function printWhirr() {
  for (let i = 0; i < 12; i++) tone({ freq: 150 + i * 6, dur: 0.07, type: 'sawtooth', vol: 0.09, delay: i * 0.07 });
  noise({ dur: 0.85, type: 'bandpass', freq: 700, q: 2, vol: 0.12, attack: 0.1 });
}

// Continuous bearing whirr for the spinner. Returns { set(speed01), stop() }.
export function whirrStart() {
  const c = ensure();
  if (!c) return { set() {}, stop() {} };
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 300;
  f.Q.value = 1.4;
  const g = c.createGain();
  g.gain.value = 0.0001;
  s.connect(f).connect(g).connect(master);
  s.start();
  let stopped = false;
  return {
    set(speed) {
      if (stopped) return;
      const t = c.currentTime;
      f.frequency.setTargetAtTime(250 + speed * 1800, t, 0.05);
      g.gain.setTargetAtTime(Math.max(0.0001, speed * 0.35), t, 0.08);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.05);
      s.stop(t + 0.3);
    },
  };
}

export function unlock() {
  [784, 988, 1319].forEach((f, i) => tone({ freq: f, dur: 0.45, vol: 0.35, delay: i * 0.1 }));
}

// Continuous "pouring" hiss. Returns a stop() function.
export function pourStart() {
  const c = ensure();
  if (!c) return () => {};
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.12);
  s.connect(f).connect(g).connect(master);
  s.start();
  return () => {
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0.0001, t, 0.05);
    s.stop(t + 0.35);
  };
}
