# MINISTRY OF TRUTH — Spin Doctor Simulator

> You are the lie that keeps the regime alive.

A complete, playable political-strategy web game from `GDD.md`: draft cover
stories for the regime's crimes, and watch five fast, literal-minded Jev
factions score every word. Fully playable **offline** via the built-in mock
Jev ensemble; point it at a live Jev endpoint for real judgments.

## Run

```sh
npm start
```

Then open **http://localhost:8077/** in a browser. No build step, no
dependencies (the server is Node builtins only). `npm start -- --port 9000`
overrides the port.

## Play (v2.2: one 15-day campaign, 3 difficulties)

Pick a doctrine and a difficulty (**Stringer** forgiving / **Spin Doctor**
intended / **Minister of Truth** merciless), then:

1. **Task Desk** — read today's TASK: one scandal, one plain objective,
   sometimes with a TWIST (leaked photo, meddling stringers, rain).
2. **Draft** — write the cover-up in one open box. Deny it, deflect it
   ("meanwhile, abroad"), blame someone **by name**, or confess with
   numbers. 25–120 words hits hardest. Stuck? **Ask the secretary** —
   one vague review, never numbers. Then **Publish**.
3. **Round Impact** — strategy stamp, visual meter deltas, five faction
   reaction quotes, headlines, tomorrow preview. Then **Next Task**.

Switch Task ⇄ Draft with the tabs (top-left); the sticky bottom bar always
holds the one primary action. Survive 15 days for a **final score** with an
itemized breakdown, a persistent best per difficulty, and the verdict on
which historical regime your reign most resembled.

There are no action buttons for sacrificing, deflecting, or denying — your
words ARE the actions, judged by Jev. Full primer in-game: **How to Play**
(? button). Mention the fish.

## Architecture

```
index.html            shell
styles/theme.css      design tokens + all component styles (reskin here)
src/config.js         balance knobs, doctrines, tone matrix, strategies (tune here)
src/data.js           factions, quirks, reactions, roster, whims, endings
src/deck.js           incident deck (data-only: a new scandal is a new block)
src/jev.js            text features, strategy detection, mock Jev, translator, JevClient
src/game.js           state, one-task loop, archive, reactions, endings, saves
src/assets.js         Asset Manager: ALL icons/art (zero hardcoded graphics)
src/audio.js          procedural WebAudio SFX (toggleable)
src/ui.js             title, Task Desk, Draft, terminal
src/screens.js        Round Impact Summary, game over, modals
src/app.js            app singleton + settings
src/main.js           boot
server.mjs            zero-dependency server + live-Jev proxy (project runner)
```

Separation of concerns: **Engine/State ⇄ UI ⇄ Assets/Theme**. Game logic
never touches art; all content is data; all tuning lives in `config.js`.

## Jev integration

Settings → Jev Evaluator → **Live Jev API**. Contract:

```
Ministry server, which holds the key — it never enters the browser:

1. Put your key in `.env` (see `.env.example`): `TYPESAFE_API_KEY=…`
2. Restart the server: `npm start`
3. In-game: Settings → Jev Evaluator → **Live Jev** → **Test live connection**

Live mode sends each briefing as **one batched call** to
`POST https://api.typesafe.ai/v1/systemone` (`model: jev-latest`). The batch
maps the 5-call faction stack onto System One primitives: `score`
(affect/credibility/salience), `noul` best-of-3 (compliance), `choice`
(narrative fit, tone, contradiction checks). Any failure (no key, timeouts,
HTTP errors, incomplete responses) degrades automatically to the
**Standby Tribunal** with an on-screen banner — the run stays completable.

## Saves

Autosaves to LocalStorage at every phase boundary (ironman "One Truth Only"
skips mid-briefing saves). Verdicts are cached per statement-hash + day, so
re-publishing identical text after reload replays cached scores. Confirmed
Codex quirks persist separately for New Game+ ("Second Term").

## Verify

```sh
npm test                    # 36 offline tests: strategy, fun contract, difficulties, hints, deck, campaign, score
npm run calibrate           # 12 fixtures through the real Jev API → test/live-report.json
npm start & sleep 1; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8077/
```
