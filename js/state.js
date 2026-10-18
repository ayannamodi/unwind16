// Shared state helpers (used by the side panel and the background worker).
//
// Two storage keys on purpose, so the two writers never clobber each other:
//   destim_core  -> owned by background.js (focus minutes, session clock)
//   destim_prefs -> owned by the side panel (pins, mute, photo counter, ...)

export const KEY_CORE = 'destim_core';
export const KEY_PREFS = 'destim_prefs';
export const MAX_PINNED = 2;

// Unlock tiers (Focus Minutes needed). Tweak here to rebalance the advent drawer.
export const TOYS = [
  { id: 'polaroid', name: 'Instant Camera',     unlock: 0,  blurb: 'prints cute stuff. no film wasted.' },
  { id: 'bottle',   name: 'Bottle Flip',        unlock: 0,  blurb: 'flick it. land it. (maybe.)' },
  { id: 'spinner',  name: 'Fidget Spinner',     unlock: 10, blurb: 'flick it. watch it whirr.' },
  { id: 'rug',      name: 'Leopard Rug',        unlock: 15, blurb: 'brush the fur. watch it change.' },
  { id: 'squishy',  name: 'Panda Squishy',      unlock: 25, blurb: 'press in. slow rise. repeat.' },
  { id: 'slime',    name: 'Holo Slime',         unlock: 30, blurb: 'press, push, squelch.' },
  { id: 'phonecase', name: 'Glitter Phone Case', unlock: 40, blurb: 'swirl the liquid glitter.' },
  { id: 'frappe',   name: 'Drink Bar',          unlock: 45, blurb: 'unicorn frappe or pink drink.' },
];

export const CORE_DEFAULTS = {
  totalFocusMinutes: 0,
  sessionsCompleted: 0,
  session: { active: false, startedAt: 0, endsAt: 0, lastCreditAt: 0, lengthMin: 25 },
};

export const PREFS_DEFAULTS = {
  pinned: ['bottle'],
  seen: ['polaroid', 'bottle'],
  muted: false,
  lengthMin: 25,
  photoCount: 42,
};

export function normalizeCore(raw) {
  raw = raw || {};
  return { ...CORE_DEFAULTS, ...raw, session: { ...CORE_DEFAULTS.session, ...(raw.session || {}) } };
}

// Toys that were renamed or replaced keep working for people with saved prefs.
const LEGACY_IDS = { sequin: 'rug', galaxy: 'phonecase' };
const VALID_IDS = new Set(TOYS.map((t) => t.id));
const cleanIds = (arr) => [...new Set((arr || []).map((id) => LEGACY_IDS[id] || id).filter((id) => VALID_IDS.has(id)))];

export function normalizePrefs(raw) {
  const p = { ...PREFS_DEFAULTS, ...(raw || {}) };
  p.pinned = cleanIds(p.pinned).slice(0, MAX_PINNED);
  p.seen = cleanIds(p.seen);
  return p;
}

export async function getCore() {
  const r = await chrome.storage.local.get(KEY_CORE);
  return normalizeCore(r[KEY_CORE]);
}

export async function setCore(core) {
  await chrome.storage.local.set({ [KEY_CORE]: core });
  return core;
}

export async function getPrefs() {
  const r = await chrome.storage.local.get(KEY_PREFS);
  return normalizePrefs(r[KEY_PREFS]);
}

export async function patchPrefs(fn) {
  const cur = await getPrefs();
  const next = normalizePrefs(fn(cur));
  await chrome.storage.local.set({ [KEY_PREFS]: next });
  return next;
}

// Whole minutes earned in the running session that the background hasn't committed yet.
export function pendingMinutes(core, now = Date.now()) {
  const s = core.session;
  if (!s.active) return 0;
  return Math.max(0, Math.floor((Math.min(now, s.endsAt) - s.lastCreditAt) / 60000));
}
