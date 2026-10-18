// Brainrot Block: while a focus sprint is running, TikTok / Instagram / YouTube Shorts
// get a playful 2016-meme overlay that sends you back to work.
(() => {
  const KEY = 'destim_core';
  const HOST = location.hostname;

  const CAPTIONS = [
    ['WHOA THERE, SCHOLAR', "YOUR SPRINT ISN'T OVER"],
    ['MANNEQUIN CHALLENGE:', 'STAY AT YOUR DESK'],
    ["DON'T @ ME", "I'M MID-SPRINT"],
    ['BOTTLE FLIP', 'BACK TO YOUR TAB'],
    ['DAB ON THAT DEADLINE', 'SCROLL LATER'],
    ['THIS IS NOT', 'THE TAB FOR THAT'],
  ];

  function shouldGuard() {
    if (/(^|\.)tiktok\.com$/.test(HOST)) return true;
    if (/(^|\.)instagram\.com$/.test(HOST)) return true;
    if (/(^|\.)youtube\.com$/.test(HOST)) return location.pathname.startsWith('/shorts');
    return false;
  }

  let core = null;
  let hostEl = null;
  let timerEl = null;
  let timer = 0;

  function alive() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function build() {
    const [top, bottom] = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
    hostEl = document.createElement('div');
    hostEl.id = 'destim-overlay-host';
    hostEl.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
    const root = hostEl.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      .wrap { position: fixed; inset: 0; display: grid; place-items: center; padding: 20px;
        background: linear-gradient(135deg, #ffd6ec 0%, #d9ccff 50%, #c9f1e3 100%);
        font-family: "Trebuchet MS", system-ui, sans-serif; color: #5b4b6e; }
      .card { max-width: 560px; width: 100%; text-align: center; padding: 28px 24px;
        background: rgba(255,255,255,.55); border: 3px dashed #fff; border-radius: 28px;
        box-shadow: 0 20px 60px rgba(120,90,160,.25); }
      .face { font-size: 88px; line-height: 1; display: inline-block; animation: bob 3s ease-in-out infinite; }
      .meme { margin: 10px 0 6px; font-family: Impact, "Arial Black", sans-serif; text-transform: uppercase;
        font-size: clamp(26px, 6vw, 56px); line-height: 1.05; color: #fff; letter-spacing: 1px;
        text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 0 #000; }
      .sub { margin: 14px 0 4px; font-size: 14px; opacity: .85; }
      .time { font-size: 40px; font-weight: 700; letter-spacing: 2px; color: #8a5fb8; font-variant-numeric: tabular-nums; }
      .btns { display: flex; flex-direction: column; gap: 10px; align-items: center; margin-top: 18px; }
      button { font: inherit; cursor: pointer; border: 0; border-radius: 999px; }
      .go { padding: 12px 24px; font-weight: 700; font-size: 16px; color: #fff;
        background: linear-gradient(135deg, #e79fc1, #a98ad8); box-shadow: 0 6px 16px rgba(169,138,216,.45); }
      .go:hover { filter: brightness(1.06); }
      .quit { background: none; color: #7a6a8e; font-size: 12px; text-decoration: underline; padding: 6px; }
      @keyframes bob { 50% { transform: translateY(-8px) rotate(-3deg); } }
      @media (prefers-reduced-motion: reduce) { .face { animation: none; } }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Unwind ’16 focus sprint in progress');

    const card = document.createElement('div');
    card.className = 'card';

    const face = document.createElement('div');
    face.className = 'face';
    face.textContent = '\u{1F984}';

    const meme = document.createElement('div');
    meme.className = 'meme';
    meme.append(document.createTextNode(top), document.createElement('br'), document.createTextNode(bottom));

    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = 'sprint time left';

    timerEl = document.createElement('div');
    timerEl.className = 'time';

    const btns = document.createElement('div');
    btns.className = 'btns';

    const go = document.createElement('button');
    go.className = 'go';
    go.textContent = 'take me back to work ✿';
    go.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ type: 'leaveTab' }, () => void chrome.runtime.lastError);
      } catch (e) {
        history.back();
      }
    });

    const quit = document.createElement('button');
    quit.className = 'quit';
    quit.textContent = 'end my sprint & scroll anyway';
    quit.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ type: 'stop' }, () => void chrome.runtime.lastError);
      } catch (e) {}
    });

    btns.append(go, quit);
    card.append(face, meme, sub, timerEl, btns);
    wrap.append(card);
    root.append(style, wrap);
    document.documentElement.append(hostEl);
  }

  function pauseMedia() {
    document.querySelectorAll('video, audio').forEach((m) => {
      try { if (!m.paused) m.pause(); } catch (e) {}
    });
  }

  function evaluate() {
    if (!alive()) { clearInterval(timer); hostEl && hostEl.remove(); return; }
    const s = core && core.session;
    const active = !!(s && s.active && Date.now() < s.endsAt) && shouldGuard();
    if (active) {
      if (!hostEl || !hostEl.isConnected) build();
      timerEl.textContent = fmt(s.endsAt - Date.now());
      pauseMedia();
    } else if (hostEl) {
      hostEl.remove();
      hostEl = null;
    }
  }

  try {
    chrome.storage.local.get(KEY).then((r) => { core = r[KEY]; evaluate(); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch[KEY]) { core = ch[KEY].newValue; evaluate(); }
    });
  } catch (e) { return; }

  // Covers SPA navigation (YouTube -> /shorts) and the countdown.
  timer = setInterval(evaluate, 1000);
  window.addEventListener('yt-navigate-finish', evaluate);
})();
