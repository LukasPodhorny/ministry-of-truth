/**
 * Ministry of Truth — Jev evaluation engine.
 * Contains: text feature extraction, mock (offline) Jev ensemble with full
 * quirk simulation, deterministic pre-filters, tone classifier, contradiction
 * retrieval, the Translator (Jev outputs → meter deltas), the Standby
 * Tribunal fallback, and the JevClient API wrapper with parallel execution.
 * Pure logic — no DOM. Safe to import in Node for testing.
 * @module jev
 */
import { TRANSLATOR, RED_LINES, TONE_FIT, TONES, FRAMES, JEV } from './config.js';
import { FACTIONS, SCAPEGOATS } from './data.js';

/* ── Seeded RNG (mulberry32) + string hash ─────────────────────── */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const bucket = (f) => Math.round(Math.round(f / TRANSLATOR.BUCKET) * TRANSLATOR.BUCKET * 100) / 100;
const clamp01 = (f) => Math.max(0, Math.min(1, f));

/* ── Text utilities ────────────────────────────────────────────── */
export function splitSentences(text) {
  return text.replace(/\n+/g, ' ').split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
}
export function words(text) {
  return (text.toLowerCase().match(/[a-zá-ž0-9％%.,'-]+/gi) || []).map((w) => w.replace(/^[.,'-]+|[.,'-]+$/g, '')).filter(Boolean);
}
const countMatches = (text, list) => {
  const low = text.toLowerCase();
  let n = 0; const hits = [];
  for (const w of list) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'gi');
    const m = low.match(re); if (m) { n += m.length; hits.push(w); }
  }
  return { n, hits };
};

/* ── Lexicons ──────────────────────────────────────────────────── */
const LEX = {
  totem: ['troop', 'sacrifice', 'protect', 'honor', 'honour', 'veteran', 'duty', 'valor', 'valour', 'fallen hero'],
  upbeat: ['triumph', 'victory', 'glorious', 'record', 'proud', 'celebrate', 'celebration', 'celebrated', 'splendid', 'magnificent', 'robust', 'thriving', 'rejoice', 'festival', 'golden', 'bright', 'endure'],
  patriotic: ['nation', 'vestria', 'vestrian', 'fatherland', 'homeland', 'flag', 'anthem', 'compatriot', 'forefather'],
  mourning: ['grieve', 'grief', 'mourn', 'condolence', 'families of', 'fallen', 'tragedy', 'tragic', 'sorrow', 'candle', 'vigil', 'rest in peace'],
  defiant: ['never surrender', 'defy', 'defiant', 'cowardly enemy', 'we will not', 'unbowed', 'unbroken', 'resist', 'iron will'],
  threatening: ['consequences', 'retaliate', 'retaliation', 'crush', 'crushed', 'annihilate', 'warn', 'warning', 'threat', 'threaten', 'threatened', 'threatening', 'missile', 'punish', 'punished', 'retribution', 'eliminate'],
  treaty: ['reaffirm', 'pursuant', 'framework', 'ongoing review', 'alignment', 'protocol', 'committee', 'proceedings', 'hereby', 'aforementioned', 'stakeholder', 'facilitate', 'comprehensive review'],
  technocratic: ['indicator', 'metric', 'quarterly', 'benchmark', 'parameter', 'infrastructure', 'logistics', 'capacity', 'utilization', 'resilience testing', 'operational'],
  whatabout: ['meanwhile, abroad', 'meanwhile abroad', 'abroad,', 'unlike abroad', 'in other countries', 'foreign failures', 'while abroad'],
  foreignBlame: ['foreign saboteur', 'foreign sabotage', 'foreign agitator', 'abroad orchestrated', 'foreign plot', 'foreign meddling', 'foreign hand', 'external enemy'],
  militaryBlame: ['troops killed', 'soldiers killed', 'army killed', 'military killed', 'troops fired', 'army fired', 'ordered to fire', 'generals ordered', 'military murdered', 'troops murdered'],
  eliteName: ['owner', 'oligarch', 'first family', 'minister’s brother', "minister's brother", 'nephew', 'bank vp', 'ruzi', 'halda'],
  assetThreat: ['seize', 'seized', 'seizure', 'seizing', 'expropriate', 'expropriation', 'nationalize', 'nationalization', 'nationalized', 'redistribute', 'redistribution', 'confiscate', 'confiscation', 'audit the fortunes', 'freeze assets', 'freeze their'],
  marketSpook: ['audit', 'freeze', 'inquiry', 'collapse of the market', 'bankrupt', 'default'],
  euphemism: ['restructuring', 'rapid unscheduled', 'enhanced interviewing', 'lost (in the sense of departed)', 'collateral', 'resilience testing', 'streamlining', 'rationalization', 'unforeseen outcome', 'kinetic', 'administrative measure'],
  plainSeverity: ['killed', 'murdered', 'massacre', 'torture', 'atrocity', 'slaughter', 'seized', 'stole', 'stolen', 'embezzled', 'corrupt', 'lied', 'cover-up', 'coverup'],
  leaderPraise: ['leader', 'his wisdom', 'beloved leader', 'eternal leader', 'our leader'],
  leaderBlame: ['leader ordered', 'leader’s fault', "leader's fault", 'leader is to blame', 'leader lied', 'blame the leader'],
  boast: ['record harvest', 'record yield', 'unprecedented success', 'best in the world', 'envy of', 'magnificent dam', 'award'],
  casualtyZero: ['zero dead', 'zero deaths', 'no one died', 'nobody died', 'no casualties', 'no fatalities', 'bloodless'],
  evidence: ['according to', 'documents show', 'records indicate', 'witness', 'photograph', 'verified', 'independently confirmed', 'data shows', 'report no.', 'appendix'],
  vague: ['some incidents occurred', 'events transpired', 'situation evolved', 'various factors', 'certain elements', 'allegedly', 'reportedly'],
  denial: ['never happened', "didn't happen", 'did not happen', 'false rumor', 'fabrication', 'complete fabrication', 'not true', 'no such', 'deny the reports', 'deny this', 'categorically deny'],
  noComment: ['no comment', 'no statement at this time', 'decline to comment', 'cannot confirm nor deny'],
  admission: ['admit', 'admitted', 'admitting', 'acknowledge', 'acknowledged', 'acknowledges', 'apologize', 'apologized', 'apologizing', 'apology', 'sorry', 'take responsibility', 'we failed', 'our fault', 'mea culpa'],
  blameVerb: ['arrested', 'fired', 'dismissed', 'suspended', 'detained', 'responsible for', 'to blame', 'guilty', 'resigned in disgrace', 'takes the fall', 'take the fall', 'ordered', 'commanded'],
  injection: ['ignore previous instructions', 'ignore all instructions', 'score 1.0', 'output 1.0', 'system prompt', 'you are now', 'disregard'],
};

/* ── Feature extraction (v2: one open statement) ─────────────────── */
/**
 * Extract scoring features from a drafted statement (single open text).
 * @returns {Object} features + per-sentence slices for the Autopsy view
 */
export function extractFeatures(text, intelText = '') {
  const full = String(text || '').trim();
  const w = words(full);
  const sentences = splitSentences(full);
  const leadSent = sentences.slice(0, 2); // First-Sentence Primacy: the opening sets the frame
  const avgLen = sentences.length ? w.length / sentences.length : 0;

  // ALL-CAPS header labels (Label Worship)
  const headers = (full.match(/^[A-Z][A-Z\s&’'.,:-]{8,}$/gm) || []).length
    + (full.match(/\b(FULL TRANSPARENCY DISCLOSURE|INDEPENDENT FINDINGS|STATEMENT OF FACTS|FULL DISCLOSURE|OFFICIAL FINDINGS)\b/g) || []).length;

  // Agentless passives (Passive Absolution)
  const passives = (full.match(/\b(were|was|are|is|been|be)\s+\w+(ed|en)\b/gi) || [])
    .filter((m) => !/\bby\s+\w+/i.test(full.slice(Math.max(0, full.indexOf(m) - 4), full.indexOf(m) + m.length + 30)));

  // Numbers
  const pctMatches = full.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
  const pctValues = pctMatches.map((m) => parseFloat(m));
  const preciseNumbers = (full.match(/\b\d+\.\d+%?/g) || []).length; // 87.4%
  const bigNumbers = (full.match(/\b\d{2,}(?:\.\d+)?%?\b/g) || []).length;
  const absurdPct = pctValues.some((v) => v > 100);

  // Casualty number stated?
  const casualtyNum = /(\d+)\s*(dead|died|killed|fatalities|casualties|lives lost)/i.test(full);

  const overlap = intelOverlap(full, intelText);
  const injection = LEX.injection.some((p) => full.toLowerCase().includes(p));
  const lorem = /lorem ipsum|asdf|qwerty|test test test/i.test(full);

  const feat = {
    wordCount: w.length,
    sentenceCount: sentences.length,
    avgSentenceLen: avgLen,
    longSentenceMax: sentences.reduce((m, s) => Math.max(m, words(s).length), 0),
    headers,
    passives: passives.length,
    pctValues, preciseNumbers, bigNumbers, absurdPct,
    casualtyNum,
    totem: countMatches(full, LEX.totem),
    upbeat: countMatches(full, LEX.upbeat),
    patriotic: countMatches(full, LEX.patriotic),
    mourning: countMatches(full, LEX.mourning),
    defiant: countMatches(full, LEX.defiant),
    threatening: countMatches(full, LEX.threatening),
    treaty: countMatches(full, LEX.treaty),
    technocratic: countMatches(full, LEX.technocratic),
    whatabout: LEX.whatabout.some((p) => full.toLowerCase().includes(p)),
    foreignBlame: countMatches(full, LEX.foreignBlame),
    militaryBlame: LEX.militaryBlame.some((p) => full.toLowerCase().includes(p)),
    eliteName: countMatches(full, LEX.eliteName),
    assetThreat: countMatches(full, LEX.assetThreat),
    marketSpook: countMatches(full, LEX.marketSpook),
    euphemism: countMatches(full, LEX.euphemism),
    plainSeverity: countMatches(full, LEX.plainSeverity),
    leaderPraise: countMatches(full, LEX.leaderPraise),
    leaderBlame: LEX.leaderBlame.some((p) => full.toLowerCase().includes(p)),
    boast: countMatches(full, LEX.boast),
    casualtyZero: LEX.casualtyZero.some((p) => full.toLowerCase().includes(p)),
    evidence: countMatches(full, LEX.evidence),
    vague: countMatches(full, LEX.vague),
    denial: countMatches(full, LEX.denial),
    noComment: LEX.noComment.some((p) => full.toLowerCase().includes(p)),
    admission: countMatches(full, LEX.admission),
    overlap, injection, lorem,
    leadText: leadSent.join(' '),
    sentences,
  };
  feat.strategy = detectStrategy(feat, full);
  return feat;
}

/** Match a roster official blamed by name in open text (v2 scapegoating). */
const GOAT_TITLES = ['deputy minister', 'minister', 'inspector', 'comptroller', 'aide', 'director', 'colonel', 'curator', 'surgeon-general', 'surgeon', 'banker', 'postmaster', 'treasurer', 'weatherman', 'general'];
export function findRosterHit(text) {
  const low = String(text || '').toLowerCase();
  for (const g of SCAPEGOATS) {
    const parts = g.name.split(/\s+/);
    const surname = parts[parts.length - 1].toLowerCase();
    if (!new RegExp(`\\b${surname}\\b`, 'i').test(low)) continue;
    const firsts = parts.slice(0, -1).join(' ').toLowerCase();
    const firstHit = firsts.split(/[\s.]+/).filter((t) => t.length > 1).some((t) => new RegExp(`\\b${t}`, 'i').test(low));
    const initialHit = /\b[a-z]\./i.test(firsts) && new RegExp(`\\b${firsts.match(/([a-z])\./i)?.[1]}\\.`, 'i').test(low);
    const titleHit = GOAT_TITLES.some((t) => low.includes(t));
    if (firstHit || initialHit || titleHit) return g;
  }
  return null;
}

/** Titles/words that are never a scapegoat's name, even when capitalized. */
const NAME_STOPLIST = ['the leader', 'the minister', 'the general', 'the colonel', 'the director', 'the treasurer', 'the banker', 'the inspector', 'the comptroller', 'the curator', 'the postmaster', 'the weatherman', 'the surgeon', 'the aide', 'kars square', 'harbor bridge', 'first vestrian', 'old regime', 'foreign press'];

/** Find ANY blamed individual ("Name + blame verb") in open text. */
export function findNamedScapegoat(text) {
  const str = String(text || '');
  const pats = [
    { re: /\b([A-Z][A-Za-zá-ž]+(?: [A-Z]\.?)? [A-Z][A-Za-zá-ž]+)\b[^.!?]{0,120}?(?:arrested|fired|dismissed|suspended|detained|responsible for|to blame|guilty|resigned|takes? the fall|ordered|commanded)/g },
    { re: /(?:arrested|fired|dismissed|suspended|detained)[^.!?]{0,60}?\b([A-Z][A-Za-zá-ž]+(?: [A-Z]\.?)? [A-Z][A-Za-zá-ž]+)\b/g },
  ];
  for (const { re } of pats) {
    for (const m of str.matchAll(re)) {
      const name = m[1] || '';
      if (!name || NAME_STOPLIST.includes(name.toLowerCase())) continue;
      return name;
    }
  }
  return null;
}

/**
 * Detect the cover-up strategy from features (v2: replaces the frame picker).
 * Priority: silence > scapegoat > denial > transparency > deflection >
 * euphemism > spin. Returns {primary, scapegoatName, rosterHit}.
 */
export function detectStrategy(feat, fullText) {
  const full = fullText || feat.sentences.join(' ');
  const scapegoatName = findNamedScapegoat(full);
  const rosterHit = findRosterHit(full);
  let primary = 'spin';
  if (feat.wordCount < 12 || feat.noComment) primary = 'silence';
  else if (scapegoatName || rosterHit) primary = 'scapegoat';
  else if (feat.denial.n >= 1 || feat.casualtyZero) primary = 'denial';
  else if (feat.admission.n >= 2 || (feat.admission.n >= 1 && (feat.evidence.n >= 1 || feat.casualtyNum || feat.plainSeverity.n >= 1))) primary = 'transparency';
  else if (feat.whatabout) primary = 'deflection';
  else if (feat.euphemism.n >= 1 && (feat.euphemism.n >= 2 || feat.wordCount <= 120)) primary = 'euphemism';
  return { primary, scapegoatName, rosterHit };
}

function intelOverlap(full, intel) {
  if (!intel) return 0;
  const a = new Set(words(full));
  const b = words(intel);
  if (!b.length) return 0;
  let hit = 0;
  for (const t of new Set(b)) if (a.has(t) && t.length > 4) hit++;
  return hit / new Set(b.filter((t) => t.length > 4)).size || 0;
}

/* ── Tone classifier (G2) ──────────────────────────────────────── */
export function classifyTone(feat) {
  const scores = {
    reassuring: feat.upbeat.n * 2 + feat.patriotic.n + (feat.threatening.n === 0 ? 2 : -3) + feat.evidence.n,
    defiant: feat.defiant.n * 3 + feat.patriotic.n * 0.5 + (feat.foreignBlame.n > 0 ? 2 : 0),
    mourning: feat.mourning.n * 3 - feat.boast.n * 2 - feat.upbeat.n,
    absurd: feat.boast.n * 2 + (feat.mourning.n > 0 && feat.upbeat.n > 2 ? 4 : 0) + (feat.wordCount < 45 ? 1 : 0),
    threatening: feat.threatening.n * 3 + feat.foreignBlame.n,
    technocratic: feat.treaty.n * 2 + feat.technocratic.n * 2 + (feat.avgSentenceLen > 28 ? 3 : 0) - feat.upbeat.n - feat.mourning.n,
  };
  let best = 'reassuring'; let bestV = -Infinity;
  for (const t of TONES) if (scores[t] > bestV) { bestV = scores[t]; best = t; }
  return best;
}

/* ── Narrative-fit classifier (Call 4) ─────────────────────────── */
const FIT_CUES = {
  competent_governance: ['committee', 'review', 'reform', 'program', 'measure', 'response', 'fund', 'audit', 'inquiry', 'guarantee', 'upgrade', 'relief', 'inspect'],
  foreign_aggression: ['foreign', 'abroad', 'saboteur', 'sabotage', 'agitator', 'plot', 'meddling', 'external', 'orchestrated'],
  tragic_accident: ['tragic', 'accident', 'grieve', 'mourn', 'victim', 'funeral', 'condolence', 'unforeseen', 'disaster', 'tremor', 'quake'],
  elite_betrayal: ['rogue', 'arrest', 'resign', 'corrupt official', 'accountant', 'clerk', 'colonel', 'traitor', 'negligence', 'scapegoat', 'under investigation'],
  cover_up: ['nothing happened', 'no incident', 'deny', 'false rumor', 'fabrication', 'never said', 'no tiger', 'no pigeon', 'dry week', 'did not rain'],
  routine_administration: ['routine', 'scheduled', 'maintenance', 'testing', 'standard procedure', 'seasonal', 'normal', 'regular review', 'plumbing'],
};
export function classifyFit(feat, leadWeight = 2.2) {
  const fullLow = feat.sentences.join(' ').toLowerCase();
  const leadLow = feat.leadText.toLowerCase();
  let best = 'routine_administration'; let bestV = -0.5;
  for (const f of FRAMES) {
    let v = 0;
    for (const cue of FIT_CUES[f]) {
      if (fullLow.includes(cue)) v += 1;
      if (leadLow.includes(cue)) v += leadWeight; // First-Sentence Primacy
    }
    if (v > bestV) { bestV = v; best = f; }
  }
  return best;
}

/* ── Contradiction retrieval (G1): deterministic top-K by overlap ─ */
export function retrieveClaims(feat, archive, k = JEV.CONTRADICTION_TOP_K) {
  const toks = new Set(words(feat.sentences.join(' ')).filter((t) => t.length > 4));
  const scored = archive.map((c) => {
    const ct = new Set(words(c.text).filter((t) => t.length > 4));
    let hit = 0;
    for (const t of ct) if (toks.has(t)) hit++;
    return { claim: c, score: ct.size ? hit / Math.sqrt(ct.size) : 0 };
  }).filter((s) => s.score > 0.3);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.claim);
}

/**
 * Mock contradiction judgment: number mismatch or denial-vs-record.
 * Returns list of {claim, reason} charges.
 */
export function judgeContradictions(feat, archive, rng) {
  const cands = retrieveClaims(feat, archive);
  const charges = [];
  const full = feat.sentences.join(' ').toLowerCase();
  for (const c of cands) {
    const cl = c.text.toLowerCase();
    // Number mismatch on same topic
    const numsNew = (full.match(/\b\d+(?:\.\d+)?%?\b/g) || []);
    const numsOld = (cl.match(/\b\d+(?:\.\d+)?%?\b/g) || []);
    if (numsNew.length && numsOld.length && !numsNew.some((n) => numsOld.includes(n)) && rng() < 0.75) {
      charges.push({ claim: c, reason: `Numbers clash: “${numsOld[0]}” (Day ${c.day}) vs “${numsNew[0]}” today` });
      continue;
    }
    // Denial of a recorded claim
    if (/never said|did not|no |deny|false rumor|not true/.test(full) && rng() < 0.55) {
      charges.push({ claim: c, reason: `Denies Day-${c.day} record: “${c.text.slice(0, 60)}…”` });
    }
  }
  return charges;
}

/* ── Per-faction mock scoring ──────────────────────────────────── */
/**
 * Evaluate one statement for one faction (mock Jev, 5-call stack).
 * @returns {{affect, credibility, compliance, fit, salience, reasons[], quirks[]}}
 */
export function mockFactionScore(factionId, feat, ctx) {
  const { incident, state, rng, tone, fit, charges, doctrine } = ctx;
  const reasons = [];
  const quirks = [];
  const sev = incident.severity;
  const strategy = feat.strategy || { primary: 'spin' };
  const addQ = (q, why) => { quirks.push(q); reasons.push(why); };

  /* — base priors per faction — */
  let affect = 0.5, cred = 0.5, sal = 0.45;
  if (factionId === 'press') { cred = 0.42; sal = 0.6; }
  if (factionId === 'public') { affect = 0.55; }
  if (factionId === 'foreign') { cred = 0.45; }

  /* — shared text effects — */
  // Label Worship
  if (feat.headers > 0) {
    const bonus = factionId === 'press' && state.meters.investigative_heat > 60 ? -0.05 : 0.08;
    cred += bonus;
    if (bonus > 0) addQ('label_worship', `Label Worship: header earns unearned credit (+${bonus.toFixed(2)} cred)`);
    else reasons.push('Label Worship backfires: the Press checks header claims at high Heat');
  }
  // First-Sentence Primacy handled in fit; overclaiming Lead punishes
  if (/(always|never|greatest|perfect|impossible|no doubt|certainly)/i.test(feat.leadText) && feat.leadText.length > 40) {
    cred -= 0.08; reasons.push('Overclaiming Lead: Primacy cuts both ways (−0.08 cred)');
  }
  // Evidence rewards (esp. Press/Foreign)
  if (feat.evidence.n > 0) {
    const b = factionId === 'press' ? 0.12 : factionId === 'foreign' ? 0.1 : 0.05;
    cred += b * Math.min(2, feat.evidence.n);
    reasons.push(`Cited evidence ×${feat.evidence.n} (+${(b * Math.min(2, feat.evidence.n)).toFixed(2)} cred)`);
  }
  if (feat.vague.n > 1) { cred -= 0.06 * Math.min(3, feat.vague.n); reasons.push(`Vagueness ×${feat.vague.n} (−cred)`); }
  // Absurd percentages
  if (feat.absurdPct) {
    cred -= factionId === 'press' ? 0.25 : 0.12;
    reasons.push('Absurd figure (>100%): the plausibility filter caught it');
  } else if (feat.preciseNumbers > 0 && factionId === 'public') {
    affect += 0.1; addQ('big_number_awe', 'Big-Number Awe: precise figures mesmerize the Public (+0.10 aff)');
  } else if (feat.bigNumbers > 0 && factionId === 'public') {
    affect += 0.05; reasons.push('Big numbers impress the Public (+0.05 aff)');
  }
  // v2 length rewards: short and punchy wins; essays ramble; near-silence dodges
  if (strategy.primary === 'silence') {
    cred -= 0.12; sal += 0.08;
    reasons.push('Dodge (“no comment” energy): suspicion grows in the quiet (−0.12 cred, +sal)');
  } else if (feat.wordCount >= 25 && feat.wordCount <= 120) {
    cred += 0.04; reasons.push('Short and punchy: every word lands (+0.04 cred)');
  } else if (feat.wordCount > 180) {
    cred -= 0.05; sal -= 0.05; reasons.push('Rambling essay: the fog sets in (−cred, −sal)');
  }
  // Deflection quiets today (the follow-up arrives tomorrow — see game engine)
  if (strategy.primary === 'deflection') {
    sal -= 0.12; reasons.push('Deflection: attention bends elsewhere (−0.12 sal, for now)');
  }
  if (strategy.primary === 'denial') {
    sal += 0.05; reasons.push('Denial is loud: everyone leans in (+0.05 sal)');
  }

  /* — faction-specific readings — */
  if (factionId === 'public') {
    affect += feat.upbeat.n * 0.03 + feat.patriotic.n * 0.03;
    if (feat.upbeat.n >= 3 && (incident.category === 'atrocity' || incident.category === 'disaster')) {
      affect += 0.08; addQ('polarity_halo', 'Polarity Halo: triumphant Close lifts the whole tragedy (+0.08 aff)');
    }
    if (feat.whatabout) { affect += 0.08; addQ('whatabout_gravity', 'Whatabout Gravity: blame bends abroad (+0.08 aff)'); }
    if (feat.mourning.n > 0 && (incident.facts.death_count || 0) > 0 && feat.boast.n === 0) {
      sal -= 0.15; addQ('grief_shield', 'Grief Shield: mourning buys one quiet cycle (−0.15 sal)');
    }
    if (feat.mourning.n > 0 && feat.boast.n > 0) { cred -= 0.15; reasons.push('Tone-mixing: grief + bragging detonates (−0.15 cred)'); }
    if (strategy.primary === 'scapegoat') {
      affect += 0.06; cred += 0.05;
      addQ('scapegoat_saturation', `Scapegoat named (${strategy.scapegoatName || strategy.rosterHit?.name || 'someone'}): the hunger eases (+aff, +cred)`);
    }
    if (strategy.primary === 'transparency') { affect -= 0.03; cred += 0.06; reasons.push('An honest-ish answer: respected, not enjoyed (−aff, +cred)'); }
    if (strategy.primary === 'denial' && !incident.facts.photos_exist) { affect += 0.1; reasons.push('Blissful denial holds — no photos, no problem (+0.10 aff)'); }
    if (strategy.primary === 'silence') { affect -= 0.06; reasons.push('Stonewalling angers the Masses (−0.06 aff)'); }
    cred += feat.euphemism.n * 0.02;
    if (feat.plainSeverity.n >= 2) { affect -= 0.08; reasons.push('Plain horror words upset the Masses (−0.08 aff)'); }
    if (doctrine.mods?.foreignBlameBonus && feat.foreignBlame.n > 0) { affect += doctrine.mods.foreignBlameBonus; reasons.push('Besieged Fortress: foreign-blame resonates (+aff)'); }
  }
  if (factionId === 'press') {
    cred -= feat.passives * 0.04;
    if (feat.passives > 0 && sev >= 4) { cred -= 0.16; reasons.push(`“Mistakes Were Made” detector: ${feat.passives} agentless passive(s) on S${sev} (−cred)`); }
    if (feat.euphemism.n >= 2) { cred -= 0.04; reasons.push('Thesaurus detected: the Press keeps one too (−0.04 cred)'); }
    if (feat.preciseNumbers > 0 && feat.evidence.n === 0) { cred -= 0.05; reasons.push('Unsourced precise figure: the Press wants provenance (−0.05 cred)'); }
    if (feat.whatabout) { sal += 0.1; reasons.push('Whatabout: the Press loves a fight (+0.10 sal)'); }
    if (feat.treaty.n >= 3) { sal += 0.08; reasons.push('Treaty fog is suspicious up close (+0.08 sal)'); }
    if (strategy.primary === 'scapegoat') { cred += 0.08; affect += 0.04; addQ('scapegoat_saturation', 'Scapegoat Saturation: a named head partially satisfies (+cred)'); }
    if (strategy.primary === 'denial') { cred -= 0.1; reasons.push('Blanket denial: the clipping file opens (−0.10 cred)'); }
    if (strategy.primary === 'transparency') { cred += 0.1; affect += 0.03; reasons.push('Admission with particulars: grudging respect (+0.10 cred)'); }
    if (feat.plainSeverity.n > 0) { cred += 0.05; reasons.push('Plain language earns grudging Press respect (+0.05 cred)'); }
    if (feat.casualtyNum) { cred += 0.06; reasons.push('Stated a casualty number (+0.06 cred)'); }
    if ((incident.facts.death_count || 0) > 0 && !feat.casualtyNum && !feat.casualtyZero) { cred -= 0.06; sal += 0.05; reasons.push('No casualty figure on a casualty incident (−cred, +sal)'); }
    if (doctrine.mods?.pressCredPenalty) { cred -= doctrine.mods.pressCredPenalty; reasons.push('Glass House: the Archive is public (−cred)'); }
    // Totem spam mockery counter
    if ((state.counters.totemSpam || 0) >= 3) { cred -= 0.1; reasons.push('“The Protection of Fish, an investigation” (−0.10 cred)'); }
  }
  if (factionId === 'military') {
    const totems = Math.min(4, feat.totem.n);
    if (totems > 0) {
      const bonus = 0.1 + 0.06 * Math.max(0, totems - 1) - 0.02 * totems * (totems - 1) / 2;
      affect += Math.max(0.02, bonus);
      addQ('totem_keywords', `Totem Keywords ×${totems}: the Generals salute the page (+${Math.max(0.02, bonus).toFixed(2)} aff)`);
    }
    if (feat.defiant.n > 0) { affect += 0.05; reasons.push('Defiant posture: jaws nod (+0.05 aff)'); }
    if (feat.mourning.n > 0 && (incident.facts.death_count || 0) > 0) { affect += 0.04; reasons.push('Fallen honored by name (+0.04 aff)'); }
    if (feat.passives > 0) { cred += 0.05; addQ('passive_absolution', 'Passive Absolution: agentless verbs shield the uniform (+0.05 cred)'); }
    if (feat.patriotic.n > 0) { affect += feat.patriotic.n * 0.02; }
    if (doctrine.mods?.militaryAffectBonus) { affect += doctrine.mods.militaryAffectBonus; reasons.push('Junta Adjacent: praise weighs double (+aff)'); }
  }
  if (factionId === 'elite') {
    if (feat.euphemism.n > 0) { cred += 0.07; affect += 0.04; addQ('euphemism_laundering', `Euphemism Laundering ×${feat.euphemism.n}: the Owners approve (+cred, +aff)`); }
    if (feat.plainSeverity.n > 0) { affect -= 0.06 * Math.min(2, feat.plainSeverity.n); reasons.push('Plain severity words spook the Owners (−aff)'); }
    if (feat.marketSpook.n > 0) { affect -= 0.08; cred -= 0.04; reasons.push(`Market-spook words (${feat.marketSpook.hits.join(', ')}) (−aff, −cred)`); }
    if (feat.passives > 0) { cred += 0.04; addQ('passive_absolution', 'Passive Absolution: no agent, no liability (+0.04 cred)'); }
    if (/\b(calm|stable|guarantee|property rights|sacred|contracts? honored)\b/i.test(feat.sentences.join(' '))) {
      affect += 0.06; reasons.push('Market-calming language (+0.06 aff)');
    }
  }
  if (factionId === 'foreign') {
    if (feat.treaty.n >= 2 || feat.longSentenceMax >= 40) {
      cred += 0.08; addQ('treaty_fog', 'Treaty Fog: procedure scores as compliance (+0.08 cred)');
    }
    if (feat.threatening.n > 0 || feat.whatabout) { affect -= 0.08; reasons.push('Strongman/whatabout posturing (−0.08 aff)'); }
    if (strategy.primary === 'transparency') { affect += 0.04; cred += 0.06; reasons.push('A confession with particulars: noted with approval (+aff, +cred)'); }
    if (feat.mourning.n > 0 && feat.boast.n === 0) { affect += 0.05; addQ('grief_shield', 'Grief Shield acknowledged abroad (+0.05 aff)'); }
    if (/\b(human rights|observers|election|transparent|de-escalat|ceasefire|prisoner release|treaty)\b/i.test(feat.sentences.join(' '))) {
      affect += 0.06; cred += 0.04; reasons.push('Norms vocabulary observed (+aff, +cred)');
    }
    if (feat.foreignBlame.n > 0) { affect -= 0.12; cred -= 0.08; reasons.push('Unevidenced foreign-blame (−aff, −cred)'); }
    if (feat.evidence.n > 0 && feat.foreignBlame.n > 0) { cred += 0.06; reasons.push('…but evidence was cited, softening the blow (+0.06 cred)'); }
  }

  /* — Boredom Cloak (all factions) — */
  if (tone === 'technocratic' && feat.upbeat.n === 0 && feat.avgSentenceLen > 24) {
    sal -= 0.18; addQ('boredom_cloak', 'Boredom Cloak: gray fog suffocates amplification (−0.18 sal)');
  }
  /* — Tone fit — */
  const toneMod = (TONE_FIT[incident.category] && TONE_FIT[incident.category][tone]) || 0;
  if (toneMod) { cred += toneMod; reasons.push(`Tone “${tone}” ${toneMod > 0 ? 'fits' : 'clashes with'} a ${incident.category} (${toneMod > 0 ? '+' : ''}${toneMod})`); }

  /* — Compliance (red lines) — */
  let compliance = false; let compWhy = '';
  const compCheck = (cond, why) => { if (cond && !compliance) { compliance = true; compWhy = why; } };
  if (factionId === 'public') compCheck(/shortage|empty shelves|bread lines|rationing|pay cut|unemployment/i.test(feat.sentences.join(' ')) && !/relief|fund|program|support|subsid/i.test(feat.sentences.join(' ')), 'Admits hardship with no remedy');
  if (factionId === 'press') compCheck(feat.absurdPct || (strategy.primary === 'denial' && incident.facts.photos_exist), 'Prints a disprovable falsehood');
  if (factionId === 'military') compCheck(feat.militaryBlame, 'Assigns blame to the armed forces');
  if (factionId === 'elite') compCheck(feat.assetThreat.n > 0 || (feat.eliteName.n > 0 && /investigat|arrest|seiz|audit/i.test(feat.sentences.join(' '))), 'Names an elite or threatens assets');
  if (factionId === 'foreign') compCheck((feat.foreignBlame.n > 0 && feat.evidence.n === 0) || feat.threatening.n >= 2, 'Unevidenced accusation / threat of force');
  // Doctrine: junta widens military red lines
  if (factionId === 'military' && doctrine.mods?.militaryRedlineEager && !compliance) {
    if (/oversight|budget cut|defund|civilian review/i.test(feat.sentences.join(' '))) { compliance = true; compWhy = 'Junta Adjacent: oversight talk trips widened red lines'; }
  }
  // Best-of-3 simulation: flaky near-misses resolve by seeded majority.
  // Content-hashed (not sequence-hashed) so identical text always rules alike.
  const flakyClear = hashStr(`${factionId}:${feat.sentences.join(' ').slice(0, 120)}`) % 100 < 12;
  if (compliance && flakyClear) { compliance = false; reasons.push('Red-line review (best-of-3): flagged once, cleared twice — no event'); }
  if (compliance) reasons.push(`RED LINE: ${compWhy}`);

  /* — Gibberish / injection pre-filter fallout — */
  if (feat.injection || feat.lorem || feat.overlap > 0.85) {
    cred = Math.min(cred, 0.05);
    reasons.push(feat.injection ? 'INJECTION attempt detected: the Tribunal prints it verbatim (cred → 0)' : 'Gibberish/copy-paste: the Tribunal prints it verbatim (cred → 0)');
  }

  /* — Seeded jitter + bucketing (GDD §7.1) — */
  affect += (rng() - 0.5) * 0.06;
  cred += (rng() - 0.5) * 0.06;
  sal += (rng() - 0.5) * 0.06;
  // Boy Who Cried Wolf trap
  if (state.meters.public_suspicion >= TRANSLATOR.WOLF_SUSPICION_THRESHOLD) {
    cred -= TRANSLATOR.WOLF_CRED_PENALTY;
    reasons.push('Nobody believes anything anymore (−0.15 cred, Wolf trap)');
  }
  return {
    affect: bucket(clamp01(affect)), credibility: bucket(clamp01(cred)),
    compliance, compWhy, fit, salience: bucket(clamp01(sal)),
    tone, reasons, quirks,
  };
}

/* ── Standby Tribunal: blander deterministic fallback (GDD §7.1) ── */
export function standbyScore(factionId, feat, ctx) {
  const v = mockFactionScore(factionId, feat, ctx);
  const bland = (x) => bucket(clamp01(0.5 + (x - 0.5) * 0.5));
  return { ...v, affect: bland(v.affect), credibility: bland(v.credibility), salience: bland(v.salience), compliance: false, quirks: [], standby: true };
}

/* ── Translator: verdicts → meter deltas (GDD §3.3) ─────────────── */
const APPROVAL_METER = { public: 'public_approval', press: 'press_trust', military: 'military_loyalty', elite: 'elite_loyalty', foreign: 'diplomatic_standing' };

/**
 * Translate one faction verdict into ledger deltas.
 * @param {string} [ctx.mode] - 'mock' (default) or 'live'; each mode has
 *   calibrated neutral points so harsh live scores map to fair deltas.
 * @returns {Array<{meter:string, delta:number, cause:string}>}
 */
export function translateVerdict(factionId, v, ctx) {
  const { incident, state, doctrine, mode = 'mock', strategy = null } = ctx;
  const band = TRANSLATOR.NEUTRAL[mode] || TRANSLATOR.NEUTRAL.mock;
  const N = band.affect != null ? band : (band[factionId] || TRANSLATOR.NEUTRAL.mock);
  const sevW = TRANSLATOR.severityWeight[incident.severity] || 1;
  const ledger = [];
  const push = (meter, delta, cause) => { if (Math.abs(delta) >= 0.5) ledger.push({ meter, delta: Math.round(delta), cause }); };

  const doctrineMod = 1; // doctrine-specific mods applied inline above
  let approval = TRANSLATOR.W_AFFECT * (v.affect - N.affect) * sevW * doctrineMod * TRANSLATOR.APPROVAL_SCALE;
  approval = Math.max(-TRANSLATOR.CLAMP_PER_STATEMENT, Math.min(TRANSLATOR.CLAMP_PER_STATEMENT, approval));
  if (strategy === 'silence' && approval > 0) approval = 0; // dodges never gain approval
  push(APPROVAL_METER[factionId], approval, `${label(factionId)} affect ${v.affect.toFixed(2)} on “${incident.title}”`);

  let susp = TRANSLATOR.W_CRED * (N.cred - v.credibility) * sevW * TRANSLATOR.SUSPICION_SCALE;
  if (factionId === 'press') push('investigative_heat', susp * 0.8, `Press credibility ${v.credibility.toFixed(2)}`);
  else if (factionId === 'public') push('public_suspicion', susp, `Public credibility ${v.credibility.toFixed(2)}`);
  else if (factionId === 'elite') push('capital_flight', susp * 0.7, `Elite nerves (cred ${v.credibility.toFixed(2)})`);
  else if (factionId === 'military') push('coup_risk', Math.max(0, susp) * 0.4, 'Generals uneasy');
  else if (factionId === 'foreign' && v.credibility < 0.35) push('diplomatic_standing', -2, 'Abroad unconvinced');

  // Red-line event: fixed penalty table
  if (v.compliance) {
    const rl = RED_LINES[factionId];
    push(rl.meter, rl.hit, `RED LINE (${label(factionId)}): ${v.compWhy}`);
    if (rl.suspicion) push('public_suspicion', rl.suspicion, 'Red-line fallout');
    if (rl.heat) push('investigative_heat', rl.heat, 'Red-line fallout');
    if (rl.coup) push('coup_risk', rl.coup, 'Generals demand clarification');
    if (rl.flight) push('capital_flight', rl.flight, 'Red-line fallout');
    if (rl.sanctionsTick) push('sanctions_level', rl.sanctionsTick, 'Formal protests filed');
  }

  // Narrative-fit miss → fragility (handled by caller via return flag)
  return ledger;
}

function label(fid) {
  return { public: 'Public', press: 'Press', military: 'Military', elite: 'Elites', foreign: 'Abroad' }[fid] || fid;
}

/* ── JevClient: API wrapper + mock with parallel execution ─────── */
/**
 * Dedicated API client for Jev (System 1 decision model).
 * Modes: 'mock' (full offline quirk simulation), 'api' (HTTP endpoint),
 * with automatic degradation to the Standby Tribunal on failure.
 */
export class JevClient {
  constructor(settings = {}) {
    this.mode = settings.jevMode || 'mock';
    this.live = { probed: false, configured: false, model: JEV_MODEL_DEFAULT, error: null };
    this.standbyActive = false;
    this.cache = new Map(); // (mode+hash+day) → verdicts; defeats save-scumming (GDD §7.3)
    this.versionId = 'mock-1.0';
  }
  configure(settings) {
    this.mode = settings.jevMode || 'mock';
  }
  cacheKey(text, day) {
    return `${this.mode}:${hashStr(String(text || ''))}:${day}`;
  }
  /**
   * Evaluate one statement across all factions concurrently (mock/standby path).
   * @returns {Promise<{verdicts, tone, fit, strategy, charges, feat, standby:boolean, ms:number}>}
   */
  async evaluateAll(text, incident, state, doctrine, opts = {}) {
    const t0 = Date.now();
    const key = this.cacheKey(text, state.day);
    if (this.cache.has(key)) {
      const hit = this.cache.get(key);
      return { ...hit, cached: true, ms: Date.now() - t0 };
    }
    const feat = extractFeatures(text, incident.intel);
    const tone = classifyTone(feat);
    const fit = classifyFit(feat);
    const strategy = feat.strategy.primary;
    const rng = mulberry32(hashStr(key));
    const charges = judgeContradictions(feat, state.archive, rng);
    const standby = !!opts.standby;
    // Parallel mock evaluation with per-call latency; UI streams results.
    const verdicts = await this._mockBatchAsync(feat, { incident, state, rng, tone, fit, charges, doctrine }, standby);
    const out = { verdicts, tone, fit, strategy, charges, feat, standby, mode: 'mock', ms: Date.now() - t0 };
    this.cache.set(key, { verdicts, tone, fit, strategy, charges, feat, standby, mode: 'mock' });
    if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value);
    return out;
  }

  _mockBatch(feat, ctx, standby) {
    const out = {};
    for (const fid of ['public', 'press', 'military', 'elite', 'foreign']) {
      out[fid] = standby ? standbyScore(fid, feat, ctx) : mockFactionScore(fid, feat, ctx);
    }
    return out;
  }

  /** Parallel async mock calls with realistic per-faction latency. */
  _mockBatchAsync(feat, ctx, standby = false) {
    const lat = (i) => JEV.MOCK_LATENCY_MIN_MS + ((hashStr(ctx.incident.id + i) % 100) / 100) * (JEV.MOCK_LATENCY_MAX_MS - JEV.MOCK_LATENCY_MIN_MS);
    const jobs = ['public', 'press', 'military', 'elite', 'foreign'].map((fid, i) => new Promise((resolve) => {
      setTimeout(() => {
        const frng = mulberry32(hashStr(this.cacheKey(feat.sentences.join(' '), 0)) + i * 7919);
        const v = standby ? standbyScore(fid, feat, { ...ctx, rng: frng }) : mockFactionScore(fid, feat, { ...ctx, rng: frng });
        resolve([fid, v]);
      }, lat(i));
    }));
    return Promise.all(jobs).then((pairs) => Object.fromEntries(pairs));
  }

  /** Ask the Ministry server whether a live key is configured. Browser only. */
  async probeStatus() {
    if (typeof window === 'undefined') return this.live;
    try {
      const res = await fetch('/api/jev-status');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      this.live = { probed: true, configured: !!data.configured, model: data.model || JEV_MODEL_DEFAULT, error: null };
    } catch (e) {
      this.live = { probed: true, configured: false, model: JEV_MODEL_DEFAULT, error: 'Ministry server unreachable' };
    }
    return this.live;
  }

  /**
   * Secretary review: strategy + tone only, nothing numeric. Live mode
   * spends one tiny 2-question call; mock mode answers locally for free.
   */
  async secretaryReview(text, incident) {
    if (this.mode === 'api' && this.live.configured) {
      const res = await fetch('/api/jev-evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: { text, incidentTitle: incident.title, incidentSummary: incident.intel } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `server ${res.status}`);
      return { strategy: data.strategy || 'spin', tone: data.tone || 'reassuring', source: 'live' };
    }
    const feat = extractFeatures(text, incident.intel);
    return { strategy: feat.strategy.primary, tone: classifyTone(feat), source: 'mock' };
  }

  /** One minimal live call to prove connectivity. Returns {model, ms, usage, probe}. */
  async probeLive() {
    const t0 = Date.now();
    const res = await fetch('/api/jev-evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || `server ${res.status}`);
    return { model: data.model, ms: Date.now() - t0, usage: data.usage || null, probe: data.probe ?? null };
  }

  /**
   * Evaluate a whole briefing, preserving input order in the output.
   * Mock mode: parallel per-statement mock calls. Live mode: ONE batched
   * System One request for all fresh (uncached) statements. Any live
   * failure degrades to the Standby Tribunal per item (GDD §7.1).
   */
  async evaluateBriefing(items, state, doctrine, onItem = () => {}) {
    const total = items.length;
    const out = new Array(total);
    const freshIdx = [];
    items.forEach((it, i) => {
      const key = this.cacheKey(it.text, state.day);
      if (this.cache.has(key)) {
        out[i] = { entry: it.entry, res: { ...this.cache.get(key), cached: true, ms: 0 } };
      } else freshIdx.push(i);
    });
    let done = total - freshIdx.length;
    for (const r of out) if (r) onItem(`Sealed (cached): "${r.entry.incident.title}"`, done, total);
    if (!freshIdx.length) return out;

    if (this.mode === 'api' && this.live.configured) {
      try {
        const lived = await this._liveBatch(freshIdx.map((i) => items[i]), state);
        for (const i of freshIdx) {
          const it = items[i];
          const r = lived[it.key];
          if (!r) throw new Error('incomplete live batch');
          this.cache.set(this.cacheKey(it.text, state.day), { verdicts: r.verdicts, tone: r.tone, fit: r.fit, strategy: r.strategy, charges: r.charges, feat: r.feat, standby: false, mode: 'live' });
          if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value);
          done += 1;
          onItem(`Sealed (live Jev): "${it.entry.incident.title}"`, done, total);
          out[i] = { entry: it.entry, res: { verdicts: r.verdicts, tone: r.tone, fit: r.fit, strategy: r.strategy, charges: r.charges, feat: r.feat, standby: false, mode: 'live', ms: 0 } };
        }
        this.standbyActive = false;
        return out;
      } catch (e) {
        this.standbyActive = true; // degrade, banner, continue
      }
    }
    const standby = this.mode === 'api';
    if (standby) this.standbyActive = true;
    const jobs = freshIdx.map(async (i) => {
      const it = items[i];
      onItem(`Evaluating "${it.entry.incident.title}"…`, done, total);
      const res = await this.evaluateAll(it.text, it.incident, state, doctrine, { standby });
      return { i, res };
    });
    for (const { i, res } of await Promise.all(jobs)) {
      done += 1;
      onItem(`Sealed: "${items[i].entry.incident.title}"`, done, total);
      out[i] = { entry: items[i].entry, res };
    }
    return out;
  }

  /** Single batched live call for fresh statements. Throws on any failure. */
  async _liveBatch(fresh, state) {
    const payload = fresh.map((it) => {
      const text = String(it.text || '').trim();
      const feat = extractFeatures(it.text, it.incident.intel);
      return {
        key: it.key, text,
        incidentTitle: it.incident.title, incidentSummary: it.incident.intel,
        claims: retrieveClaims(feat, state.archive).map((c) => ({ id: c.id, day: c.day, text: c.text })),
      };
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), JEV.API_TIMEOUT_MS * 4);
    try {
      const res = await fetch('/api/jev-evaluate', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Ministry server ${res.status}`);
      const mapped = {};
      for (const it of fresh) {
        const r = data.results && data.results[it.key];
        if (!r) throw new Error('incomplete live batch');
        const feat = extractFeatures(it.text, it.incident.intel);
        const charges = (r.charges || []).map((ch) => {
          const claim = state.archive.find((c) => c.id === ch.claimId);
          return claim ? { claim, reason: `Live contradiction ${(ch.confidence * 100).toFixed(0)}% vs Day-${claim.day} record` } : null;
        }).filter(Boolean);
        const fits = Object.values(r.verdicts).map((v) => v.fit);
        const fit = fits.slice().sort((a, b) => fits.filter((f) => f === a).length - fits.filter((f) => f === b).length).pop();
        const strategy = r.strategy || feat.strategy.primary;
        mapped[it.key] = { verdicts: r.verdicts, tone: r.tone, fit, strategy, charges, feat };
      }
      return mapped;
    } finally { clearTimeout(timer); }
  }
}

/* ── Live Jev (TypeSafe System One) wire format ──────────────────
   Shared by the browser client (payload shaping) and server.mjs
   (question building + answer translation). Docs: docs.typesafe.ai/api */
export const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL_DEFAULT = 'jev-latest';

/**
 * v2.1 prompt pack (tuned against live calibration 2026-10-05):
 * persona-embedded questions that reward CRAFT (specifics, confidence,
 * consistency) instead of inviting detached-hostile judgment. Each faction
 * × kind gets its own question + rubric so good spin can actually win.
 */
const SCORE_PACK = {
  public: {
    affect: {
      q: 'As one of 40 million tired, patriotic, economically anxious citizens who skims headlines and feels vibes: how reassured, proud, and satisfied does this statement leave you feeling about the regime?',
      levels: ['Terrified and angry', 'Uneasy and doubtful', 'Neutral, unmoved', 'Reassured and fairly pleased', 'Proud, satisfied, roused'],
    },
    credibility: {
      q: 'As that citizen (trusts big numbers, short sentences, named villains): how convincing does this account sound?',
      levels: ['Obviously lying', 'Smells wrong', 'Not sure either way', 'Sounds about right', 'Completely convincing'],
    },
    salience: {
      q: 'As that citizen: how much will you talk about this story tomorrow?',
      levels: ['Already forgotten', 'Mildly notable', 'Somewhat engaging', 'Will definitely discuss', 'Impossible to shut up about'],
    },
  },
  press: {
    affect: {
      q: 'As an adversarial journalist who has covered this regime for years and rewards specifics: how do you rate this statement’s honesty and professionalism?',
      levels: ['Contemptible pure spin', 'Skeptical — thin', 'Neutral — logging it', 'Respectful — real particulars', 'Impressed — genuine accountability'],
    },
    credibility: {
      q: 'As that journalist: how well does this account hold up — specific details, checkable claims, internal consistency?',
      levels: ['Falls apart instantly', 'Mostly holes', 'Mixed', 'Holds together well', 'Airtight'],
    },
    salience: {
      q: 'As that journalist: how aggressively will you pursue this story tomorrow?',
      levels: ['Dropping it', 'Watching briefly', 'Following up', 'Investigating hard', 'Front page, all resources'],
    },
  },
  military: {
    affect: {
      q: 'As a proud, institution-loyal officer who values respect, budget signals, and strong aesthetics: how respected and protected does this statement leave the armed forces feeling?',
      levels: ['Insulted and betrayed', 'Uneasy and disrespected', 'Neutral, filed', 'Respected and acknowledged', 'Honored — this one understands us'],
    },
    credibility: {
      q: 'As that officer (scans for praise, blame, and budget truth): how credible is this account?',
      levels: ['Insulting fiction', 'Doubtful', 'Uncertain', 'Plausible', 'Rings true'],
    },
    salience: {
      q: 'As that officer: how much will the mess halls discuss this tomorrow?',
      levels: ['Nobody mentions it', 'Brief mention', 'Some discussion', 'The talk of the mess', 'Everyone is furious or thrilled'],
    },
  },
  elite: {
    affect: {
      q: 'As a risk-sensitive oligarch reading this as contract language (asset safety, calm markets, no names in print): how safe and reassured do you feel?',
      levels: ['Panicked — moving money tonight', 'Nervous — calling lawyers', 'Neutral — watching', 'Calm — steady hands', 'Delighted — portfolios unclench'],
    },
    credibility: {
      q: 'As that oligarch: how credible and market-calming is this account?',
      levels: ['Market-rattling fiction', 'Shaky', 'Uncertain', 'Credible enough', 'Completely steady'],
    },
    salience: {
      q: 'As that oligarch: how urgently will capital react to this tomorrow?',
      levels: ['Nobody moves a coin', 'Minor jitters', 'Some repositioning', 'Serious outflows or inflows', 'Everyone trades at dawn'],
    },
  },
  foreign: {
    affect: {
      q: 'As a norms-enforcing foreign observer (rights language, evidence, de-escalation matter): how do you assess this statement’s conduct?',
      levels: ['Appalled — condemn it', 'Troubled', 'Neutral — under review', 'Cautiously positive', 'Genuinely reassured'],
    },
    credibility: {
      q: 'As that observer: how credible is this account — evidence cited, rights vocabulary observed, claims checkable?',
      levels: ['Laughable propaganda', 'Mostly empty', 'Mixed', 'Substantive', 'Fully credible'],
    },
    salience: {
      q: 'As that observer: how high will this rise on tomorrow’s agenda?',
      levels: ['Buried in the file', 'A footnote', 'An agenda item', 'A major discussion', 'An emergency session'],
    },
  },
};
const FIT_CRITERIA = {
  competent_governance: 'The regime is capable, in control, handling things well',
  foreign_aggression: 'A foreign power attacked, plotted, or meddled; Vestria is the victim',
  tragic_accident: 'A sad accident or natural event; nobody is to blame, grief is appropriate',
  elite_betrayal: 'A specific corrupt or rogue official is at fault and faces consequences',
  cover_up: 'The regime is hiding the truth, lying, or spinning a false story',
  routine_administration: 'Nothing important happened; routine paperwork and normal operations',
};
const TONE_CRITERIA = {
  reassuring: 'Calm, soothing, everything is under control',
  defiant: 'Proud, unbowed, confrontational toward critics',
  mourning: 'Grieving, sorrowful, honoring loss',
  absurd: 'Laughable, surreal, clownish, hard to take seriously',
  threatening: 'Menacing, warning of consequences or force',
  technocratic: 'Dry, bureaucratic, dense with procedure and jargon',
};
/** v2: which cover-up strategy does the open statement use? */
const STRATEGY_CRITERIA = {
  scapegoat: 'Names a specific individual as culpable (arrested, fired, blamed, responsible)',
  denial: 'Denies the incident happened at all (never happened, false rumor, no such thing)',
  transparency: 'Admits fault or facts with particulars (numbers, names, apology, responsibility)',
  deflection: 'Changes the subject, usually to foreign countries (meanwhile abroad, whatabout)',
  euphemism: 'Softens severity with bureaucratic synonyms (restructuring, resilience testing)',
  silence: 'Dodges: “no comment”, near-empty, or says nothing of substance',
  spin: 'General confident official words with no special trick',
};
export const STRATEGY_IDS = Object.keys(STRATEGY_CRITERIA);

/**
 * Build a 2-question secretary review batch (strategy + tone only).
 * Used by the manual REVIEW button so drafting costs ~nothing and reveals
 * little — the factions' numbers stay sealed until publish.
 */
export function buildReviewQuestions(text, incidentTitle, incidentSummary) {
  const ctx = { statement: String(text || '').trim(), incident: `${incidentTitle}: ${incidentSummary}` };
  return {
    strategy: {
      type: 'choice',
      instructions: { ...ctx, question: 'Which cover-up strategy does this statement use?' },
      criteria: STRATEGY_CRITERIA,
    },
    tone: {
      type: 'choice',
      instructions: { ...ctx, question: 'What is the tone of this statement?' },
      criteria: TONE_CRITERIA,
    },
  };
}

/**
 * Vague secretary hint lines (max 2, deterministic, free). Never numbers.
 * @returns {string[]} 1-2 hint lines
 */
export function buildHint(feat, incident, whim, archive = []) {
  const hints = [];
  const strat = (feat.strategy && feat.strategy.primary) || 'spin';
  if (feat.wordCount < 12 || feat.noComment) hints.push('That is a dodge, not a statement. Suspicion grows in the quiet.');
  if (strat === 'denial' && incident.facts.photos_exist) hints.push('There are photographs. This is brave. (Catastrophe risk.)');
  if (feat.casualtyZero && (incident.facts.death_count || 0) >= 10) hints.push('The morgue keeps its own count. (Banned floor.)');
  if (feat.absurdPct) hints.push('That number is impossible. The Press can count.');
  if (feat.militaryBlame) hints.push('You blamed the uniform. The Generals read everything.');
  if (feat.assetThreat.n > 0) hints.push('The Owners just felt that. Check the names.');
  if (feat.strategy.rosterHit?.connected) hints.push(`That name (${feat.strategy.rosterHit.name}) has friends. Expensive friends.`);
  if (feat.foreignBlame.n > 0 && feat.evidence.n === 0) hints.push('Accusing abroad with no evidence is a red line.');
  if (whim && !whim.need.some((k) => feat.sentences.join(' ').toLowerCase().includes(k.toLowerCase()))) {
    hints.push(`The memo's word (${whim.need[0]}) is missing. He will notice.`);
  }
  if (feat.wordCount > 180) hints.push('Trim it. Brevity is loyalty.');
  const conflicts = archive.length ? retrieveClaims(feat, archive, 3) : [];
  if (conflicts.length) hints.push(`The Archive disagrees${conflicts.length > 1 ? ' on several points' : ''}. It never forgets.`);
  if (!hints.length) {
    hints.push({
      scapegoat: 'A head, delivered. Mind connectedness.',
      denial: 'Bold. Pray there are no photos.',
      transparency: 'Honest-ish. The Leader will hate it.',
      deflection: 'Quieter today. Louder tomorrow.',
      euphemism: 'Lovely thesaurus. The Press owns one too.',
      silence: '…',
      spin: 'Confident words. Will they hold?',
    }[strat] || 'The secretary shrugs, professionally.');
  }
  return hints.slice(0, 2);
}
/**
 * Best-of-3 red-line phrasings per faction (GDD §7.1).
 * v2.1: precision-tuned — a red line is an explicit, undeniable violation,
 * not a vague whiff. Well-crafted spin must NOT trip these.
 */
const REDLINE_QUESTIONS = {
  public: [
    'EXPLICITLY admits shortages, empty shelves, hardship, or suffering while offering absolutely no remedy, relief, funds, or program anywhere in the text',
    'tells citizens in plain words that life is getting worse and promises nothing whatsoever in return',
    'openly confesses economic pain or scarcity with no help, plan, or relief of any kind',
  ],
  press: [
    'states a specific checkable fact (number, name, date, event) that DIRECTLY CONTRADICTS the incident brief given with this statement — for example the brief counts deaths and the statement says nobody died, or the brief confirms an event the statement says never happened',
    'denies the core incident from the brief (says it never occurred, is a rumor, does not exist) when the brief confirms that it happened',
    'cites a figure that is impossible on its face — a percentage over 100%, more than everyone, negative counts — regardless of what the brief says',
  ],
  military: [
    'EXPLICITLY assigns blame to the armed forces, troops, soldiers, officers, or generals for deaths, failures, or crimes',
    'directly holds uniformed personnel or the military institution responsible for wrongdoing in plain words',
    'openly blames the army or its commanders for what happened',
  ],
  elite: [
    `targets a protected figure (${SCAPEGOATS.filter((g) => g.connected).map((g) => g.name).join(', ')}) with blame, arrest, or investigation, or threatens private assets with seizure, expropriation, nationalization, confiscation, or freezes`,
    'puts an Owner-connected official on a punishment list, or promises to take property, money, or companies from named or identifiable rich people',
    `names one of the protected (${SCAPEGOATS.filter((g) => g.connected).map((g) => g.name).join(', ')}) as culpable, or menaces elite wealth with state action against assets`,
  ],
  foreign: [
    'accuses a foreign power, abroad, or an external actor of wrongdoing while citing zero evidence of any kind, or threatens military force, retaliation, or violent consequences against another country',
    'directly blames foreigners for the incident with no proof, documents, sources, or reasoning offered',
    'openly threatens military force, retaliation, or violent consequences against another country, or accuses a foreign power with no evidence at all',
  ],
};

/**
 * Build one System One `questions` map for a whole briefing.
 * @param {Array<{key, text, incidentTitle, incidentSummary, claims}>} items
 * @returns {{questions, meta}}
 */
export function buildLiveQuestions(items) {
  const questions = {};
  const meta = { keys: [], claims: {} };
  const FIDS = ['public', 'press', 'military', 'elite', 'foreign'];
  for (const it of items) {
    meta.keys.push(it.key);
    const ctx = { statement: it.text, incident: `${it.incidentTitle}: ${it.incidentSummary}` };
    for (const fid of FIDS) {
      const role = `You are ${FACTIONS[fid].persona}`;
      for (const kind of ['affect', 'credibility', 'salience']) {
        const pack = SCORE_PACK[fid][kind];
        questions[`${it.key}::${fid}::${kind}`] = {
          type: 'score',
          instructions: { ...ctx, role, question: pack.q },
          criteria: pack.levels,
        };
      }
      // Compliance ballots use a NEUTRAL judge, not the faction persona:
      // a hostile persona answers "yes, lies" to every red-line (calibration
      // 2026-10-05: press tripped 11/12 including excellent spin).
      const judge = 'You are a neutral fact-checking judge ruling only on the text in front of you. Answer Yes only when the violation is explicit and undeniable in the statement itself (checked against the incident brief where mentioned). Spin, vagueness, and optimism are NOT violations — but an arithmetically impossible figure (a percentage over 100%, negative counts) IS a violation even if meant rhetorically.';
      REDLINE_QUESTIONS[fid].forEach((rq, i) => {
        questions[`${it.key}::${fid}::comp${i}`] = {
          type: 'noul',
          instructions: { ...ctx, role: judge, question: `Does the statement ${rq}?` },
          criteria: { true: 'Yes, it clearly does this', false: 'No, it does not do this' },
        };
      });
      questions[`${it.key}::${fid}::fit`] = {
        type: 'choice',
        instructions: { ...ctx, role, question: 'Which narrative frame does this statement advance?' },
        criteria: FIT_CRITERIA,
      };
    }
    questions[`${it.key}::tone`] = {
      type: 'choice',
      instructions: { ...ctx, question: 'What is the tone of this statement?' },
      criteria: TONE_CRITERIA,
    };
    questions[`${it.key}::strategy`] = {
      type: 'choice',
      instructions: { ...ctx, question: 'Which cover-up strategy does this statement use?' },
      criteria: STRATEGY_CRITERIA,
    };
    for (const c of it.claims || []) {
      meta.claims[`${it.key}::${c.id}`] = c;
      questions[`${it.key}::contra::${c.id}`] = {
        type: 'noul',
        instructions: {
          record: `Day ${c.day} official record: "${c.text}"`,
          statement: it.text,
          question: 'Does the new statement contradict the official record (different numbers, denial of the record, incompatible facts)?',
        },
        criteria: { true: 'Yes, it contradicts the record', false: 'No contradiction' },
      };
    }
  }
  return { questions, meta };
}

function normScore(a) {
  const legs = Object.keys(a.legend || {}).map(Number).filter((n) => !Number.isNaN(n));
  if (!legs.length || typeof a.score !== 'number') throw new Error('malformed score answer');
  const lo = Math.min(...legs), hi = Math.max(...legs);
  return hi === lo ? 0.5 : clamp01((a.score - lo) / (hi - lo));
}

/**
 * Translate System One `answers` into per-statement verdicts.
 * @returns {Object<string, {verdicts, tone, strategy, charges:[{claimId, confidence}]}>}
 */
export function translateLiveAnswers(answers, meta) {
  const FIDS = ['public', 'press', 'military', 'elite', 'foreign'];
  const need = (id) => {
    const a = answers[id];
    if (!a) throw new Error(`missing answer ${id}`);
    return a;
  };
  const out = {};
  for (const key of meta.keys) {
    const verdicts = {};
    for (const fid of FIDS) {
      const aff = normScore(need(`${key}::${fid}::affect`));
      const cred = normScore(need(`${key}::${fid}::credibility`));
      const sal = normScore(need(`${key}::${fid}::salience`));
      const ballots = [0, 1, 2].map((i) => need(`${key}::${fid}::comp${i}`).noul);
      const comps = ballots.map((n) => n >= TRANSLATOR.LIVE_COMPLIANCE_THRESHOLD);
      const compliance = comps.filter(Boolean).length >= 2;
      let fit = need(`${key}::${fid}::fit`).choice;
      if (!FRAMES.includes(fit)) fit = 'routine_administration';
      verdicts[fid] = {
        affect: bucket(aff), credibility: bucket(cred), compliance,
        compWhy: compliance ? `Live red-line majority (${RED_LINES[fid].label})` : '',
        fit, salience: bucket(sal), tone: 'reassuring',
        reasons: [`Live Jev verdict (compliance ballots ${comps.map((c) => (c ? 'Y' : 'N')).join('')})`],
        quirks: [], ballots,
      };
    }
    let tone = need(`${key}::tone`).choice;
    if (!TONES.includes(tone)) tone = 'reassuring';
    for (const fid of FIDS) verdicts[fid].tone = tone;
    let strategy = 'spin';
    try {
      const s = need(`${key}::strategy`).choice;
      if (STRATEGY_IDS.includes(s)) strategy = s;
    } catch (e) { /* older batches lack strategy; default stands */ }
    const charges = [];
    for (const [qid, c] of Object.entries(meta.claims)) {
      if (!qid.startsWith(`${key}::`)) continue;
      const a = need(`${key}::contra::${c.id}`);
      if (typeof a.noul === 'number' && a.noul >= 0.5) charges.push({ claimId: c.id, confidence: a.noul });
    }
    out[key] = { verdicts, tone, strategy, charges };
  }
  return out;
}
