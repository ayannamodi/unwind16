import {
  TOYS, MAX_PINNED, KEY_CORE, KEY_PREFS, PREFS_DEFAULTS,
  getCore, getPrefs, patchPrefs, normalizeCore, normalizePrefs, pendingMinutes,
} from './state.js';
import * as audio from './audio.js';
import { WIDGETS } from './widgets.js';

const $ = (sel) => document.querySelector(sel);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS = {
  polaroid: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="14" width="36" height="26" rx="5" fill="#fffdfb" stroke="#c9c3d8" stroke-width="2"/><rect x="6" y="30" width="36" height="4" fill="#ffb4cf"/><circle cx="24" cy="24" r="7.5" fill="#dcd8e8" stroke="#a79fc0" stroke-width="2"/><circle cx="24" cy="24" r="4" fill="#4b6aa8"/><circle cx="35" cy="19" r="2.2" fill="#f0527f"/><rect x="10" y="17" width="9" height="4" rx="1.5" fill="#e9e5f2"/></svg>',
  bottle: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="20" y="3" width="8" height="5" rx="1.5" fill="#4aa3df"/><path d="M21 8h6v6c5 3 7 6 7 12v15a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V26c0-6 2-9 7-12z" fill="#e3f2fb" stroke="#8cb7d6" stroke-width="2"/><path d="M14.5 32h19v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#76bdee"/></svg>',
  spinner: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="11" r="8" fill="#ff9ec7"/><circle cx="12.5" cy="31" r="8" fill="#9bd1f7"/><circle cx="35.5" cy="31" r="8" fill="#bfe8d3"/><circle cx="24" cy="25" r="9" fill="#d9c2f5"/><circle cx="24" cy="25" r="4.5" fill="#fff" stroke="#a79fc0" stroke-width="1.5"/><circle cx="24" cy="11" r="3" fill="#fffafc"/><circle cx="12.5" cy="31" r="3" fill="#fffafc"/><circle cx="35.5" cy="31" r="3" fill="#fffafc"/></svg>',
  rug: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="11" width="38" height="26" rx="5" fill="#e3ad58"/><g fill="#2a1507"><ellipse cx="14" cy="19" rx="3.2" ry="2.4"/><ellipse cx="20" cy="25" rx="2.6" ry="3"/><ellipse cx="12" cy="28" rx="2.4" ry="2"/><ellipse cx="29" cy="18" rx="3" ry="2.4"/><ellipse cx="35" cy="26" rx="3.2" ry="2.6"/><ellipse cx="28" cy="30" rx="2.4" ry="2.8"/></g><g stroke="#f3d9a2" stroke-width="1.6" stroke-linecap="round"><path d="M2 16v6M2 25v6M46 16v6M46 25v6"/></g></svg>',
  squishy: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="13" r="6" fill="#2f2a33"/><circle cx="36" cy="13" r="6" fill="#2f2a33"/><ellipse cx="24" cy="27" rx="17" ry="15" fill="#fffaf2" stroke="#e3d3c2" stroke-width="2"/><ellipse cx="17" cy="26" rx="4" ry="5" transform="rotate(25 17 26)" fill="#2f2a33"/><ellipse cx="31" cy="26" rx="4" ry="5" transform="rotate(-25 31 26)" fill="#2f2a33"/><circle cx="17.6" cy="25" r="1.3" fill="#fff"/><circle cx="30.4" cy="25" r="1.3" fill="#fff"/><ellipse cx="24" cy="32" rx="2.6" ry="1.8" fill="#2f2a33"/><circle cx="12.5" cy="33" r="2.2" fill="#ff8fb0" opacity=".6"/><circle cx="35.5" cy="33" r="2.2" fill="#ff8fb0" opacity=".6"/><path d="M33 8l5-2-1 5z M33 8l-4-3 1 5z" fill="#e8344f"/></svg>',
  slime: '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="ig-slime" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a4de0"/><stop offset=".5" stop-color="#ee6ec8"/><stop offset="1" stop-color="#46cae4"/></linearGradient></defs><path d="M8 34c-2-8 3-18 12-20 6-1 8-6 14-4 6 2 9 9 6 16 2 3 1 8-4 9H14c-4 0-6-1-6-1z" fill="url(#ig-slime)" stroke="#8a62d0" stroke-width="2"/><ellipse cx="18" cy="22" rx="4" ry="2.4" fill="#fff" opacity=".6"/></svg>',
  phonecase: '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="ig-case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1a70"/><stop offset=".55" stop-color="#9a45d8"/><stop offset="1" stop-color="#ff7fd0"/></linearGradient></defs><rect x="13" y="4" width="22" height="40" rx="6" fill="#fde7f1" stroke="#c9c3d8" stroke-width="2"/><rect x="16" y="7" width="16" height="34" rx="4" fill="url(#ig-case)"/><rect x="16" y="7" width="8" height="8" rx="3" fill="#f4d6d2"/><circle cx="19.5" cy="10.5" r="2.2" fill="#2b2733"/><circle cx="22" cy="28" r="1.1" fill="#fff"/><circle cx="28" cy="34" r="1.3" fill="#ffe9a6"/><circle cx="27" cy="22" r="1" fill="#9fe8ff"/></svg>',
  frappe: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 16h24l-4 26H16z" fill="#fff" stroke="#a79fc0" stroke-width="2"/><path d="M14 24h20l-2 16H16z" fill="#f7a8cf"/><path d="M15 33h18l-1 7H16z" fill="#9bd1f7"/><ellipse cx="24" cy="14" rx="11" ry="4.5" fill="#fffdf8" stroke="#e1c4d4" stroke-width="1.5"/><path d="M20 10c1-5 7-5 8 0z" fill="#fffdf8" stroke="#e1c4d4" stroke-width="1.5"/></svg>',
};

const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

let core;
let prefs;
let lastBank = -1;
let lastSig = '';
let settleSent = false;
let toastTimer = 0;
const mounted = new Map();
const celebrating = new Set();

const els = {
  time: $('#timeDisplay'),
  start: $('#startBtn'),
  bank: $('#bankMins'),
  sprintBar: $('#sprintBar'),
  nextBar: $('#nextBar'),
  nextText: $('#nextText'),
  stage: $('#stage'),
  stageEmpty: $('#stageEmpty'),
  grid: $('#drawerGrid'),
  mute: $('#muteBtn'),
  toast: $('#toast'),
  chips: [...document.querySelectorAll('.chip')],
};

const widgetApi = {
  audio,
  reducedMotion,
  getPhotoCount: () => prefs.photoCount,
  setPhotoCount: (n) => {
    prefs.photoCount = n;
    patchPrefs((p) => ({ ...p, photoCount: n }));
  },
};

init();

async function init() {
  [core, prefs] = await Promise.all([getCore(), getPrefs()]);
  audio.setMuted(prefs.muted);
  bind();
  renderAll();
  setInterval(tick, 250);
}

const bankNow = () => core.totalFocusMinutes + pendingMinutes(core);

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function send(msg) {
  return chrome.runtime.sendMessage(msg).catch((e) => console.warn('message failed', e));
}

function toast(msg, ms = 3200) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

function bind() {
  els.start.addEventListener('click', () => {
    if (core.session.active) {
      send({ type: 'stop' });
    } else {
      settleSent = false;
      send({ type: 'start', lengthMin: prefs.lengthMin });
    }
  });

  els.chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      if (core.session.active) return;
      const len = Number(chip.dataset.len);
      prefs.lengthMin = len;
      patchPrefs((p) => ({ ...p, lengthMin: len }));
      renderTimer();
    })
  );

  els.mute.addEventListener('click', () => {
    const m = !prefs.muted;
    prefs.muted = m;
    audio.setMuted(m);
    patchPrefs((p) => ({ ...p, muted: m }));
    renderMute();
  });

  $('#bonusBtn').addEventListener('click', () => send({ type: 'bonus', minutes: 15 }));

  $('#resetBtn').addEventListener('click', async () => {
    if (!window.confirm('Reset focus minutes and unlocks?')) return;
    await send({ type: 'reset' });
    await patchPrefs((p) => ({ ...PREFS_DEFAULTS, muted: p.muted }));
  });

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch[KEY_CORE]) {
      const prev = core;
      core = normalizeCore(ch[KEY_CORE].newValue);
      if (prev.session.active && !core.session.active) {
        if (core.sessionsCompleted > prev.sessionsCompleted) {
          toast('sprint complete ✿ fidget break earned');
          audio.done();
        } else {
          toast('session ended — banked minutes are safe');
        }
      }
      settleSent = false;
      lastBank = -1;
    }
    if (ch[KEY_PREFS]) {
      prefs = normalizePrefs(ch[KEY_PREFS].newValue);
      audio.setMuted(prefs.muted);
    }
    renderAll();
  });
}

/* ---------- rendering ---------- */

function renderAll() {
  const bank = bankNow();
  lastBank = bank;
  renderMute();
  renderTimer();
  renderBank(bank);
  renderDrawer(bank);
  syncStage(bank);
  celebrate(bank);
}

function renderMute() {
  els.mute.setAttribute('aria-pressed', String(prefs.muted));
  els.mute.textContent = prefs.muted ? '\u{1F507}' : '\u{1F50A}';
}

function renderTimer() {
  const s = core.session;
  els.start.textContent = s.active ? 'End Session' : 'Start Session';
  els.start.classList.toggle('running', s.active);
  els.chips.forEach((chip) => {
    chip.setAttribute('aria-pressed', String(Number(chip.dataset.len) === (s.active ? s.lengthMin : prefs.lengthMin)));
    chip.disabled = s.active;
  });
  paintClock();
}

function paintClock() {
  const s = core.session;
  if (s.active) {
    els.time.textContent = fmt(s.endsAt - Date.now());
    els.sprintBar.style.width = Math.min(100, ((Date.now() - s.startedAt) / (s.endsAt - s.startedAt)) * 100) + '%';
  } else {
    els.time.textContent = fmt(prefs.lengthMin * 60000);
    els.sprintBar.style.width = '0%';
  }
}

function renderBank(bank) {
  els.bank.textContent = String(bank);
  const next = TOYS.filter((t) => t.unlock > bank).sort((a, b) => a.unlock - b.unlock)[0];
  if (!next) {
    els.nextText.textContent = 'everything unlocked ✨';
    els.nextBar.style.width = '100%';
    return;
  }
  const prevTier = Math.max(0, ...TOYS.filter((t) => t.unlock <= bank).map((t) => t.unlock));
  const need = next.unlock - bank;
  els.nextBar.style.width = Math.round(((bank - prevTier) / (next.unlock - prevTier)) * 100) + '%';
  els.nextText.textContent = `${need} min${need === 1 ? '' : 's'} until ${next.name.toLowerCase()}`;
}

function renderDrawer(bank) {
  const sig = bank + '|' + prefs.pinned.join(',');
  if (sig === lastSig) return;
  lastSig = sig;

  const cards = TOYS.map((t) => {
    const unlocked = bank >= t.unlock;
    const pinned = prefs.pinned.includes(t.id);
    const li = document.createElement('li');
    li.className = 'toy' + (unlocked ? '' : ' locked') + (pinned ? ' pinned' : '');
    li.dataset.id = t.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.innerHTML = ICONS[t.id];
    const info = document.createElement('div');
    info.className = 'toy-info';
    const h = document.createElement('h4');
    h.textContent = t.name;
    const p = document.createElement('p');
    p.textContent = t.blurb;
    info.append(h, p);
    li.append(thumb, info);

    if (unlocked) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn pin';
      b.textContent = pinned ? 'Pinned ✓' : 'Pin to Desk';
      b.setAttribute('aria-pressed', String(pinned));
      b.addEventListener('click', () => togglePin(t.id));
      li.append(b);
    } else {
      const need = t.unlock - bank;
      const lock = document.createElement('div');
      lock.className = 'lock';
      lock.innerHTML = LOCK_SVG;
      const label = document.createElement('span');
      label.textContent = `Unlock at ${t.unlock} mins (${need} min${need === 1 ? '' : 's'} remaining)`;
      const bar = document.createElement('div');
      bar.className = 'bar';
      const fill = document.createElement('i');
      fill.style.width = Math.min(100, Math.round((bank / t.unlock) * 100)) + '%';
      bar.append(fill);
      lock.append(label, bar);
      li.append(lock);
    }
    return li;
  });
  els.grid.replaceChildren(...cards);
}

/* ---------- pinning + stage ---------- */

function togglePin(id) {
  let pinned = prefs.pinned.slice();
  if (pinned.includes(id)) {
    pinned = pinned.filter((x) => x !== id);
  } else {
    pinned.push(id);
    if (pinned.length > MAX_PINNED) {
      const dropped = pinned.shift();
      toast(`swapped out ${TOYS.find((t) => t.id === dropped).name.toLowerCase()} (max ${MAX_PINNED} pinned)`);
    }
  }
  prefs.pinned = pinned;
  patchPrefs((p) => ({ ...p, pinned }));
  renderAll();
}

function syncStage(bank) {
  const want = prefs.pinned.filter((id) => {
    const toy = TOYS.find((t) => t.id === id);
    return toy && bank >= toy.unlock;
  });

  for (const [id, m] of mounted) {
    if (!want.includes(id)) {
      m.destroy();
      m.el.remove();
      mounted.delete(id);
    }
  }
  for (const id of want) if (!mounted.has(id)) mountWidget(id);
  for (const id of want) els.stage.append(mounted.get(id).el); // keep pin order
  els.stageEmpty.hidden = want.length > 0;
}

function mountWidget(id) {
  const toy = TOYS.find((t) => t.id === id);
  const card = document.createElement('article');
  card.className = 'widget';
  card.dataset.id = id;

  const head = document.createElement('header');
  head.className = 'widget-head';
  const h = document.createElement('h3');
  h.textContent = toy.name;
  const unpin = document.createElement('button');
  unpin.type = 'button';
  unpin.className = 'btn tiny';
  unpin.textContent = 'unpin';
  unpin.addEventListener('click', () => togglePin(id));
  head.append(h, unpin);

  const body = document.createElement('div');
  body.className = 'widget-body';
  card.append(head, body);
  els.stage.append(card);

  const destroy = WIDGETS[id](body, widgetApi);
  mounted.set(id, { el: card, destroy });
}

/* ---------- unlock celebration ---------- */

function celebrate(bank) {
  const fresh = TOYS.filter((t) => bank >= t.unlock && !prefs.seen.includes(t.id) && !celebrating.has(t.id));
  if (!fresh.length) return;
  fresh.forEach((t) => celebrating.add(t.id));
  const names = fresh.map((t) => t.name.toLowerCase()).join(' + ');
  toast(`\u{1F513} unlocked: ${names}`, 4200);
  audio.unlock();
  patchPrefs((p) => ({ ...p, seen: [...new Set([...p.seen, ...fresh.map((t) => t.id)])] })).then(() => {
    fresh.forEach((t) => celebrating.delete(t.id));
    fresh.forEach((t) => {
      const card = els.grid.querySelector(`[data-id="${t.id}"]`);
      if (card && !reducedMotion) card.classList.add('fresh');
    });
  });
}

/* ---------- clock ---------- */

function tick() {
  if (!core) return;
  const s = core.session;
  paintClock();
  if (s.active && Date.now() >= s.endsAt && !settleSent) {
    settleSent = true;
    send({ type: 'settle' });
  }
  const bank = bankNow();
  if (bank !== lastBank) renderAll();
}
