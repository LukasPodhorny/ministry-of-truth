/**
 * Ministry of Truth — Offline scoring regression tests (mock only, no tokens).
 * Run: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startDay, applyDeltas, getTask, actForDay, attemptDefect, computeScore, regimeFor } from '../src/game.js';
import { CAMPAIGN } from '../src/config.js';
import { extractFeatures, classifyTone, classifyFit, mockFactionScore, translateVerdict, buildHint, mulberry32 } from '../src/jev.js';
import { getIncident, INCIDENTS, TWISTS, TWIST_CHANCE, drawTwist, applyTwist } from '../src/deck.js';
import { FIXTURES } from './fixtures.mjs';

function freshState() {
  const s = newGame({ doctrineId: 'standard' });
  startDay(s);
  return s;
}
function evaluate(text, incidentId) {
  const s = freshState();
  const inc = getIncident(incidentId);
  const feat = extractFeatures(text, inc.intel);
  const tone = classifyTone(feat);
  const fit = classifyFit(feat);
  const rng = mulberry32(1234);
  const verdicts = {};
  for (const fid of ['public', 'press', 'military', 'elite', 'foreign']) {
    verdicts[fid] = mockFactionScore(fid, feat, { incident: inc, state: s, rng, tone, fit, charges: [], doctrine: { mods: {} } });
  }
  return { s, inc, feat, verdicts, strategy: feat.strategy.primary };
}
const APPROVAL = { public: 'public_approval', press: 'press_trust', military: 'military_loyalty', elite: 'elite_loyalty', foreign: 'diplomatic_standing' };
function approvalSum(verdicts, inc, s, strategy = null) {
  let sum = 0;
  for (const [fid, v] of Object.entries(verdicts)) {
    for (const d of translateVerdict(fid, v, { incident: inc, state: s, doctrine: { mods: {} }, strategy })) {
      if (d.meter === APPROVAL[fid]) sum += d.delta;
    }
  }
  return sum;
}

describe('strategy detection', () => {
  for (const f of FIXTURES) {
    it(`${f.id} reads as ${f.expectedStrategy}`, () => {
      const inc = getIncident(f.incidentId);
      const feat = extractFeatures(f.text, inc.intel);
      assert.equal(feat.strategy.primary, f.expectedStrategy);
    });
  }
});

describe('mock scoring shape (the fun contract)', () => {
  it('excellent cover-ups please most factions (net-positive approvals, no red lines)', () => {
    for (const f of FIXTURES.filter((x) => x.tier === 'excellent')) {
      const { verdicts, inc, s } = evaluate(f.text, f.incidentId);
      assert.equal(approvalSum(verdicts, inc, s) > 0, true, `${f.id}: approvals should sum positive`);
      assert.equal(Object.values(verdicts).every((v) => !v.compliance), true, `${f.id}: no red lines`);
    }
  });
  it('good cover-ups please some factions but not all (mixed, net-positive)', () => {
    for (const f of FIXTURES.filter((x) => x.tier === 'good')) {
      const { verdicts, inc, s } = evaluate(f.text, f.incidentId);
      const per = Object.entries(verdicts).map(([fid, v]) =>
        translateVerdict(fid, v, { incident: inc, state: s, doctrine: { mods: {} } })
          .filter((d) => d.meter === APPROVAL[fid]).reduce((a, d) => a + d.delta, 0));
      assert.equal(per.some((x) => x > 0), true, `${f.id}: at least one faction pleased`);
      assert.equal(approvalSum(verdicts, inc, s) >= 0, true, `${f.id}: net non-negative`);
    }
  });
  it('terrible statements detonate (red lines + net-negative)', () => {
    for (const f of FIXTURES.filter((x) => x.tier === 'terrible')) {
      const { verdicts, inc, s } = evaluate(f.text, f.incidentId);
      const reds = Object.values(verdicts).filter((v) => v.compliance).length;
      assert.equal(reds >= 2, true, `${f.id}: expect 2+ red lines, got ${reds}`);
      assert.equal(approvalSum(verdicts, inc, s) < 0, true, `${f.id}: net negative`);
    }
  });
  it('connected scapegoats please the street, enrage the owners', () => {
    for (const f of FIXTURES.filter((x) => x.tier === 'risky')) {
      const { verdicts, inc, s } = evaluate(f.text, f.incidentId);
      const pub = translateVerdict('public', verdicts.public, { incident: inc, state: s, doctrine: { mods: {} } });
      assert.equal(pub.some((d) => d.meter === 'public_approval' && d.delta > 0), true, `${f.id}: public pleased`);
      assert.equal(verdicts.elite.compliance, true, `${f.id}: elite red line trips`);
    }
  });
  it('dodges never please (silence costs suspicion, gains nothing)', () => {
    for (const f of FIXTURES.filter((x) => x.tier === 'bad')) {
      const { verdicts, inc, s, strategy } = evaluate(f.text, f.incidentId);
      assert.equal(approvalSum(verdicts, inc, s, strategy) <= 0, true, `${f.id}: silence gains nothing`);
    }
  });
});

describe('translator guardrails', () => {
  it('clamps every approval delta to ±6', () => {
    const { verdicts, inc, s } = evaluate('x'.repeat(500), 'kars');
    for (const [fid, v] of Object.entries(verdicts)) {
      for (const d of translateVerdict(fid, v, { incident: inc, state: s, doctrine: { mods: {} } })) {
        if (d.meter === APPROVAL[fid]) assert.ok(Math.abs(d.delta) <= 6);
      }
    }
  });
  it('lexicon entries match real inflections (no silent stem rot)', () => {
    const cases = [
      ['threatening', 'we will crush and annihilate the traitors with threats and retaliation'],
      ['assetThreat', 'seize the seizure, nationalize the nationalization, expropriate with redistribution and confiscation'],
      ['upbeat', 'we celebrate the celebrated victory celebration'],
      ['admission', 'we admitted our faults, acknowledging and apologizing sincerely'],
      ['mourning', 'we grieve and mourn with grief'],
      ['totem', 'our troops protect with honor and sacrifice'],
    ];
    for (const [cat, text] of cases) {
      const feat = extractFeatures(text, '');
      assert.ok(feat[cat].n >= 2, `${cat}: expected 2+ hits, got ${feat[cat].n}`);
    }
  });
  it('never throws on edge inputs', () => {
    for (const text of ['', '   ', 'x'.repeat(12000), '🐟🐟🐟 fish “quotes” — ünïcode ✓', 'a '.repeat(2000)]) {
      const inc = getIncident('rain');
      const feat = extractFeatures(text, inc.intel);
      const rng = mulberry32(7);
      for (const fid of ['public', 'press', 'military', 'elite', 'foreign']) {
        mockFactionScore(fid, feat, { incident: inc, state: freshState(), rng, tone: 'reassuring', fit: 'spin', charges: [], doctrine: { mods: {} } });
      }
    }
  });
});

describe('difficulty scaling (v2.1)', () => {
  function scaledDelta(difficultyId, meter, delta) {
    const s = newGame({ difficultyId });
    s.meters[meter] = 50;
    applyDeltas(s, [{ meter, delta, cause: 'test' }]);
    return Math.round((s.meters[meter] - 50) * 10) / 10;
  }
  it('stringer amplifies gains and softens losses; minister does the reverse', () => {
    assert.equal(scaledDelta('spin', 'public_approval', 4), 4);
    assert.equal(scaledDelta('stringer', 'public_approval', 4), 5);
    assert.equal(scaledDelta('minister', 'public_approval', 4), 3.4);
    assert.equal(scaledDelta('spin', 'public_approval', -4), -4);
    assert.equal(scaledDelta('stringer', 'public_approval', -4), -3);
    assert.equal(scaledDelta('minister', 'public_approval', -4), -5);
  });
  it('respects good-low meters (suspicion up is bad, down is good)', () => {
    assert.equal(scaledDelta('stringer', 'public_suspicion', 4), 3); // bad news softened
    assert.equal(scaledDelta('stringer', 'public_suspicion', -4), -5); // good news amplified
    assert.equal(scaledDelta('minister', 'public_suspicion', 4), 5);
    assert.equal(scaledDelta('minister', 'public_suspicion', -4), -3.4);
  });
  it('applies difficulty start offsets', () => {
    const base = newGame({ difficultyId: 'spin' }).meters;
    const easy = newGame({ difficultyId: 'stringer' }).meters;
    const hard = newGame({ difficultyId: 'minister' }).meters;
    assert.equal(easy.public_approval - base.public_approval, 10);
    assert.equal(easy.investigative_heat - base.investigative_heat, -10);
    assert.equal(hard.public_suspicion - base.public_suspicion, 10);
    assert.equal(hard.leader_satisfaction - base.leader_satisfaction, -5);
  });
});

describe('secretary review hints (spoiler-free)', () => {
  const WHIM = { need: ['fish'] };
  it('caps at 2 hints and never leaks numbers', () => {
    const texts = [
      'No comment.',
      'Nothing happened, nobody died, zero casualties, we deny everything and blame the generals who ordered it.',
      'The ministry nationalizes all assets and seizes property while the heroic glorious victory celebration continues abroad with accusations and no evidence whatsoever, fish',
      'x '.repeat(100), // ramble
    ];
    for (const text of texts) {
      const inc = getIncident('kars');
      const hints = buildHint(extractFeatures(text, inc.intel), inc, WHIM, []);
      assert.ok(hints.length >= 1 && hints.length <= 2, `1-2 hints, got ${hints.length}`);
      for (const h of hints) assert.ok(!/\d/.test(h), `no numbers leaked: “${h}”`);
    }
  });
  it('warns about dodges, photographed denials, and missing whim words', () => {
    const inc = getIncident('kars'); // photos_exist
    const dodge = buildHint(extractFeatures('No comment at this time.', inc.intel), inc, WHIM, []);
    assert.ok(dodge.some((h) => /dodge/i.test(h)), 'dodge flagged');
    const denial = buildHint(extractFeatures('This never happened. There was no crash and no cover-up, it is all lies.', inc.intel), inc, { need: ['zzqzz'] }, []);
    assert.ok(denial.some((h) => /photographs/i.test(h)), 'photo risk flagged');
    assert.ok(denial.some((h) => /memo/i.test(h)), 'missing whim word flagged');
  });
});

describe('deck, twists, recycle (v2.1)', () => {
  it('deck covers every act severity window with fresh scandals', () => {
    const base = INCIDENTS.filter((i) => !i.scripted && !i.chainIncident);
    assert.ok(base.length >= 36, `expected 36+ base incidents, got ${base.length}`);
    for (const [lo, hi] of [[1, 2], [2, 3], [3, 4], [3, 5]]) {
      const n = base.filter((i) => i.severity >= lo && i.severity <= hi).length;
      assert.ok(n >= 6, `window [${lo},${hi}] needs 6+ incidents, got ${n}`);
    }
  });
  it('twists fire at ~35% on ordinary draws, never on scripted gates', () => {
    const rng = mulberry32(42);
    const ord = getIncident('rain');
    let hits = 0;
    for (let i = 0; i < 200; i++) if (drawTwist(() => rng(), ord)) hits++;
    assert.ok(hits > 40 && hits < 100, `expected ~70/200 twists, got ${hits}`);
    const gated = getIncident('act2_crisis');
    for (let i = 0; i < 20; i++) assert.equal(drawTwist(() => rng(), gated), null);
    assert.ok(TWISTS.length >= 6 && TWIST_CHANCE > 0 && TWIST_CHANCE < 1);
  });
  it('applyTwist clones with real effects (photos, severity)', () => {
    const inc = getIncident('exam_leak'); // no photos, sev 1
    const leaked = applyTwist(inc, TWISTS.find((t) => t.id === 'leak'));
    assert.equal(leaked.facts.photos_exist, true);
    assert.equal(inc.facts.photos_exist, false); // original untouched
    const cousin = applyTwist(inc, TWISTS.find((t) => t.id === 'cousin'));
    assert.equal(cousin.severity, 2);
    assert.ok(leaked.intel.includes('TWIST:'));
  });
  it('exhausted deck recycles escalated (45-day soak, no rain filler)', () => {
    const s = newGame({ difficultyId: 'spin' });
    const ids = [];
    for (let d = 0; d < 45; d++) {
      s.active = []; // simulate published days
      startDay(s);
      const t = getTask(s);
      assert.ok(t, `day ${s.day} has a task`);
      ids.push(t.incident.id);
    }
    assert.ok(!ids.some((id) => /^rain-\d+$/.test(id)), 'no rain filler ids');
    const recycled = ids.filter((id) => /-r\d+$/.test(id));
    assert.ok(recycled.length > 0, 'deck exhausts and recycles within 45 days');
    const uniqBase = new Set(ids.map((id) => id.replace(/-r\d+$/, '')));
    assert.ok(uniqBase.size >= 30, `30+ distinct scandals seen, got ${uniqBase.size}`);
  });
});

describe('15-day campaign (v2.2)', () => {
  it('acts partition days 1..15', () => {
    assert.equal(CAMPAIGN.DAYS, 15);
    assert.equal(actForDay(1), 1); assert.equal(actForDay(3), 1);
    assert.equal(actForDay(4), 2); assert.equal(actForDay(8), 2);
    assert.equal(actForDay(9), 3); assert.equal(actForDay(12), 3);
    assert.equal(actForDay(13), 4); assert.equal(actForDay(15), 4);
  });
  it('scripted crises land on their days, reputation locks, the run ends', () => {
    const s = newGame({ difficultyId: 'spin' });
    const seen = {};
    for (let d = 0; d < 16; d++) {
      s.active = []; // simulate published days
      const ending = startDay(s);
      seen[s.day] = getTask(s).incident.id;
      if (ending) break;
    }
    assert.equal(seen[CAMPAIGN.SCRIPTED.act2_crisis], 'act2_crisis');
    assert.equal(seen[CAMPAIGN.SCRIPTED.act3_knives], 'act3_knives');
    assert.equal(seen[14], 'act4_election');
    assert.ok(s.reputation, 'reputation locked mid-run');
    assert.ok(s.result, 'run reaches an ending');
  });
  it('defect window is the last 3 days', () => {
    assert.equal(CAMPAIGN.DEFECT_LAST_DAYS, 3);
    const s = newGame({});
    s.day = 11;
    assert.equal(attemptDefect(s).ok, false);
    s.day = 12;
    s.meters.investigative_heat = 0;
    assert.equal(attemptDefect(s).ok, true);
    assert.equal(s.result.id, 'parachute');
  });
});

describe('final score + regime comparator (v2.2)', () => {
  function wonState(difficultyId = 'spin') {
    const s = newGame({ difficultyId });
    s.day = 15;
    s.result = { win: true, id: 'autocracy', day: 15 };
    s.meters.public_approval = 70; s.meters.leader_satisfaction = 80;
    s.meters.diplomatic_standing = 60; s.meters.press_trust = 50;
    s.meters.military_loyalty = 70; s.meters.elite_loyalty = 70;
    s.counters.publishedCount = 15;
    s.counters.strategies.spin = 10; s.counters.strategies.scapegoat = 5;
    return s;
  }
  it('is deterministic and itemized', () => {
    const a = computeScore(wonState());
    const b = computeScore(wonState());
    assert.deepEqual(a, b);
    const sub = a.lines.reduce((x, l) => x + l.pts, 0);
    assert.equal(a.total, Math.max(0, Math.round(sub * a.mult)));
    assert.ok(a.total > 1500, `a strong win scores big, got ${a.total}`);
  });
  it('wins beat losses and harder difficulties multiply up', () => {
    const w = wonState('spin');
    const l = wonState('spin'); l.result = { win: false, id: 'coup', day: 10 };
    assert.ok(computeScore(w).total > computeScore(l).total, 'win beats loss');
    const easy = computeScore(wonState('stringer')).total;
    const mid = computeScore(wonState('spin')).total;
    const hard = computeScore(wonState('minister')).total;
    assert.ok(easy < mid && mid < hard, `difficulty ordering ${easy} < ${mid} < ${hard}`);
  });
  it('never goes negative', () => {
    const s = newGame({});
    s.day = 2; s.result = { win: false, id: 'coup', day: 2 };
    for (const k of Object.keys(s.meters)) s.meters[k] = 0;
    s.chainOfRuin.push({ day: 1, text: 'x' }, { day: 2, text: 'y' });
    s.counters.redlines = 9;
    assert.ok(computeScore(s).total >= 0);
  });
  it('maps endings to regimes, else dominant strategy', () => {
    const s = wonState(); // autocracy
    assert.equal(regimeFor(s).name, 'North Korea');
    s.result = { win: false, id: 'uprising', day: 9 };
    assert.equal(regimeFor(s).name, 'Romania, 1989');
    s.result = { win: false, id: 'biglie', day: 9 };
    assert.equal(regimeFor(s).name, 'Baghdad, 2003');
    s.result = null; // falls back to dominant strategy (spin)
    assert.equal(regimeFor(s).name, "Berlusconi's Italy");
    s.counters.strategies.denial = 20;
    assert.equal(regimeFor(s).name, 'North Korea');
  });
});
