# CHANGELOG — Ministry of Truth (Web Implementation)

## [2.4.0] — True tab seam, stable tabs, readability pass
- **Tabs genuinely seamless:** active tab drops 1px over the card edge with
  a card-colored border (the old shadow read as a seam line) and attached
  cards use a square top-left corner (no wedge gap).
- **Tabs never jump:** the dial strip now renders above the tabs on the
  draft view too, so switching keeps tabs at the same Y. Archivist tip
  removed (it pushed tabs around and ate space).
- **Readability (external UI critique):** topbar subtitle tracking tamed +
  brightened; ON RECORD evidence humanized (“Photographic evidence exists”,
  “23 dead (morgue count)”) in a classified-tag style; whim keywords as
  chips with explicit “Obey: Leader Mood +2”; ticker fades at edges and
  pauses on hover; directive restyle (no input look); card reordered to
  crisis → demand → constraints → directive.
- **Meters + topbar:** danger-threshold ticks on bars, thicker bars, trend
  delta tooltips (+flash on change), day progress track with act segments,
  DAY chip in the bottom bar, 15-day topbar kept; phase pill shrunk with a
  sized stamp icon (the giant sun is gone — task uses the stamp mark);
  abandon × tinted red against misclicks; All-meters link matches.
- Severity as five pips (exact value in tooltip). Committed UI regression
  suite: 45 offline tests. Skipped from the critique: font swap, case-file
  ornaments (fights minimalism), angle stamps, redaction bars, icon-set
  swap, heavy interactions.

## [2.3.0] — Minimal desk: seamless tabs, clean task card, no ghostwriter
- **Tabs attach to the card.** Task ⇄ Draft tabs sit flush on the top-left
  of the content card (folder-tab style, active tab merges into the card)
  instead of floating in the corner.
- **Minimal task card.** Removed the TASK — DAY kicker and the severity
  left-border; title + compact SEV badge, brief, objective, on-record
  facts, Leader memo. Nothing else.
- **HOW TO SURVIVE primer removed** from the desk (it forced scrolling).
  The full guide lives one click away: topbar **?** on every screen plus a
  small **SURVIVAL GUIDE** button under the draft box.
- **Ghostwriter removed** (it defeated the purpose) with its button, uses,
  data, and config; **CLEAR** button and **CRAFT REMINDERS** box removed
  from the draft — the Survival Guide covers craft.
- Dead CSS pruned (incident borders, primer grid, tray, cta-row).

## [2.2.0] — 15-day campaign, final score, tabs, consistent chrome
- **Campaign shortened 30 → 15 days** (casual-friendly, finishable): acts
  end days 3/8/12/15, mid-campaign crisis day 6, Night of Knives day 10,
  election eve day 14, reputation locks day 8, defect window last 3 days,
  news-cycle recovery every 5 days. Pre-2.2 saves keep 30-day endDay.
- **Final score + best scores.** Deterministic total (outcome + days +
  ending + standings − disasters, × difficulty 0.8/1.0/1.3) with itemized
  breakdown; best per difficulty persisted in LocalStorage with NEW BEST
  badge. Screenshot it, compare it.
- **Regime comparator + fun stats** on the game-over screen: which
  historical oppressive regime the run resembles (ending first, else
  dominant strategy — 12 endings + 7 strategies, each with a quip), plus
  statements, favorite strategy, red lines, twists, whims, scapegoats.
- **Task ⇄ Draft tabs** (top-left): one-click switching, draft saved on
  every switch. TASK/BACK buttons removed.
- **One primary action in the sticky bottom bar** on every screen
  (DRAFT COVER-UP → / PUBLISH STATEMENT → / NEXT TASK →). The duplicate
  in-content publish button is gone; Archive/Codex/Ledger moved to topbar
  icons (available everywhere).
- New tracked stats: red lines tripped, twists weathered, whims obeyed
  (with pre-2.2 save compat). 36 offline tests.

## [2.1.0] — Fair scoring, difficulties, secretary review, more scandals
- **Fixed: every statement sank every meter.** Live Jev centers ~0.2–0.4 vs
  mock ~0.5–0.6, so a shared neutral of 0.5 painted all live rounds red.
  Now: per-mode, per-faction neutral centering, persona-embedded prompt pack
  that rewards craft, compliance threshold 0.75 (hedged spin ~0.6, genuine
  flags ~0.85+), expanded lexicon with inflection coverage.
- **Fixed: press red line fired on all good spin (11/12).** Hostile persona
  answered “yes, lies” to every compliance ballot. Now: a neutral
  fact-checking judge rules all red lines; press questions are grounded in
  the incident brief (contradicts brief / denies briefed incident /
  impossible figures); elite/foreign triplets are disjunctive so either
  violation subtype reaches majority; elite Q1 names the 4 protected roster
  figures so connected scapegoats detonate live too. Verified by probes:
  zero-dead, 134%, blame-generals, seize-assets, pure-threat, Halda all
  trip; good spin and Duna stay clean.
- **Tuning harness:** `test/fixtures.mjs` (12 cover-ups, 5 tiers),
  `npm run calibrate` runs them through the real Jev API into
  `test/live-report.json`. 29 offline tests (`npm test`) lock the fun
  contract: excellent pleases most, typical pleases some, dodges gain
  nothing.
- **One 30-day campaign + 3 difficulties** (Stringer / Spin Doctor /
  Minister of Truth): separate good-vs-bad delta scaling + start offsets.
  Swift-mode toggle removed; difficulty shown in the topbar.
- **Secretary review button replaces auto-vibes** in the editor: one tiny
  2-question call on demand, returns strategy + tone + ≤2 vague hints, never
  numbers. Typing judges nothing (word count only).
- **Content:** 10 new scandals (49 total, 41 in the daily draw pool); 35%/day twist randomizer with
  real effects (leaked photos, +Heat, severity); escalating recycle
  (“— Again”, “— The Sequel”, …) replaces the rain filler.
- Strategy detection widened (admission ≥2, scapegoat `ordered/commanded`,
  short-text euphemism); silence double-penalized (no gains + suspicion).
- Save format still v2; pre-2.1 saves default to Spin Doctor difficulty.

## [2.0.0] — Statement-first refinement
- **Three view states:** Task Desk → Draft & Publish → Round Impact Summary.
  One cover-up task per day, framed as `TASK: {scandal} + objective`.
- **One open statement box.** Removed: frame picker, Lead/Body/Close
  fields, spin-device equipping, triage response buttons, briefing slots.
- **Text-driven actions.** Sacrifice (name a culprit), deflect
  ("meanwhile, abroad"), deny, confess, and dodge are detected from prose
  as 7 strategies (mock detectors + live `strategy` choice question).
- **Short wins.** 25–120 words earns credibility; >180 rambles; <12 dodges.
- **Round Impact Summary:** strategy stamp, visual before→after deltas,
  five faction reaction-quote cards, headlines, tomorrow preview.
- **Micromanagement removed:** wallet/currencies, upgrade branches, night
  shopping, leak tokens + buybacks, Memory Hole (Archive now immutable),
  Ghostwriter refills. Weekly news-cycle recovery replaces night actions.
- Defect/Confess trigger from the summary (Defect: last 5 days + Heat<50).
- Six headline dials (Public Trust, Media Suspicion, Military Loyalty,
  Coup Risk, Elite Alignment, Leader Mood); full meters one click away.
- Save format v2 (incompatible with v1 runs). GDD §0 documents the pivot.
- Fixed: Help/Settings modals never rendered on the title screen (early
  return skipped the modal append) — found by the v2 click harness.
- Draft assists (strategy, tone, Archive scan, vibes, whim, word verdict)
  now update live on every keystroke without a rerender (caret-safe).
- Verified: full-campaign sim, 39-click headless harness, and a live
  headless-Chrome pass (all 3 states, responsive 700/1280px with 0px
  overflow, victory/loss/NG+ flows) — 0 console/page errors.

## [1.1.1] — Dead-buttons fix
- **Fixed: all buttons dead after BEGIN SERVICE.** The dashboard called an
  undefined `confirmedQuirks()` helper, so the first dashboard render threw
  and the page froze on the title screen. Every click after that hit the
  same throw — hence total silence.
- Added a global error banner (`src/main.js`): any future crash shows an
  on-screen notice instead of failing silently.
- Verified with a headless click harness driving all 52 actions across the
  full loop (title → draft → publish → fallout → night → sleep → gameover
  → NG+): 0 failures.
- Verified again in real headless Chrome via CDP against the live server:
  every screen clicked through, responsive overflow 0px at 700px and
  1280px, victory + loss + NG+ + abandon flows, 0 console/page errors.
- Added a gated `?debug` handle (`window.__MOT__`) in `src/main.js` for
  automated browser testing; inert unless the query param is present.

## [1.1.0] — Live Jev (TypeSafe System One) integration
- **Real System One batch calls.** Live mode now speaks the actual
  `POST https://api.typesafe.ai/v1/systemone` contract (`jev-latest`):
  one batched request per briefing mapping the 5-call faction stack onto
  `score` (affect/credibility/salience), `noul` best-of-3 (compliance),
  and `choice` (narrative fit, tone, contradiction checks).
- **Server-side key.** The Ministry server reads `TYPESAFE_API_KEY` from
  `.env` (see `.env.example`) and proxies via same-origin
  `POST /api/jev-evaluate`; the key never enters the browser.
  `GET /api/jev-status` reports configured/model without leaking the key.
- **Settings UX:** live/mock toggle with server status readout and a
  one-call **Test live connection** button (reports model, latency,
  tokens). Ghost preview stays dark in live mode to save calls.
- Verified end-to-end against production (`jev-1.13.0`, 569ms, 302+20
  tokens on the probe). Any live failure still degrades to the Standby
  Tribunal with a banner.

All GDD refinements made during development, with reasoning. GDD v1.0 remains
the design authority; this log records where implementation deliberately
diverged to improve clarity, balance, or fun.

## [1.0.0] — Initial web implementation

### Added
- **Swift Regime (24-day) campaign option.** Full 60-day campaign ships as
  designed, but playtesting-by-simulation showed 8–12 min/day × 60 is a big
  ask for learning the game. Swift compresses acts (6/12/18/24) with the same
  systems, scripted crises, and finale gates. Reasoning: faster onboarding,
  faster balance iteration, same satire per minute.
- **Fixer's nightly device offer.** GDD earns devices via play but names no
  acquisition path; the night shop now offers one unowned device per night for
  ₮1,500 propaganda funds. Reasoning: gives Propaganda Funds a reliable sink
  and guarantees device progression even on quiet runs.
- **Near-empty draft warning** in the publish confirm modal. Reasoning:
  publishing a 0-word statement is a legal move (it scores terribly), but
  new players did it by accident; the warning preserves the choice.
- **Backroom-first finale ordering.** The Puppet Transition alliance path
  (Leader < 50, Elites ≥ 70, Military ≥ 60) is checked before ballot-based
  gates, and every result band resolves: ≥70 → Autocracy/Puppet, 55–69 →
  Managed, 50–54 → Puppet, <50 → Trial loss. Reasoning: GDD gates left bands
  (e.g. 62% with low press trust) unresolved; every run now ends legibly.

### Changed
- **Word budget 40–220 (soft target ~140)** instead of GDD's 60–180.
  Reasoning: playtest question C1 asks whether 60–180 is homework; the wider
  band with a soft target keeps long-form craft viable without punishing
  tight gray-fog statements. Tunable in `src/config.js` (`CAMPAIGN`).
- **Ghost faction preview kept, numbers withheld.** GDD C2 debates the ghost
  preview; implementation shows directional vibes (😊/😐/😟/😡) only, and
  shows nothing (?) in live-API mode where peeking would cost calls.
  Reasoning: scouting, not cheating — and zero API cost.
- **Red-line best-of-3 simulated, not literal.** In mock mode the three
  ballots are one deterministic read plus a 12% seeded clearance (a flaky
  flag clears). Live-API mode sends one compliance call per faction;
  operators wanting literal best-of-3 can set it server-side. Reasoning:
  identical player-facing fairness at 1/3 the latency; the Translator still
  clamps everything.
- **Incident deck: 36 hand-written + infinite dynamic.** GDD targets 120+;
  v1.0 ships 36 incidents across all 7 categories plus generated
  archive-callback and mockery meta-incidents (unbounded). The deck module
  is data-only, so content drops in as plain blocks. Reasoning: ship a
  complete, balanced, fully-wired game now; content scales without code.
- **Quirk drift / NG+ simplified.** Confirmed quirks persist into Second
  Term; live-ops drift marking (UNRELIABLE) is not implemented because mock
  mode has no upstream model updates. If live Jev versioning is added, the
  `versionId` hook in `JevClient` is the integration point.
- **Assassination loss fully gated, no bodyguard memo.** GDD's "ignored
  bodyguard memo" precondition is folded into the trigger (2+ connected
  sacrifices, Heat > 70, day > 30, 5%/day seeded roll). Reasoning: one fewer
  bespoke memo system; the trigger remains rare, legible, and earned.
- **Election model is meter-derived, no separate rigging minigame.**
  Reasoning: GDD never specifies rigging mechanics beyond gates; the result
  formula (approval, suspicion, unrest, control, press fear) is exposed in
  `finale()` and tunable.

### Fixed (implementation bugs caught by simulation)
- Score bucketing now rounds to 2dp (was emitting 0.6000000000000001).
- `fester` assignments previously left incidents stuck between systems;
  Fester is now cleanly "no response," applied at publish.
- Dial trend arrows compare against day-start baselines (were re-baselined
  mid-day, flattening all trends).

### Content notes
- Setting remains the fictional Republic of Vestria throughout; no real
  persons, parties, or countries. Victim names are procedural and
  bureaucratic, never graphic. Horror arrives as paperwork.
