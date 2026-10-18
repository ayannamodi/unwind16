# Unwind ’16: Nostalgia Study Companion

*Curing 2026 brainrot with 2016 tactile nostalgia.*

## Run it
1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked** and choose this folder.
3. Click the Unwind ’16 icon in the toolbar. The side panel opens.

Needs Chrome 114+ (side panel API).

## What's inside
- **Focus engine**: 1 / 15 / 25 / 50 min sprints. The clock lives in the background worker, so closing the panel never loses progress. Every full minute is banked as a Focus Minute in `chrome.storage.local`.
- **Brainrot block**: during a sprint, TikTok, Instagram and YouTube Shorts get a 2016-meme overlay (video is paused). "Take me back to work" closes the tab; there is also an honest "end my sprint" escape hatch.
- **Advent drawer** (pin up to 2 at a time): Instant Camera + Bottle Flip (0 min), Fidget Spinner (10), Leopard Rug (15), Panda Squishy (25), Holo Slime (30), Glitter Phone Case (40), Drink Bar with Unicorn Frappe + Pink Drink (45).
- **Sound**: all synthesized with WebAudio (no asset files), master volume clamped to 0.2, mute button in the header.

## Tuning
- Unlock tiers: `TOYS` in `js/state.js`
- Bottle-flip difficulty: `STAND_TOLERANCE` / `WOBBLE_TOLERANCE` in `js/fidgets/bottle.js`
- Slime colours: `PALETTES` in `js/fidgets/slime.js` (galaxy + sunset; add more stops arrays to add colours)
- Each fidget lives in its own file under `js/fidgets/`
- Blocked sites: `content_scripts.matches` in `manifest.json` and `shouldGuard()` in `content.js`

## Demo tip
Open **demo tools** at the bottom of the panel: `+15 focus mins` to show unlocks fast, `reset progress` to start over. The `1m demo` sprint length shows the full timer flow in a minute.

---

## Devpost draft

**Tagline:** Curing 2026 brainrot with 2016 tactile nostalgia.

**Inspiration.** Studying in 2026 means fighting hyper-stimulating vertical feeds engineered to eat your afternoon. When focus dips, or ADHD restlessness kicks in, the algorithm is one tab away. 2016 internet culture was different: slime, squishies, liquid-glitter phone cases, bottle flips, instant cameras. Tactile, silly, finite.

**What it does.** Unwind ’16 is a Chrome side panel that pairs Pomodoro sprints with low-stimulation fidgets. Minutes studied unlock new toys in an advent-calendar drawer, and you pin only one or two so the screen stays calm. If you try to open TikTok, Instagram or Shorts mid-sprint, a 2016 meme gently sends you back.

**How we built it.** Manifest V3 extension, side panel API, a timestamp-based session clock in a service worker with alarms, HTML5 canvas for every fidget, and WebAudio-synthesized sounds capped at low volume.

**Challenges.** Making fidgets feel good without being addictive: no streak pressure, no autoplay, quiet audio, reduced-motion support.

**What's next.** Break-time suggestions, a per-site allowlist, and more 2016 fidgets.
