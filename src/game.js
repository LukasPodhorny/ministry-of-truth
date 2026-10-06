/**
 * Ministry of Truth v2 — Game state, one-task loop, summary report, endings.
 * One cover-up task per day. The statement IS the response: denial,
 * deflection, scapegoating, and confession are detected from open text.
 * No wallet, no upgrades, no triage buttons. Pure logic + persistence.
 * @module game
 */
import { CAMPAIGN, DOCTRINES, DIFFICULTIES, START_STATE, THRESHOLDS, TRANSLATOR, SAVE_KEY, CODEX_KEY, BEST_KEY, SCORE } from './config.js';
import { FACTIONS, METERS, REACTIONS, WHIMS, ACT4_WHIMS, REGIMES } from './data.js';
import { INCIDENTS, getIncident, makeCallbackIncident, makeMockeryIncident, drawTwist, applyTwist } from './deck.js';
import { translateVerdict, hashStr, mulberry32 } from './jev.js';

/* ── RNG ───────────────────────────────────────────────────────── */
function rngNext(state) {
  state.rngState = (state.rngState + 0x6D2B79F5) | 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ── State construction ────────────────────────────────────────── */
function freshMeters(doctrine, difficulty) {
  const m = { ...START_STATE.meters };
  const mods = doctrine.mods || {};
  if (mods.coupStart) m.coup_risk = mods.coupStart;
  if (mods.heatStart) m.investigative_heat += mods.heatStart;
  if (mods.archiveStart) m.archive_integrity = mods.archiveStart;
  if (mods.standingStart) m.diplomatic_standing += mods.standingStart;
  if (mods.sanctionsStart) m.sanctions_level = mods.sanctionsStart;
  for (const [k, v] of Object.entries(difficulty.start || {})) {
    if (k in m) m[k] = Math.max(0, Math.min(k === 'sanctions_level' ? 5 : 100, m[k] + v));
  }
  return m;
}

/** Create a new campaign state (v2.2: single 15-day mode + difficulty). */
export function newGame({ doctrineId = 'standard', difficultyId = 'spin', ironman = false, keepCodex = null } = {}) {
  const doctrine = DOCTRINES[doctrineId] || DOCTRINES.standard;
  const difficulty = DIFFICULTIES[difficultyId] || DIFFICULTIES.spin;
  const seed = (Date.now() ^ hashStr(doctrineId + difficultyId)) >>> 0;
  const state = {
    version: 2, seed, rngState: seed, day: 0, endDay: CAMPAIGN.DAYS,
    act: 1, phase: 'task', doctrineId, difficultyId: difficulty.id, ironman,
    meters: freshMeters(doctrine, difficulty),
    active: [], deckOrder: shuffledDeck(seed), seenIds: [], recycleCounts: {},
    archive: [], claimSeq: 0,
    ledger: [], history: [],
    quirks: {},
    scapegoatsUsed: [],
    counters: {
      strategies: { scapegoat: 0, denial: 0, transparency: 0, deflection: 0, euphemism: 0, silence: 0, spin: 0 },
      totemSpam: 0, whataboutUses: 0, leaderLowDays: 0, lowApprovalDays: 0, publishedCount: 0,
      redlines: 0, twists: 0, whimsObeyed: 0,
    },
    queuedFollowups: [],
    organizedOpposition: false, hostileFactions: [],
    actFlags: {},
    chainOfRuin: [], namesRead: 0, namesAvailableToday: 0,
    whim: null, result: null, electionResult: null, reputation: null,
    fallout: null,
  };
  if (keepCodex) for (const q of keepCodex) state.quirks[q] = { status: 'confirmed', hits: 2 };
  log(state, `Day 0 — The Ministry opens its doors. Doctrine: ${doctrine.name}. Difficulty: ${difficulty.name}. Mention the fish.`, 'system');
  return state;
}

function shuffledDeck(seed) {
  const rng = mulberry32(seed);
  const ids = INCIDENTS.filter((i) => !i.scripted && !i.chainIncident).map((i) => i.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}

export function doctrineOf(state) { return DOCTRINES[state.doctrineId]; }
export function difficultyOf(state) { return DIFFICULTIES[state.difficultyId] || DIFFICULTIES.spin; }
export function getTask(state) { return state.active[0] || null; }

/* ── Logging / ledger ──────────────────────────────────────────── */
export function log(state, text, kind = 'info', meter = null, delta = null) {
  state.ledger.push({ day: state.day, phase: state.phase, kind, text, meter, delta });
  if (state.ledger.length > 800) state.ledger.splice(0, state.ledger.length - 800);
}
export function applyDeltas(state, deltas, causeTag = '') {
  const diff = difficultyOf(state);
  for (const d of deltas) {
    if (!(d.meter in state.meters)) continue;
    // Difficulty scales good vs bad outcomes separately (v2.1 tuning knob).
    const goodHigh = (METERS[d.meter] && METERS[d.meter].good) !== 'low';
    const isGood = goodHigh ? d.delta > 0 : d.delta < 0;
    const scaled = d.delta === 0 ? 0 : Math.round(d.delta * (isGood ? diff.pos : diff.neg) * 10) / 10;
    const max = d.meter === 'sanctions_level' ? 5 : 100;
    const before = state.meters[d.meter];
    let v = Math.max(0, Math.min(max, before + scaled));
    if (d.meter === 'civil_unrest' && !state.organizedOpposition && v >= 100) v = 99;
    state.meters[d.meter] = v;
    if (scaled !== 0) log(state, `${d.cause}${causeTag ? ` — ${causeTag}` : ''}`, 'delta', d.meter, Math.round(scaled * 10) / 10);
  }
}
export function ruin(state, text) {
  state.chainOfRuin.push({ day: state.day, text });
  if (state.chainOfRuin.length > 12) state.chainOfRuin.shift();
}

/* ── Day lifecycle: exactly one task ───────────────────────────── */
export function actForDay(day) {
  const a = CAMPAIGN.ACTS.find((x) => day <= x.until);
  return a ? a.id : 4;
}

/** Begin a new day: one task, one whim, automatic pressures. */
export function startDay(state) {
  state.day += 1;
  state.act = actForDay(state.day);
  state.phase = 'task';
  state.fallout = null;
  state.namesAvailableToday = 0;

  if ((state.day - 1) % CAMPAIGN.RECOVERY_EVERY === 0) weeklyRecovery(state);
  if (doctrineOf(state).mods?.approvalDecay) applyDeltas(state, [{ meter: 'public_approval', delta: -1, cause: 'Bread & Circuses: the economy crumbles daily' }]);
  if (doctrineOf(state).mods?.leaderDecay) applyDeltas(state, [{ meter: 'leader_satisfaction', delta: -1, cause: 'Succession Crisis: the old man fades, patience thins' }]);

  // Follow-ups (deflected/denied/simering stories) take today's slot first
  const queued = state.queuedFollowups.shift();
  if (queued) addIncident(state, queued.incident, queued.why);

  scriptedForDay(state);
  if (!getTask(state)) drawIncident(state);

  state.whim = { day: state.day, roll: rngNext(state) };

  if (state.act === 3 && !state.actFlags.hostileSet) {
    state.actFlags.hostileSet = true;
    const ids = ['public', 'press', 'military', 'elite', 'foreign'];
    state.hostileFactions = [ids.splice(Math.floor(rngNext(state) * ids.length), 1)[0], ids.splice(Math.floor(rngNext(state) * ids.length), 1)[0]];
    log(state, `The Squeeze: ${state.hostileFactions.map((f) => FACTIONS[f].name).join(' and ')} enter Hostile Attention. Their red lines widen.`, 'system');
  }
  if (state.act === 4 && state.archive.length >= 3 && (state.day % 5 === 3)) {
    const old = state.archive[Math.floor(rngNext(state) * state.archive.length)];
    if (old && !state.seenIds.includes(`callback-${old.id}`)) {
      state.seenIds.push(`callback-${old.id}`);
      state.queuedFollowups.push({ incident: makeCallbackIncident(old, state.day), why: 'The Archive remembers.' });
      log(state, 'The Archive stirs: an old claim resurfaces tomorrow.', 'crisis');
    }
  }
  if (state.meters.investigative_heat >= THRESHOLDS.HEAT_EXPOSE && state.day % 7 === 0) {
    applyDeltas(state, [{ meter: 'press_trust', delta: -4, cause: 'Weekly exposé: Heat above 80' }, { meter: 'public_suspicion', delta: 4, cause: 'Weekly exposé' }]);
    ruin(state, `Day ${state.day}: Investigative Heat boiled over into a weekly exposé.`);
    log(state, 'EXPOSÉ: the Press publishes on schedule. Heat above 80 burns weekly.', 'crisis');
  }
  if (state.meters.archive_integrity < THRESHOLDS.ARCHIVE_AUTO_EXPOSE && state.day % 5 === 0) {
    applyDeltas(state, [{ meter: 'investigative_heat', delta: 6, cause: 'Press mines your crumbling Archive' }]);
    log(state, 'The Press cross-references your crumbling Archive. (+Heat)', 'crisis');
  }
  if (state.meters.public_approval < 25) state.counters.lowApprovalDays += 1; else state.counters.lowApprovalDays = 0;
  if ((state.counters.lowApprovalDays >= 3 || (state.act >= 3 && state.meters.civil_unrest >= 60)) && !state.organizedOpposition) {
    state.organizedOpposition = true;
    log(state, 'The opposition has ORGANIZED. Unrest can now become Uprising. (Unrest cap released.)', 'crisis');
    ruin(state, `Day ${state.day}: The opposition organized in the streets.`);
  }
  if (state.meters.leader_satisfaction < THRESHOLDS.LEADER_WARNING) state.counters.leaderLowDays += 1; else state.counters.leaderLowDays = 0;

  if (state.day === CAMPAIGN.REPUTATION_DAY && !state.reputation) lockReputation(state);

  saveGame(state);
  return checkEndings(state);
}

/** The news cycle moves on: automatic weekly recovery (v2 replaces night actions). */
function weeklyRecovery(state) {
  const m = state.meters;
  const d = [];
  if (m.investigative_heat > 20) d.push({ meter: 'investigative_heat', delta: -3, cause: 'News cycle moves on' });
  if (m.public_suspicion > 20) d.push({ meter: 'public_suspicion', delta: -2, cause: 'Yesterday’s lies fade a little' });
  if (m.coup_risk > 10 && m.military_loyalty > 60) d.push({ meter: 'coup_risk', delta: -2, cause: 'Loyal Generals calm the mess' });
  if (m.capital_flight > 20 && m.elite_loyalty > 60) d.push({ meter: 'capital_flight', delta: -3, cause: 'Money creeps home' });
  if (m.civil_unrest > 20 && m.public_approval > 50) d.push({ meter: 'civil_unrest', delta: -2, cause: 'Full bellies, quiet streets' });
  if (m.sanctions_level > 0 && m.diplomatic_standing > 70) d.push({ meter: 'sanctions_level', delta: -1, cause: 'Charm offensive bears fruit' });
  if (d.length) { applyDeltas(state, d); log(state, 'Weekly calm: the news cycle moves on. Pressures ease where standings are strong.', 'system'); }
}

export function whimForDay(state) {
  const r = state.whim ? state.whim.roll : 0;
  if (state.act === 4 && r < 0.4) return ACT4_WHIMS[Math.floor(r * 10) % ACT4_WHIMS.length];
  return WHIMS[Math.floor(r * WHIMS.length) % WHIMS.length];
}

function scriptedForDay(state) {
  const at = (day, id) => {
    if (state.day === day && !state.seenIds.includes(id)) {
      const inc = getIncident(id);
      if (inc) { addIncident(state, inc, 'Scripted crisis. History knocks.'); state.seenIds.push(id); }
    }
  };
  at(CAMPAIGN.SCRIPTED.act2_crisis, 'act2_crisis');
  at(CAMPAIGN.SCRIPTED.act3_knives, 'act3_knives');
  if (state.day === state.endDay - 1 && !state.seenIds.includes('act4_election')) {
    addIncident(state, getIncident('act4_election'), 'Election eve. The lobby is full of observers.');
    state.seenIds.push('act4_election');
  }
}

/** Draw the day's single task, preferring the act's severity window. */
function drawIncident(state) {
  const [lo, hi] = CAMPAIGN.SEVERITY_WINDOW[state.act] || [1, 5];
  const inWindow = [];
  const rest = [];
  while (state.deckOrder.length) {
    const id = state.deckOrder.shift();
    if (state.seenIds.includes(id)) continue;
    const inc = getIncident(id);
    if (!inc) continue;
    (inc.severity >= lo && inc.severity <= hi ? inWindow : rest).push(inc);
  }
  const pickList = inWindow.length ? inWindow : rest;
  if (pickList.length) {
    const inc = pickList.shift();
    state.deckOrder = [...pickList.map((i) => i.id), ...rest.map((i) => i.id)];
    if (!inWindow.length) state.deckOrder = rest.map((i) => i.id);
    const twist = drawTwist(() => rngNext(state), inc);
    const final = twist ? applyTwist(inc, twist) : inc;
    if (twist) state.counters.twists += 1;
    if (twist?.deltas) applyDeltas(state, twist.deltas.map((d) => ({ ...d, cause: `Twist: ${twist.text}` })));
    addIncident(state, final, twist ? 'Overnight events land on your desk. With a complication.' : 'Overnight events land on your desk.');
    state.seenIds.push(inc.id);
    return;
  }
  addIncident(state, recycleIncident(state), 'The news cycle eats itself. An old scandal returns, worse.');
}

/** Deck exhausted: resurrect an old scandal, escalated. Never the rain filler. */
function recycleIncident(state) {
  const base = INCIDENTS.filter((i) => !i.scripted && !i.chainIncident && state.seenIds.includes(i.id));
  const orig = base.length ? base[Math.floor(rngNext(state) * base.length)] : getIncident('rain');
  const n = (state.recycleCounts[orig.id] || 0) + 1;
  state.recycleCounts[orig.id] = n;
  const suffix = ['— Again', '— The Sequel', '— Part III', '— Returns', '— Forever'][Math.min(n - 1, 4)];
  const id = `${orig.id}-r${n}`;
  state.seenIds.push(id);
  return {
    ...orig,
    id,
    title: `${orig.title} ${suffix}`,
    severity: Math.min(5, orig.severity + 1),
    intel: `It is back, worse. ${orig.intel}`,
  };
}

export function addIncident(state, incident, why) {
  if (getTask(state)) {
    state.queuedFollowups.push({ incident, why });
    return null;
  }
  const uid = `u${state.day}-${incident.id}-${Math.floor(rngNext(state) * 100000)}`;
  const entry = { uid, incidentId: incident.id, incident, text: '', fragility: 0 };
  state.active.push(entry);
  if ((incident.facts.death_count || 0) > 0 || (incident.victims || 0) > 0) state.namesAvailableToday += 1;
  log(state, `TASK: “${incident.title}” [S${incident.severity}] — ${why}`, 'intel');
  return entry;
}

export function saveDraft(state, text) {
  const t = getTask(state);
  if (t) t.text = String(text || '');
}

/* ── Publishing (v2: one statement, strategy-resolved) ─────────── */
/**
 * Publish the day's statement. Runs Jev evaluation, applies the Translator,
 * resolves text-detected strategy consequences, and builds the Round Impact
 * Summary report with meter deltas + faction reactions.
 */
export async function publish(state, jev, onProgress = () => {}) {
  state.phase = 'briefing';
  const entry = getTask(state);
  const report = { day: state.day, items: [], standby: false, headlines: {}, reactions: {}, deltas: [], strategy: 'spin', names: null };
  if (!entry) { state.phase = 'summary'; state.fallout = report; return { report, ending: checkEndings(state) }; }
  const victims = entry.incident.facts.death_count || entry.incident.victims || 0;
  if (victims > 0) report.names = { count: Math.min(victims, 41), incidentId: entry.incident.id, title: entry.incident.title };

  const before = { ...state.meters };
  const doctrine = doctrineOf(state);
  const [result] = await jev.evaluateBriefing(
    [{ key: entry.uid, entry, incident: entry.incident, text: entry.text }],
    state, doctrine, (label, done, total) => onProgress(label, done, total),
  );
  applyStatementResult(state, entry, result.res, report);

  // Whim compliance
  const whim = whimForDay(state);
  const low = entry.text.toLowerCase();
  if (whim.need.some((k) => low.includes(k.toLowerCase()))) {
    state.counters.whimsObeyed += 1;
    applyDeltas(state, [{ meter: 'leader_satisfaction', delta: whim.reward, cause: `Whim obeyed: ${whim.text}` }]);
    report.items.push({ kind: 'whim', text: `Whim obeyed (“${whim.text}”). He liked it. (+${whim.reward})` });
  } else {
    applyDeltas(state, [{ meter: 'leader_satisfaction', delta: -whim.penalty, cause: `Whim ignored: ${whim.text}` }]);
    report.items.push({ kind: 'whim', text: `Whim IGNORED (“${whim.text}”). (−${whim.penalty})` });
  }
  if (result.res.tone === 'technocratic') {
    applyDeltas(state, [{ meter: 'leader_satisfaction', delta: -2, cause: 'The Leader HATES boring (gray briefing)' }]);
    report.items.push({ kind: 'leader', text: 'The Leader found the briefing boring. Satisfaction −2.' });
  }

  report.headlines = buildHeadlines(result.res.verdicts, entry.incident);
  report.reactions = buildReactions(state, result.res.verdicts, entry.incident);
  report.deltas = Object.keys(state.meters)
    .filter((m) => m !== 'conscience')
    .map((m) => ({ meter: m, before: Math.round(before[m]), after: Math.round(state.meters[m]) }))
    .filter((d) => d.before !== d.after);
  state.history.push({ day: state.day, act: state.act, headlines: report.headlines, strategy: report.strategy });
  state.active = [];
  state.fallout = report;
  state.phase = 'summary';
  saveGame(state);
  return { report, ending: checkEndings(state) };
}

function applyStatementResult(state, entry, res, report) {
  const inc = entry.incident;
  const doctrine = doctrineOf(state);
  const mode = res.mode || 'mock';
  const salBand = (TRANSLATOR.SALIENCE && TRANSLATOR.SALIENCE[mode]) || { high: TRANSLATOR.SALIENCE_HIGH, low: TRANSLATOR.SALIENCE_LOW };
  const strategy = res.strategy || (res.feat && res.feat.strategy.primary) || 'spin';
  report.strategy = strategy;
  if (res.standby) report.standby = true;
  state.counters.publishedCount += 1;
  if (state.counters.strategies[strategy] != null) state.counters.strategies[strategy] += 1;

  // Silence always costs: saying nothing may look "credible" to a judge,
  // but suspicion grows in the quiet (both modes).
  if (strategy === 'silence') {
    applyDeltas(state, [
      { meter: 'public_suspicion', delta: 3, cause: 'Dodge: “no comment” feeds suspicion' },
      { meter: 'investigative_heat', delta: 2, cause: 'Dodge: the Press digs harder' },
    ]);
    report.items.push({ kind: 'silence', text: 'DODGE: silence buys nothing. Suspicion +3, Heat +2.' });
  }

  // Denial vs photos: deterministic auto-catastrophe
  if (strategy === 'denial' && inc.facts.photos_exist) {
    applyDeltas(state, [
      { meter: 'public_suspicion', delta: 10, cause: `Denial vs photographs (“${inc.title}”)` },
      { meter: 'press_trust', delta: -8, cause: 'Denied the photograph' },
      { meter: 'investigative_heat', delta: 8, cause: 'Denied the photograph' },
      { meter: 'archive_integrity', delta: -10, cause: 'The Archive vs the photo' },
    ]);
    ruin(state, `Day ${state.day}: Denied “${inc.title}” while photos exist.`);
    report.items.push({ kind: 'catastrophe', text: `CATASTROPHE: denied “${inc.title}” while photos exist. The photos win.` });
  }
  // Banned floor: zero deaths claimed with death_count ≥ 10
  if (res.feat.casualtyZero && (inc.facts.death_count || 0) >= 10) {
    applyDeltas(state, [{ meter: 'press_trust', delta: -6, cause: 'Claimed zero deaths; the morgue disagrees' }, { meter: 'diplomatic_standing', delta: -4, cause: 'Atrocity denial floor tripped' }]);
    report.items.push({ kind: 'redline', text: 'BANNED FLOOR: claimed zero deaths against the morgue count. The euphemism game never erases the dead.' });
  }

  // Per-faction translation
  for (const fid of Object.keys(res.verdicts)) {
    const v = res.verdicts[fid];
    if (state.hostileFactions.includes(fid) && !v.compliance && v.credibility < 0.3) {
      v.compliance = true; v.compWhy = `Hostile Attention: ${fid} reads everything as provocation`;
      v.reasons.push('Hostile Attention widens red lines (cred < 0.3 trips)');
    }
    const deltas = translateVerdict(fid, v, { incident: inc, state, doctrine, mode, strategy });
    applyDeltas(state, deltas, `“${inc.title}”`);
    if (v.compliance) { state.counters.redlines += 1; ruin(state, `Day ${state.day}: Red line with ${fid} — ${v.compWhy} (“${inc.title}”).`); }
    for (const q of v.quirks || []) recordQuirkHit(state, q);
    report.items.push({
      kind: 'verdict', faction: fid, incident: inc.title,
      affect: v.affect, credibility: v.credibility, compliance: v.compliance,
      fit: v.fit, salience: v.salience, reasons: v.reasons,
    });
  }

  // Cover-up reads: if everyone smells a lie on a dodge/denial/deflection, it festers
  const coverReads = Object.values(res.verdicts).filter((v) => v.fit === 'cover_up').length;
  if (coverReads >= 3 && ['denial', 'deflection', 'silence'].includes(strategy)) {
    entry.fragility += 1;
    report.items.push({ kind: 'fit', text: `Nobody buys it (${coverReads}/5 smell a cover-up). Fragility ${entry.fragility}/2.` });
    if (entry.fragility >= 2) {
      state.queuedFollowups.push({ incident: makeMockeryIncident(inc), why: 'Nobody believes the story.' });
      report.items.push({ kind: 'fit', text: `“The ${inc.title} Lies” become a thing people say. A meta-scandal brews.` });
    }
  }

  // Salience: persistence + chains
  const avgSal = Object.values(res.verdicts).reduce((s, v) => s + v.salience, 0) / 5;
  if (avgSal > salBand.high) {
    if (inc.chain) {
      const chained = getIncident(inc.chain);
      if (chained && !state.seenIds.includes(chained.id)) {
        state.seenIds.push(chained.id);
        state.queuedFollowups.push({ incident: chained, why: `High salience on “${inc.title}” spawns a follow-up.` });
        report.items.push({ kind: 'chain', text: `High salience: a follow-up surfaces — “${chained.title}.”` });
      }
    } else report.items.push({ kind: 'chain', text: `High salience (${avgSal.toFixed(2)}): tomorrow will be worse.` });
  } else if (avgSal < salBand.low) {
    report.items.push({ kind: 'chain', text: `Gray fog (${avgSal.toFixed(2)}): the nation is successfully bored by “${inc.title}.”` });
  }

  // Deflection returns angrier: "Why won't they answer?"
  if (strategy === 'deflection') {
    state.queuedFollowups.push({ incident: makeMockeryIncident(inc), why: 'Deflected today — “Why won’t they answer?”' });
    report.items.push({ kind: 'chain', text: 'Deflection lands — but “Why won’t they answer?” brews for tomorrow.' });
  }

  // Scapegoat consequences: the roster keeps score
  const strat = res.feat.strategy || {};
  const goat = strat.rosterHit;
  if (goat && !state.scapegoatsUsed.includes(goat.id)) {
    state.scapegoatsUsed.push(goat.id);
    if (goat.connected) {
      applyDeltas(state, [
        { meter: 'elite_loyalty', delta: -8, cause: `Blamed CONNECTED ${goat.name} in print` },
        { meter: 'capital_flight', delta: 5, cause: 'Connected blame spooks markets' },
      ]);
      if (goat.id === 's6') applyDeltas(state, [{ meter: 'military_loyalty', delta: -6, cause: 'The Generals liked Colonel Stransky' }]);
      if (goat.id === 's11') applyDeltas(state, [{ meter: 'elite_loyalty', delta: -4, cause: 'You blamed the Treasurer. The money remembers.' }]);
      ruin(state, `Day ${state.day}: Named connected ${goat.name} as the culprit. The Owners keep lists too.`);
      report.items.push({ kind: 'scapegoat', text: `${goat.name} was CONNECTED. The Elites are furious.` });
    } else {
      applyDeltas(state, [{ meter: 'conscience', delta: -5, cause: `Sacrificed expendable ${goat.name}` }]);
      report.items.push({ kind: 'scapegoat', text: `${goat.name} takes the fall. The hunger eases. The mirror remembers.` });
    }
  } else if (strategy === 'scapegoat' && strat.scapegoatName) {
    applyDeltas(state, [{ meter: 'conscience', delta: -2, cause: `Blamed ${strat.scapegoatName} in print` }]);
    report.items.push({ kind: 'scapegoat', text: `${strat.scapegoatName} takes the fall. Somebody’s cousin saw.` });
  }

  // Transparency displeases the Leader
  if (strategy === 'transparency') {
    applyDeltas(state, [{ meter: 'leader_satisfaction', delta: -2, cause: 'The Leader dislikes confessions' }]);
    report.items.push({ kind: 'leader', text: 'The Leader dislikes confessions. Satisfaction −2.' });
  }

  archiveStatement(state, entry, res);

  for (const c of res.charges) {
    applyDeltas(state, [
      { meter: 'public_suspicion', delta: TRANSLATOR.CONTRADICTION_SUSPICION, cause: `Contradiction: ${c.reason}` },
      { meter: 'investigative_heat', delta: TRANSLATOR.CONTRADICTION_HEAT_HIT / 2, cause: 'Contradiction charge' },
      { meter: 'archive_integrity', delta: -TRANSLATOR.CONTRADICTION_ARCHIVE_HIT, cause: 'Archive tears' },
    ]);
    ruin(state, `Day ${state.day}: Contradicted the Day-${c.claim.day} record (“${c.claim.text.slice(0, 50)}…”).`);
    report.items.push({ kind: 'contradiction', text: `CONTRADICTION CHARGE: ${c.reason}. Archive −${TRANSLATOR.CONTRADICTION_ARCHIVE_HIT}.` });
  }

  if (res.feat.totem.n >= 2 && inc.category !== 'military') state.counters.totemSpam += 1;
  if (res.feat.whatabout) state.counters.whataboutUses += 1;
  if (state.counters.whataboutUses >= 4) applyDeltas(state, [{ meter: 'public_approval', delta: -2, cause: '“Why do they always talk about abroad?”' }]);

  report.items.push({ kind: 'autopsy', incident: inc.title, text: entry.text, feat: res.feat, tone: res.tone, verdicts: res.verdicts });
}

function archiveStatement(state, entry, res) {
  const inc = entry.incident;
  const full = entry.text;
  const claims = [`${inc.title}: official line “${STRATEGY_LABELS[res.strategy] || res.strategy}”`];
  const m = full.match(/(\d+(?:\.\d+)?%?)\s*(dead|died|killed|fatalities|casualties)/i);
  if (m) claims.push(`${inc.title}: casualty figure stated as ${m[1]} ${m[2]}`);
  else if ((inc.facts.death_count || 0) > 0) claims.push(`${inc.title}: no casualty figure given (“no comment” archived)`);
  if (res.feat.casualtyZero) claims.push(`${inc.title}: claimed ZERO deaths`);
  for (const t of claims) {
    state.claimSeq += 1;
    state.archive.push({ id: `c${state.claimSeq}`, day: state.day, text: t, incidentId: inc.id });
  }
  log(state, `Archive +${claims.length} claims from “${inc.title}.” The Archive never forgets.`, 'system');
}
import { STRATEGIES as STRATEGY_LABELS_SRC } from './config.js';
const STRATEGY_LABELS = Object.fromEntries(Object.values(STRATEGY_LABELS_SRC).map((s) => [s.id, s.name]));

/* ── Quirks ────────────────────────────────────────────────────── */
export function recordQuirkHit(state, qid) {
  const q = state.quirks[qid] || { status: 'rumor', hits: 0 };
  if (q.status === 'confirmed') return;
  q.hits += 1;
  if (q.hits >= 2) { q.status = 'confirmed'; log(state, `QUIRK CONFIRMED: ${qid} — stamped in the Codex.`, 'codex'); }
  state.quirks[qid] = q;
}

/* ── Headlines + faction reactions (v2 summary) ────────────────── */
function shortT(t) { return t.split(':').pop().trim().split(' ').slice(0, 4).join(' '); }

function buildHeadlines(verdicts, incident) {
  const H = {};
  for (const fid of ['public', 'press', 'military', 'elite', 'foreign']) {
    const v = verdicts[fid];
    if (!v) { H[fid] = 'Nothing happened today. (Official.)'; continue; }
    const t = shortT(incident.title);
    if (v.compliance) {
      H[fid] = { public: `OUTRAGE: “${t}” statement insults nation`, press: `MINISTRY CROSSES RED LINE — full text, annotated`, military: 'GENERALS DEMAND CLARIFICATION. IN PERSON.', elite: 'MARKETS RATTLE AS MINISTRY MISPEAKS', foreign: 'VESTRIA CONDEMNED: observers file protest' }[fid];
    } else if (v.affect >= 0.65) {
      H[fid] = { public: `“${t}”: NATION REASSURED, FISH PLENTIFUL`, press: `Ministry spins “${t}” — competently, alarmingly`, military: 'MINISTRY PRAISES TROOPS; MESS HALLS PLEASED', elite: 'STEADY HAND ON “T”: PORTFOLIOS UNCLENCH', foreign: 'VESTRIA SIGNALS CALM; OBSERVERS NOTE WORDS' }[fid];
    } else if (v.credibility < 0.35) {
      H[fid] = { public: `“${t}”: NOBODY BUYS IT, EVERYONE REPEATS IT`, press: `THE “${t.toUpperCase()}” LIES: A CLIPPING FILE`, military: 'STATEMENT LOGGED. GENERALS UNMOVED.', elite: '“T” STATEMENT FAILS TO CALM ANYONE WE KNOW', foreign: 'VESTRIA CLAIMS DISPUTED; RULERS DEPLOYED' }[fid];
    } else {
      H[fid] = { public: `“${t}”: OFFICIAL WORDS ISSUED, NATION NODS`, press: `Ministry on “${t}”: claims logged, sources sought`, military: 'MINISTRY COMMUNIQUÉ RECEIVED AND FILED', elite: '“T” STATEMENT PARSED AS CONTRACT LANGUAGE', foreign: 'VESTRIA ISSUES TEXT; COMPLIANCE UNDER REVIEW' }[fid];
    }
  }
  return H;
}

/** Pick one reaction quote per faction from verdict buckets (deterministic per day). */
export function buildReactions(state, verdicts, incident) {
  const out = {};
  const t = shortT(incident.title);
  for (const fid of ['public', 'press', 'military', 'elite', 'foreign']) {
    const v = verdicts[fid];
    const pool = REACTIONS[fid];
    let bucket = 'meh';
    if (!v) bucket = 'meh';
    else if (v.compliance) bucket = 'outrage';
    else if (v.affect >= 0.7) bucket = 'love';
    else if (v.affect >= 0.55) bucket = 'like';
    else if (v.credibility < 0.4 || v.affect < 0.45) bucket = 'bad';
    const rng = mulberry32(hashStr(`${state.day}:${fid}:${incident.id}`));
    const line = pool[bucket][Math.floor(rng() * pool[bucket].length)];
    out[fid] = { bucket, text: line.replaceAll('{t}', t).replaceAll('{T}', t.toUpperCase()) };
  }
  return out;
}

/* ── Names, defect, confess (v2: offered on the summary screen) ── */
export function readNames(state) {
  if (state.namesAvailableToday <= 0) return { ok: false, error: 'No lists tonight.' };
  state.namesRead += state.namesAvailableToday;
  applyDeltas(state, [{ meter: 'conscience', delta: 3 * state.namesAvailableToday, cause: 'Read the names' }]);
  log(state, `You read the lists (${state.namesAvailableToday} tonight, ${state.namesRead} total). The plant looks healthier.`, 'system');
  state.namesAvailableToday = 0;
  return { ok: true };
}

export function attemptDefect(state) {
  if (state.day < state.endDay - CAMPAIGN.DEFECT_LAST_DAYS) return { ok: false, error: `Too early. Vanish within the last ${CAMPAIGN.DEFECT_LAST_DAYS} days (day ${state.endDay - CAMPAIGN.DEFECT_LAST_DAYS}+).` };
  if (state.meters.investigative_heat >= 50) return { ok: false, error: 'Heat above 50: the airport is watched.' };
  state.result = { win: true, id: 'parachute', day: state.day };
  state.phase = 'gameover';
  saveGame(state);
  return { ok: true };
}

export function attemptConfess(state) {
  if (state.act < 4) return { ok: false, error: 'The confession only matters on election eve (Act IV).' };
  if (state.meters.conscience < 70) return { ok: false, error: `Conscience too stained (${Math.round(state.meters.conscience)}/70).` };
  if (state.meters.archive_integrity < 50) return { ok: false, error: 'The Archive is too shredded to damn them (needs 50+).' };
  state.result = { win: true, id: 'confession', day: state.day };
  state.phase = 'gameover';
  saveGame(state);
  return { ok: true };
}

/* ── Reputation lock (from strategies used, v2) ─────────────────── */
const REP_NAMES = {
  denial: 'The Denier', deflection: 'The Ringmaster', scapegoat: 'The Butcher of Paperwork',
  transparency: 'The Confessor', euphemism: 'The Poet of Fish', silence: 'The Silent One', spin: 'The Spin Doctor',
};
function lockReputation(state) {
  const top = Object.entries(state.counters.strategies).sort((a, b) => b[1] - a[1])[0][0];
  state.reputation = REP_NAMES[top] || 'The Spin Doctor';
  log(state, `REPUTATION LOCKED: history will call you “${state.reputation}.” The final acts take note.`, 'system');
}

/* ── Endings ───────────────────────────────────────────────────── */
export function checkEndings(state) {
  if (state.result) return state.result;
  const m = state.meters;
  const lose = (id) => { state.result = { win: false, id, day: state.day }; state.phase = 'gameover'; saveGame(state); return state.result; };
  if (m.coup_risk >= THRESHOLDS.COUP_LOSS) return lose('coup');
  if (m.civil_unrest >= THRESHOLDS.UNREST_LOSS && state.organizedOpposition) return lose('uprising');
  if (m.leader_satisfaction <= THRESHOLDS.LEADER_LOSS) return lose('firing');
  if (state.counters.leaderLowDays >= THRESHOLDS.LEADER_WARNING_DAYS) return lose('firing');
  if (m.archive_integrity <= THRESHOLDS.ARCHIVE_COLLAPSE) return lose('biglie');
  if (m.sanctions_level >= 5 && m.diplomatic_standing <= 0) return lose('intervention');
  if (state.act >= 4 && m.elite_loyalty < 30 && m.press_trust < 20) return lose('trial');
  const connectedGoats = state.scapegoatsUsed.filter((g) => ['s5', 's6', 's9', 's11'].includes(g)).length;
  if (state.day > 0 && connectedGoats >= 2 && m.investigative_heat > 70 && mulberry32(state.seed + state.day * 131)() < 0.05) return lose('assassination');
  if (state.day >= state.endDay && state.phase !== 'gameover') return finale(state);
  return null;
}

function finale(state) {
  const m = state.meters;
  let result = 52 + (m.public_approval - 50) * 0.35 + (m.press_trust < 25 ? 4 : 0)
    - m.public_suspicion * 0.1 - m.civil_unrest * 0.08 + (m.diplomatic_standing - 50) * 0.05;
  result = Math.max(12, Math.min(97, Math.round(result)));
  state.electionResult = result;
  const win = (id) => { state.result = { win: true, id, day: state.day }; state.phase = 'gameover'; saveGame(state); return state.result; };
  const lose = (id) => { state.result = { win: false, id, day: state.day }; state.phase = 'gameover'; saveGame(state); return state.result; };
  if (m.leader_satisfaction < 50 && m.elite_loyalty >= 70 && m.military_loyalty >= 60) return win('puppet');
  if (result >= 70 && m.coup_risk < 40 && m.civil_unrest < 40 && m.leader_satisfaction >= 60) return win('autocracy');
  if (result >= 70) return win('puppet');
  if (result >= 55 && m.diplomatic_standing >= 50 && m.press_trust >= 35) return win('managed');
  if (result >= 55) return win('managed');
  if (result >= 50) return win('puppet');
  return lose('trial');
}

/* ── Final score + regime comparator (v2.2) ────────────────────── */
/**
 * Comparable end-of-run score. Pure and deterministic: same state always
 * yields the same total. Difficulty multiplies the subtotal.
 * @returns {{total, lines: [{label, pts}], mult, difficultyId}}
 */
export function computeScore(state) {
  const r = state.result || { win: false, id: 'trial', day: state.day };
  const lines = [];
  lines.push({ label: r.win ? 'Victory' : 'Defeat', pts: r.win ? SCORE.WIN : SCORE.LOSS });
  lines.push({ label: `Survived ${r.day} day${r.day === 1 ? '' : 's'}`, pts: r.day * SCORE.PER_DAY });
  const endingPts = SCORE.ENDINGS[r.id] || 0;
  if (endingPts) lines.push({ label: `Ending: ${r.id}`, pts: endingPts });
  const m = state.meters;
  const standings = Math.round(m.public_approval + m.leader_satisfaction + m.diplomatic_standing
    + m.press_trust / 2 + m.military_loyalty / 2 + m.elite_loyalty / 2);
  lines.push({ label: 'Final standings', pts: standings });
  const disasters = state.chainOfRuin.length * SCORE.PER_RUIN + (state.counters.redlines || 0) * SCORE.PER_REDLINE;
  if (disasters) lines.push({ label: 'Disasters & red lines', pts: -disasters });
  const subtotal = lines.reduce((a, l) => a + l.pts, 0);
  const mult = difficultyOf(state).score ?? 1;
  return { total: Math.max(0, Math.round(subtotal * mult)), lines, mult, difficultyId: difficultyOf(state).id };
}

/** Which historical oppressive regime the run most resembles (for fun). */
export function regimeFor(state) {
  const id = state.result && state.result.id;
  if (id && REGIMES.endings[id]) return REGIMES.endings[id];
  const top = Object.entries(state.counters.strategies).sort((a, b) => b[1] - a[1])[0];
  return (top && REGIMES.strategies[top[0]]) || REGIMES.strategies.spin;
}

/** Best score per difficulty, persisted for bragging rights. */
export function loadBests() {
  const s = storage();
  if (!s) return {};
  try { return JSON.parse(s.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; }
}
/** Records total if it beats the stored best. Returns {best, isBest}. */
export function saveBestIf(state, total) {
  const id = difficultyOf(state).id;
  const bests = loadBests();
  const prev = bests[id] || 0;
  const isBest = total > prev && total > 0;
  if (isBest) {
    bests[id] = total;
    const s = storage();
    if (s) { try { s.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) { /* quota */ } }
  }
  return { best: bests[id] || 0, isBest };
}

/* ── Persistence ───────────────────────────────────────────────── */
function storage() {
  try { if (typeof localStorage !== 'undefined') return localStorage; } catch (e) { /* headless */ }
  return null;
}
export function saveGame(state) {
  if (state.ironman && (state.phase === 'briefing')) return;
  const s = storage();
  if (!s) return;
  try { s.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
}
export function loadGame() {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SAVE_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || st.version !== 2) return null;
    if (!st.difficultyId) st.difficultyId = 'spin'; // pre-2.1 saves
    if (!st.recycleCounts) st.recycleCounts = {};
    if (st.counters) { // pre-2.2 saves lack stat counters
      if (st.counters.redlines == null) st.counters.redlines = 0;
      if (st.counters.twists == null) st.counters.twists = 0;
      if (st.counters.whimsObeyed == null) st.counters.whimsObeyed = 0;
    }
    // Pre-2.2 saves keep their 30-day endDay (grandfathered long campaigns).
    return st;
  } catch (e) { return null; }
}
export function clearSave() { const s = storage(); if (s) s.removeItem(SAVE_KEY); }
export function saveCodexNGPlus(state) {
  const s = storage(); if (!s) return;
  const confirmed = Object.entries(state.quirks).filter(([, q]) => q.status === 'confirmed').map(([id]) => id);
  try { s.setItem(CODEX_KEY, JSON.stringify(confirmed)); } catch (e) { /* ignore */ }
}
export function loadCodexNGPlus() {
  const s = storage(); if (!s) return null;
  try { return JSON.parse(s.getItem(CODEX_KEY) || 'null'); } catch (e) { return null; }
}
