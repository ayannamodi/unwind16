import { getCore, setCore, CORE_DEFAULTS } from './js/state.js';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const ALARM_TICK = 'destim-tick';
const ALARM_END = 'destim-end';

// The session clock lives here (not in the side panel) so closing the panel
// never loses progress. Everything is timestamp-based and idempotent.

// Serialize all state mutations so alarms and messages can't double-credit.
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(() => fn());
  chain = run.catch(() => {});
  return run;
}

async function settleInner(now = Date.now()) {
  const core = await getCore();
  const s = core.session;
  if (!s.active) return core;

  const until = Math.min(now, s.endsAt);
  const mins = Math.floor((until - s.lastCreditAt) / 60000);
  let changed = false;

  if (mins > 0) {
    core.totalFocusMinutes += mins;
    s.lastCreditAt += mins * 60000;
    changed = true;
  }
  if (now >= s.endsAt) {
    s.active = false;
    core.sessionsCompleted += 1;
    changed = true;
    clearAlarms();
  }
  if (changed) await setCore(core);
  return core;
}

function clearAlarms() {
  chrome.alarms.clear(ALARM_TICK);
  chrome.alarms.clear(ALARM_END);
}

function scheduleAlarms(session) {
  chrome.alarms.create(ALARM_TICK, { delayInMinutes: 1, periodInMinutes: 1 });
  chrome.alarms.create(ALARM_END, { when: session.endsAt });
}

async function handle(msg) {
  switch (msg && msg.type) {
    case 'start': {
      const core = await settleInner();
      if (core.session.active) return core;
      const len = Math.min(120, Math.max(1, Number(msg.lengthMin) || 25));
      const now = Date.now();
      core.session = { active: true, startedAt: now, endsAt: now + len * 60000, lastCreditAt: now, lengthMin: len };
      await setCore(core);
      scheduleAlarms(core.session);
      return core;
    }
    case 'stop': {
      await settleInner();
      const core = await getCore();
      core.session.active = false; // whole minutes already banked stay banked
      await setCore(core);
      clearAlarms();
      return core;
    }
    case 'settle':
      return settleInner();
    case 'bonus': {
      const core = await getCore();
      core.totalFocusMinutes += Math.max(1, Number(msg.minutes) || 15);
      return setCore(core);
    }
    case 'reset': {
      clearAlarms();
      return setCore(JSON.parse(JSON.stringify(CORE_DEFAULTS)));
    }
    default:
      return getCore();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'leaveTab') {
    // From the brainrot-block overlay: close the doomscroll tab.
    if (sender.tab && sender.tab.id != null) chrome.tabs.remove(sender.tab.id).catch(() => {});
    sendResponse({ ok: true });
    return;
  }
  serial(() => handle(msg)).then(
    (core) => sendResponse({ ok: true, core }),
    (err) => sendResponse({ ok: false, error: String(err) })
  );
  return true; // async response
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_TICK || alarm.name === ALARM_END) serial(() => settleInner());
});

async function restore() {
  const core = await settleInner();
  if (core.session.active) scheduleAlarms(core.session);
}
chrome.runtime.onStartup.addListener(() => serial(restore));
chrome.runtime.onInstalled.addListener(() => serial(restore));
