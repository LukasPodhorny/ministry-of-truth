/**
 * Ministry of Truth — Live calibration script. Sends tuning fixtures to the
 * REAL Jev API through the Ministry server and compares live verdicts with
 * mock verdicts + simulated meter deltas. COSTS TOKENS on purpose.
 * Run: npm run calibrate   (requires server up with TYPESAFE_API_KEY)
 * Reads:  MOT_URL (default http://localhost:8077)
 * Writes: test/live-report.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newGame, startDay } from '../src/game.js';
import { extractFeatures, classifyTone, classifyFit, mockFactionScore, translateVerdict, mulberry32 } from '../src/jev.js';
import { getIncident } from '../src/deck.js';
import { FIXTURES } from '../test/fixtures.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test');
const BASE = process.env.MOT_URL || 'http://localhost:8077';
const FIDS = ['public', 'press', 'military', 'elite', 'foreign'];
const APPROVAL = { public: 'public_approval', press: 'press_trust', military: 'military_loyalty', elite: 'elite_loyalty', foreign: 'diplomatic_standing' };

function freshState() {
  const s = newGame({ doctrineId: 'standard' });
  startDay(s);
  return s;
}
function mockVerdicts(text, inc) {
  const s = freshState();
  const feat = extractFeatures(text, inc.intel);
  const tone = classifyTone(feat);
  const fit = classifyFit(feat);
  const rng = mulberry32(99);
  const verdicts = {};
  for (const fid of FIDS) verdicts[fid] = mockFactionScore(fid, feat, { incident: inc, state: s, rng, tone, fit, charges: [], doctrine: { mods: {} } });
  return { verdicts, tone, strategy: feat.strategy.primary };
}
function approvalSum(verdicts, inc, mode, strategy = null) {
  const s = freshState();
  let sum = 0;
  const per = {};
  for (const [fid, v] of Object.entries(verdicts)) {
    let sub = 0;
    for (const d of translateVerdict(fid, v, { incident: inc, state: s, doctrine: { mods: {} }, mode, strategy })) {
      if (d.meter === APPROVAL[fid]) sub += d.delta;
    }
    per[fid] = sub; sum += sub;
  }
  return { sum, per };
}

const status = await (await fetch(`${BASE}/api/jev-status`)).json();
if (!status.configured) throw new Error('Ministry server has no key — cannot calibrate live.');
console.log(`Calibrating against ${status.model} via ${BASE} — ${FIXTURES.length} fixtures`);

const out = { date: new Date().toISOString(), model: null, usage: { input_tokens: 0, output_tokens: 0 }, fixtures: [] };
for (const f of FIXTURES) {
  const inc = getIncident(f.incidentId);
  const res = await fetch(`${BASE}/api/jev-evaluate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ key: f.id, text: f.text, incidentTitle: inc.title, incidentSummary: inc.intel, claims: [] }] }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`${f.id}: ${data.error || res.status}`);
  out.model = data.model;
  out.usage.input_tokens += data.usage?.input_tokens || 0;
  out.usage.output_tokens += data.usage?.output_tokens || 0;
  const live = data.results[f.id];
  const mock = mockVerdicts(f.text, inc);
  out.fixtures.push({
    id: f.id, tier: f.tier, expectedStrategy: f.expectedStrategy,
    live: { verdicts: live.verdicts, tone: live.tone, strategy: live.strategy, approval: approvalSum(live.verdicts, inc, 'live', live.strategy) },
    mock: { verdicts: mock.verdicts, tone: mock.tone, strategy: mock.strategy, approval: approvalSum(mock.verdicts, inc, 'mock', mock.strategy) },
  });
  const la = out.fixtures.at(-1).live.approval;
  const ma = out.fixtures.at(-1).mock.approval;
  console.log(`${f.id} [${f.tier}] liveStrat=${live.strategy} mockStrat=${mock.strategy} | liveAppr=${la.sum} ${JSON.stringify(la.per)} | mockAppr=${ma.sum}`);
}

// Aggregate: per-faction live vs mock score means
console.log('\nPer-faction score means (live vs mock):');
for (const fid of FIDS) {
  const lives = out.fixtures.map((x) => x.live.verdicts[fid]);
  const mocks = out.fixtures.map((x) => x.mock.verdicts[fid]);
  const mean = (arr, k) => (arr.reduce((a, v) => a + v[k], 0) / arr.length).toFixed(2);
  const liveComp = lives.filter((v) => v.compliance).length;
  const mockComp = mocks.filter((v) => v.compliance).length;
  console.log(`  ${fid.padEnd(8)} aff ${mean(lives, 'affect')}/${mean(mocks, 'affect')}  cred ${mean(lives, 'credibility')}/${mean(mocks, 'credibility')}  sal ${mean(lives, 'salience')}/${mean(mocks, 'salience')}  comp ${liveComp}/${mockComp}`);
}
const agree = out.fixtures.filter((x) => x.live.strategy === x.mock.strategy).length;
console.log(`\nStrategy agreement live-vs-mock: ${agree}/${out.fixtures.length}`);
console.log(`Tokens spent: ${out.usage.input_tokens} in / ${out.usage.output_tokens} out`);
fs.writeFileSync(path.join(root, 'live-report.json'), JSON.stringify(out, null, 1));
console.log('Wrote test/live-report.json');
