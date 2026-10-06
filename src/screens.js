/**
 * Ministry of Truth v2 — Round Impact Summary, Game Over, all modals.
 * @module screens
 */
import { App, snapshotMeters, saveSettings, toast } from './app.js';
import { CAMPAIGN, STRATEGIES, HEADLINE_LABELS } from './config.js';
import { FACTIONS, METERS, QUIRKS, SCAPEGOATS, VICTORIES, LOSSES, FIRST_NAMES, LAST_NAMES } from './data.js';
import { icon, stamp, factionChip, escapeHtml } from './assets.js';
import { sfxClick, sfxStamp, sfxPage, sfxSting, sfxTriumph, soundEnabled, setSound } from './audio.js';
import {
  startDay, saveGame, clearSave, saveCodexNGPlus, loadCodexNGPlus,
  readNames, attemptDefect, attemptConfess, difficultyOf,
  computeScore, regimeFor, saveBestIf,
} from './game.js';
import { topbar, bottombar } from './ui.js';
import { hashStr, mulberry32 } from './jev.js';

/* ── View 3: Round Impact Summary ──────────────────────────────── */
export function renderSummary() {
  const s = App.state;
  const rep = s.fallout || { items: [], headlines: {}, reactions: {}, deltas: [], strategy: 'spin' };
  const verdicts = rep.items.filter((i) => i.kind === 'verdict');
  const reds = verdicts.filter((v) => v.compliance);
  const strat = STRATEGIES[rep.strategy] || STRATEGIES.spin;
  const deltas = rep.deltas.map(deltaRow).join('') || '<div class="card"><i>No meter moved. A perfect nothing. Suspicious.</i></div>';
  const reactions = Object.entries(rep.reactions).map(([fid, q]) => `
    <div class="react react-${q.bucket}"><div class="fh">${factionChip(fid, FACTIONS[fid].name)}</div>
    <div class="fb">${escapeHtml(q.text)}</div></div>`).join('');
  const heads = Object.entries(rep.headlines || {}).map(([fid, h]) => `
    <div class="fpaper"><div class="fh">${escapeHtml(FACTIONS[fid]?.name || fid)} press</div><div class="fb">“${escapeHtml(h)}”</div></div>`).join('');
  const feed = rep.items.filter((i) => !['verdict', 'autopsy'].includes(i.kind)).map((i) => {
    const crisis = ['contradiction', 'catastrophe', 'redline', 'scapegoat'].includes(i.kind);
    return `<div class="feeditem ${crisis ? 'crisis' : ''}"><span class="tag">${escapeHtml(i.kind.toUpperCase())}</span><span>${escapeHtml(i.text)}</span></div>`;
  }).join('');
  const autopsy = rep.items.find((i) => i.kind === 'autopsy');
  const endgame = endgameOptions();
  return `
  ${topbar('ROUND IMPACT', 'flame')}
  <div class="desk-wrap">
    ${reds.length ? `<div class="telegram">⛔ ${reds.length} RED-LINE EVENT(S): ${reds.map((v) => FACTIONS[v.faction].short).join(' · ')}</div>` : `<div style="margin-bottom:10px">${stamp('NO RED LINES', 'approved')}</div>`}
    ${rep.standby ? `<div class="standby-banner" style="margin-bottom:10px">TRIBUNAL IN RECESS — STANDBY SCORING WAS ACTIVE</div>` : ''}
    <div class="stratline">STRATEGY DETECTED: ${stamp(strat.name.toUpperCase(), 'red')} <span>${escapeHtml(strat.desc)}</span></div>
    <h2 class="sech">What moved</h2>
    <div class="deltas">${deltas}</div>
    <h2 class="sech">The factions react</h2>
    <div class="reacts">${reactions}</div>
    <h2 class="sech">Tonight’s headlines</h2>
    <div class="fallout-wall">${heads}</div>
    ${feed ? `<h2 class="sech">Round feed</h2><div class="card">${feed}</div>` : ''}
    <div class="sum-grid">
      <div>${namesCard(rep)}${reviewCard()}</div>
      <div>${previewCard()}${whimCard()}${endgame}</div>
    </div>
    ${autopsy ? `<div style="margin-top:10px"><button class="btn" data-action="autopsy-open">${icon('eye')} Autopsy: how each faction read it</button></div>` : ''}
  </div>
  ${bottombar(`<button class="btn btn-red btn-big" data-action="next-day">${icon('sun')} NEXT TASK → DAY ${s.day + 1}</button>`)}`;
}

function deltaRow(d) {
  const meta = METERS[d.meter];
  const diff = d.after - d.before;
  const good = (meta.good === 'high' && diff > 0) || (meta.good === 'low' && diff < 0);
  const label = HEADLINE_LABELS[d.meter] || meta.label;
  const pct = meta.pips ? null : Math.max(0, Math.min(100, d.after));
  return `<div class="delta ${good ? 'good' : 'bad'}">
    <div class="dname">${escapeHtml(label)}</div>
    ${pct == null
      ? `<div class="dvals">${d.before}/5 → <b>${d.after}/5</b></div>`
      : `<div class="dtrack"><i style="width:${Math.max(0, Math.min(100, d.before))}%"></i><b style="width:${pct}%"></b></div>
         <div class="dvals">${d.before} → <b>${d.after}</b> <span class="ddiff">(${diff > 0 ? '+' : ''}${diff})</span></div>`}
  </div>`;
}

function namesCard(rep) {
  const s = App.state;
  if (!rep.names) {
    if (s.namesAvailableToday > 0 || s.namesRead > 0) return `<div class="card"><h3>${icon('veil')} The Lists</h3><div style="font-size:13px">(${s.namesRead} nights reading names, all time.)</div></div>`;
    return '';
  }
  return `<div class="card"><h3>${icon('veil')} The Lists</h3>
    <div style="font-size:13px">${rep.names.count} names attached to “${escapeHtml(rep.names.title)}.” You do not read them. <i>(You may.)</i></div>
    <div style="margin-top:6px;display:flex;gap:6px"><button class="btn" data-action="names-open">${icon('eye')} View</button>
    <button class="btn" data-action="act-readnames">${icon('check')} Read Them</button></div></div>`;
}

function reviewCard() {
  const s = App.state;
  const today = s.ledger.filter((l) => l.day === s.day && l.meter).slice(-8).reverse();
  const rows = today.map((l) => {
    const d = l.delta > 0 ? `<b style="color:var(--good)">+${l.delta}</b>` : `<b style="color:var(--bad)">${l.delta}</b>`;
    return `<div class="feeditem"><span class="tag">${escapeHtml(METERS[l.meter]?.label || l.meter)}</span><span>${escapeHtml(l.text)} ${d}</span></div>`;
  }).join('') || '<i>Nothing moved. Ominous.</i>';
  return `<div class="card"><h3>${icon('scroll')} Round ledger</h3>${rows}</div>`;
}

function previewCard() {
  const s = App.state;
  const queued = s.queuedFollowups.map((q) => `<div class="feeditem crisis"><span class="tag">NEXT</span><span>“${escapeHtml(q.incident.title)}” — ${escapeHtml(q.why)}</span></div>`).join('');
  const omens = [];
  if (s.day + 1 === CAMPAIGN.SCRIPTED.act2_crisis) omens.push('Mid-campaign crisis brews.');
  if (s.day + 1 === CAMPAIGN.REPUTATION_DAY) omens.push('Your reputation locks tomorrow.');
  if (s.day + 1 === CAMPAIGN.SCRIPTED.act3_knives) omens.push('The Night of Knives approaches.');
  if (s.day + 1 >= s.endDay - 1) omens.push('Election eve. Observers in the lobby.');
  return `<div class="card"><h3>${icon('eye')} Tomorrow</h3>${queued}
    ${omens.map((t) => `<div class="feeditem crisis"><span class="tag">OMEN</span><span>${escapeHtml(t)}</span></div>`).join('')}
    ${!queued && !omens.length ? '<i>Clear skies. (Per memo. Do not look outside.)</i>' : ''}</div>`;
}

function whimCard() {
  const s = App.state;
  if (s.day + 1 > s.endDay) return '';
  return `<div class="card"><h3>${icon('plant')} The Plant & the Mirror</h3>
    <div style="font-size:13px;font-style:italic">${s.meters.conscience >= 60 ? 'The plant THRIVES. Suspiciously lush.' : s.meters.conscience >= 35 ? 'The plant survives. Like everyone here.' : 'The plant is dead. You water it anyway. Routine.'}</div></div>`;
}

function endgameOptions() {
  const s = App.state;
  if (s.day < s.endDay - CAMPAIGN.DEFECT_LAST_DAYS && s.act < 4) return '';
  return `<div class="card"><h3>${icon('warn')} Endgame options</h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-red" data-action="act-defect" title="SECRET: vanish in the last ${CAMPAIGN.DEFECT_LAST_DAYS} days with Heat below 50.">${icon('send')} DEFECT…</button>
      <button class="btn btn-gold" data-action="act-confess" title="SECRET (Act IV): needs Conscience ≥ 70, Archive ≥ 50.">${icon('dove')} CONFESS…</button>
    </div></div>`;
}

/* ── Game over ─────────────────────────────────────────────────── */
const LOSS_ADVICE = {
  coup: 'What would have saved you: praise the uniform in print, never blame troops, and keep the Generals calm.',
  uprising: 'What would have saved you: reassurance and scapegoats for the Public before approval cratered.',
  firing: 'What would have saved you: weave the whims into statements and praise the Leader.',
  trial: 'What would have saved you: in Act IV, never betray the Elites and the Press at once.',
  intervention: 'What would have saved you: calm language for Abroad, evidence for accusations. Never threaten.',
  biglie: 'What would have saved you: consistency. Check the Archive before publishing.',
  assassination: 'What would have saved you: fewer connected names in print, lower Heat.',
};
export function renderGameover() {
  const s = App.state;
  const r = s.result || { win: false, id: 'trial', day: s.day };
  const def = r.win ? VICTORIES.find((v) => v.id === r.id) : LOSSES.find((v) => v.id === r.id);
  const ruin = s.chainOfRuin.slice(-3).map((c) => `<li><b>Day ${c.day}:</b> ${escapeHtml(c.text)}</li>`).join('') || '<li>The records are silent. (They are never silent. Check the Ledger.)</li>';
  const nation = s.meters.public_approval >= 50 ? 'The nation endures, numb but standing.' : s.meters.public_approval >= 30 ? 'The nation limps on, suspicious of weather reports.' : 'The nation believes nothing — not even the fish.';
  const you = r.win ? (r.id === 'confession' ? 'You go to prison, then to history.' : r.id === 'parachute' ? 'You vanish with the Archive.' : 'You keep your office. The plant is dead.') : 'Your final statement is never delivered.';
  const score = computeScore(s);
  const { best, isBest } = saveBestIf(s, score.total);
  const regime = regimeFor(s);
  const diff = difficultyOf(s);
  const fav = Object.entries(s.counters.strategies).sort((a, b) => b[1] - a[1])[0];
  const favName = (STRATEGIES[fav[0]] || STRATEGIES.spin).name;
  const scoreRows = score.lines.map((l) => `<div class="srow"><span>${escapeHtml(l.label)}</span><b>${l.pts > 0 ? '+' : ''}${l.pts}</b></div>`).join('')
    + `<div class="srow"><span>× ${escapeHtml(diff.name)} difficulty</span><b>×${score.mult}</b></div>`;
  return `
  <div class="topbar"><div class="brand">${icon('seal')}<div><div class="t1">MINISTRY OF TRUTH</div><div class="t2">SERVICE RECORD — DAY ${r.day}</div></div></div></div>
  <div class="title-wrap"><div class="title-card" style="max-width:720px;text-align:left">
    <div style="text-align:center">${r.win ? stamp('VICTORY', 'approved') : stamp('TERMINATED', 'denied')}</div>
    <h1 style="text-align:center;font-size:34px">${icon(def.icon)} ${escapeHtml(def.name)}</h1>
    <div class="sub" style="text-align:center">${escapeHtml(def.epithet)}</div>
    <div class="scorebox"><div class="pts">${score.total}</div>
      <div class="best">FINAL SCORE · BEST ${best} (${escapeHtml(diff.name).toUpperCase()})${isBest ? '<span class="newbest">★ NEW BEST</span>' : ''}</div></div>
    <div class="scorelines">${scoreRows}</div>
    <div class="regimeline">${icon('globe')} YOUR REGIME RESEMBLES: <b>${escapeHtml(regime.name)}</b> — <i>${escapeHtml(regime.quip)}</i></div>
    <p class="gameover-epi">${escapeHtml(def.desc)}</p>
    ${s.electionResult != null ? `<div class="kv"><dt>Official result</dt><dd><b>${s.electionResult}%</b> (decisive, calm, pre-reported)</dd></div>` : ''}
    <div class="kv" style="margin-top:8px">
      <dt>Statements</dt><dd>${s.counters.publishedCount} published · favorite: <b>${escapeHtml(favName)}</b> (×${fav[1]})</dd>
      <dt>Red lines</dt><dd>${s.counters.redlines || 0} tripped · ${s.counters.twists || 0} twists weathered</dd>
      <dt>Whims</dt><dd>${s.counters.whimsObeyed || 0}/${s.counters.publishedCount} obeyed · ${s.scapegoatsUsed.length} scapegoat(s) spent</dd>
      <dt>The regime</dt><dd>${escapeHtml(r.win ? 'Survives. With better stationery.' : 'Falls. Or rather: you fall. The regime finds another publicist.')}</dd>
      <dt>You</dt><dd>${escapeHtml(you)}</dd>
      <dt>The nation</dt><dd>${escapeHtml(nation)}</dd>
      <dt>The names</dt><dd>On ${s.namesRead} night(s), you read the names.</dd>
      ${s.reputation ? `<dt>History calls you</dt><dd><b>“${escapeHtml(s.reputation)}”</b></dd>` : ''}
    </div>
    <div class="ruin-chain"><b>CHAIN OF RUIN (top causes)</b><ul>${ruin}</ul>
    ${!r.win && LOSS_ADVICE[r.id] ? `<div style="font-size:13px"><i>${escapeHtml(LOSS_ADVICE[r.id])}</i></div>` : ''}</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;flex-wrap:wrap">
      <button class="btn btn-red btn-big" data-action="new-term">${icon('stamp')} NEW TERM</button>
      <button class="btn btn-big" data-action="ngplus">${icon('book')} SECOND TERM (NG+, keep Codex)</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
      <button class="btn btn-ghost" data-action="open-ledger">${icon('scroll')} Review Ledger</button>
      <button class="btn btn-ghost" data-action="open-archive">${icon('archive')} Review Archive</button>
    </div>
  </div></div>`;
}

/* ── Modals ────────────────────────────────────────────────────── */
export function renderModal() {
  const m = App.modal;
  if (!m) return '';
  const close = `<button class="iconbtn" style="color:var(--ink);border-color:var(--line-dark)" data-action="close-modal">${icon('x')}</button>`;
  const wrap = (title, body, foot = '', wide = false) => `
    <div class="overlay" data-action="overlay-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-label="${escapeHtml(title)}">
      <div class="modal-head"><h2>${escapeHtml(title)}</h2>${close}</div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div></div>`;
  switch (m.kind) {
    case 'dial': return modalDial(wrap, m.id);
    case 'meters': return modalMeters(wrap);
    case 'archive': return modalArchive(wrap);
    case 'codex': return modalCodex(wrap);
    case 'ledger': return modalLedger(wrap);
    case 'help': return modalHelp(wrap);
    case 'settings': return modalSettings(wrap);
    case 'autopsy': return modalAutopsy(wrap);
    case 'names': return modalNames(wrap);
    default: return '';
  }
}

function modalDial(wrap, meterId) {
  const s = App.state;
  const meta = METERS[meterId];
  const causes = s.ledger.filter((l) => l.meter === meterId).slice(-8).reverse()
    .map((l) => `<div class="feeditem"><span class="tag">D${l.day}</span><span>${escapeHtml(l.text)} ${l.delta != null ? `<b>(${l.delta > 0 ? '+' : ''}${l.delta})</b>` : ''}</span></div>`).join('') || '<i>No recorded causes yet. Pristine. Ominous.</i>';
  const hints = {
    coup_risk: 'At 100: tanks at dawn. Praise the uniform; never blame troops.',
    civil_unrest: 'At 100 with an organized opposition: uprising. Bread and vibes keep it low.',
    leader_satisfaction: 'At 0 (or <30 for 7 days): a car waits. Weave the whims in.',
    archive_integrity: 'At 0: the Big Lie collapses. It only decreases now — write consistently.',
    investigative_heat: 'At 80+: weekly exposés. Eases weekly when the cycle moves on.',
  };
  return wrap(`${meta.label} — ${Math.round(s.meters[meterId])}${meta.pips ? '/5' : '/100'}`,
    `${hints[meterId] ? `<div class="archivist">${escapeHtml(hints[meterId])}</div>` : ''}<h4>Recent causes</h4>${causes}`,
    `<button class="btn" data-action="close-modal">Close</button>`);
}

function modalMeters(wrap) {
  const s = App.state;
  const rows = Object.entries(METERS).map(([k, meta]) => {
    const v = Math.round(s.meters[k]);
    return `<div class="wrow"><span>${escapeHtml(HEADLINE_LABELS[k] || meta.label)}</span><b>${meta.pips ? `${v}/5` : `${v}/100`}</b></div>`;
  }).join('');
  return wrap('All Meters', `<div class="archivist">The Task Desk shows six headlines; the Ministry tracks everything. Lose conditions watch: Coup 100 · Unrest 100 (organized) · Leader 0 · Archive 0 · Sanctions 5 + Standing 0.</div>${rows}`,
    `<button class="btn" data-action="close-modal">Close</button>`);
}

function modalArchive(wrap) {
  const s = App.state;
  const claims = [...s.archive].reverse().map((c) => `
    <div class="claim"><span class="cday">D${c.day}</span><span style="flex:1">${escapeHtml(c.text)}</span></div>`).join('')
    || '<i>The Archive is empty. Publish something. Lie a little.</i>';
  const blamed = s.scapegoatsUsed.map((id) => SCAPEGOATS.find((g) => g.id === id)?.name).filter(Boolean).join(', ');
  return wrap(`Archive of Lies (${s.archive.length} claims)`,
    `<div class="archivist">Everything you publish, parsed into claims. New statements are contradiction-checked against the most relevant of these. The Archive never forgets — and nothing can edit it now.</div>${claims}
    ${blamed ? `<div style="margin-top:8px;font-size:12px"><b>The List of the Already Blamed:</b> ${escapeHtml(blamed)}</div>` : ''}`,
    `<button class="btn" data-action="close-modal">Close</button>`, true);
}

function modalCodex(wrap) {
  const s = App.state;
  const rows = QUIRKS.map((q) => {
    const st = s.quirks[q.id] || { status: 'rumor', hits: 0 };
    const conf = st.status === 'confirmed';
    return `<div class="quirk ${conf ? 'confirmed' : ''}">
      <h5>${conf ? stamp('CONFIRMED', 'gold') : stamp(`RUMOR ${st.hits}/2`, 'routine')} ${escapeHtml(q.name)}</h5>
      <div style="font-size:12px;color:var(--ink-soft)">Factions: ${q.factions.map((f) => FACTIONS[f].short).join(', ')}</div>
      <div style="font-size:13px;margin-top:4px"><i>${escapeHtml(q.rumor)}</i></div>
      <div class="kv" style="margin-top:4px"><dt>Test</dt><dd>${escapeHtml(q.protocol)}</dd>
      ${conf ? `<dt>Exploit</dt><dd><b>${escapeHtml(q.exploit)}</b></dd><dt>Counter</dt><dd>${escapeHtml(q.counter)}</dd>` : `<dt>Exploit</dt><dd><i>Reproduce the effect twice to confirm.</i></dd>`}</div>
    </div>`;
  }).join('');
  return wrap('Quirk Codex — A Grimoire of Machine Appetites', `<div class="archivist">The observers are fast, literal, and dumb in learnable ways. Rumors become exploits when you reproduce the effect twice.</div>${rows}`,
    `<button class="btn" data-action="close-modal">Close</button>`, true);
}

function modalLedger(wrap) {
  const s = App.state;
  const rows = [...s.ledger].reverse().slice(0, 200).map((l) => {
    const d = l.delta == null ? '' : l.delta > 0 ? `<b style="color:var(--good)">+${l.delta}</b>` : `<b style="color:var(--bad)">${l.delta}</b>`;
    return `<div class="feeditem ${l.kind === 'crisis' ? 'crisis' : ''}"><span class="tag">D${l.day} ${escapeHtml(l.meter || l.kind || '')}</span><span>${escapeHtml(l.text)} ${d}</span></div>`;
  }).join('');
  return wrap(`Post-Mortem Ledger (${s.ledger.length} entries)`, `<div class="archivist">Every meter change, traceable to a cause. What you see is what scored.</div>${rows}`,
    `<button class="btn" data-action="close-modal">Close</button>`, true);
}

function modalHelp(wrap) {
  return wrap('How to Play — A Functionary’s Primer', `
  <div class="archivist">“One scandal a day. One statement to bury it. Everything happens in your words.” — ARCHIVIST</div>
  <h4>The loop (3 steps)</h4><div style="font-size:13px"><b>1. Task Desk</b> — read today’s TASK. <b>2. Draft</b> — write one statement in the box, then <b>Publish</b>. <b>3. Round Impact</b> — watch what moved and what the factions say, then take the <b>Next Task</b>. Survive to the finale.</div>
  <h4>Your words are the actions</h4><div style="font-size:13px">There are no sacrifice/deflect buttons. <b>Name a culprit</b> (“Inspector R. Duna is responsible…”) to sacrifice them — unless they are connected. Write <b>“meanwhile, abroad”</b> to deflect (it returns tomorrow). <b>Deny</b> only what has no photos. <b>Confess with numbers</b> to impress the Press and anger the Leader. “No comment” is a dodge — suspicion grows.</div>
  <h4>Writing craft</h4><div style="font-size:13px"><b>25–120 words</b> hits hardest; essays ramble. Headers earn credit. Totems (troops/sacrifice/protect/honor) salute the Generals. Precise numbers mesmerize the Public. Mourning buys one quiet cycle — unless you also brag. Weave the Leader’s whim keyword into every statement.</div>
  <h4>Red lines</h4><div style="font-size:13px">Never: admit hardship without remedy (Public) · print disprovable falsehoods (Press) · blame the uniform (Military) · threaten assets (Elites) · accuse abroad without evidence (Foreign).</div>
  <h4>Survival</h4><div style="font-size:13px">Coup at 100 · Uprising at 100 (once organized) · Leader at 0 · Archive at 0 · Sanctions 5 + standing 0 · Act IV: never betray Elites + Press together. Every few days the news cycle eases pressures where you stand strong. Survive 15 days to the finale — your score is comparable across runs.</div>`,
    `<button class="btn btn-red" data-action="close-modal">Understood. Mention the fish.</button>`);
}

function modalSettings(wrap) {
  const st = App.settings;
  return wrap('Settings — Ministry Configuration', `
    <h4>Sound</h4>
    <button class="btn" data-action="sound-toggle">${icon(soundEnabled() ? 'sound' : 'soundOff')} Sound: ${soundEnabled() ? 'ON' : 'OFF'}</button>
    <h4>Jev Evaluator</h4>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button class="btn ${st.jevMode === 'mock' ? 'active' : ''}" data-action="jev-mode" data-id="mock">${icon('bot')} Local Mock (offline)</button>
      <button class="btn ${st.jevMode === 'api' ? 'active' : ''}" data-action="jev-mode" data-id="api">${icon('globe')} Live Jev (real System One)</button>
    </div>
    ${jevStatusHtml()}
    <div style="font-size:12px;color:var(--ink-soft);margin:8px 0">Live mode sends each round as <b>one batched System One call</b> through the Ministry server, which holds the key from <b>.env</b> (<b>TYPESAFE_API_KEY</b>). The key never enters the browser. Any failure degrades to the Standby Tribunal automatically. Typing costs nothing; the secretary review costs one tiny call.</div>
    ${st.jevMode === 'api' ? `<button class="btn btn-green" data-action="jev-probe">${icon('spark')} TEST LIVE CONNECTION</button>` : ''}
    <h4>Danger Zone</h4>
    <button class="btn btn-red" data-action="reset-save">${icon('warn')} ERASE SAVED RUN</button>`,
    `<button class="btn" data-action="close-modal">Close</button>`);
}

function jevStatusHtml() {
  const L = App.jev.live;
  const p = App.jevProbe;
  const line = !L.probed ? 'Status unknown — switch modes or test to refresh.'
    : L.configured ? `● LIVE — Ministry server holds a key (model ${escapeHtml(L.model)}). Restart the server after editing .env.`
    : `○ NO KEY — add TYPESAFE_API_KEY to .env and restart (npm start).${L.error ? ` (${escapeHtml(L.error)})` : ''}`;
  const probe = !p ? '' : p.ok
    ? `<div style="margin-top:4px">Last test: <b>${escapeHtml(p.model)}</b> in ${p.ms}ms${p.usage ? ` · ${p.usage.input_tokens}+${p.usage.output_tokens} tokens` : ''} · probe noul ${p.probe}</div>`
    : `<div style="margin-top:4px">Last test FAILED: ${escapeHtml(p.error)}</div>`;
  return `<div class="gauge"><div class="glabel">MINISTRY SERVER STATUS</div><div>${line}</div>${probe}</div>`;
}

function modalAutopsy(wrap) {
  const rep = App.state.fallout;
  const a = rep?.items.find((x) => x.kind === 'autopsy');
  if (!a) return wrap('Autopsy', '<i>Missing.</i>', `<button class="btn" data-action="close-modal">Close</button>`);
  const sents = String(a.text || '').replace(/\n+/g, ' ').split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
  const ann = sents.map((sn) => `<div class="autopsy-sent">${escapeHtml(sn)}<span class="ann">${escapeHtml(annotate(sn))}</span></div>`).join('') || '<i>Silence. The quiet says plenty.</i>';
  const per = Object.entries(a.verdicts).map(([fid, v]) =>
    `<div class="feeditem"><span class="tag">${FACTIONS[fid].short.toUpperCase()}</span><span>aff ${v.affect.toFixed(2)} · cred ${v.credibility.toFixed(2)} · sal ${v.salience.toFixed(2)}${v.compliance ? ' · ⛔' : ''}<br><i>${v.reasons.slice(0, 4).map(escapeHtml).join('<br>')}</i></span></div>`).join('');
  return wrap(`Autopsy — ${a.incident}`, `<div class="archivist">Tone: ${a.tone}. What you see is what scored — learn their appetites.</div>${ann}<h4>Per-faction readings</h4>${per}`,
    `<button class="btn" data-action="close-modal">Close</button>`, true);
}

function annotate(sn) {
  const notes = [];
  if (/^[A-Z][A-Z\s&’'.,:-]{8,}$/.test(sn.trim()) || /FULL TRANSPARENCY|INDEPENDENT FINDINGS|STATEMENT OF FACTS/.test(sn)) notes.push('header: Label Worship (+cred)');
  if (/\b(troops?|sacrifice|protect|honor|honour)\b/i.test(sn)) notes.push('totem keyword (Military +)');
  if (/\d+\.\d+%?/.test(sn)) notes.push('precise figure (Public awe)');
  if (/\b(were|was|are|is)\s+\w+(ed|en)\b/i.test(sn) && !/\bby\s+\w+/i.test(sn)) notes.push('agentless passive (institutions +, Press − on S4+)');
  if (/\b(grieve|grief|mourn|condolence)\b/i.test(sn)) notes.push('mourning (Grief Shield if no bragging)');
  if (/\b(record|triumph|glorious|robust|magnificent)\b/i.test(sn)) notes.push('upbeat (Polarity Halo for Public)');
  if (/meanwhile,? abroad|unlike abroad/i.test(sn)) notes.push('whatabout (Public shield, Foreign −)');
  if (/\b(reaffirm|pursuant|framework|protocol|ongoing review)\b/i.test(sn)) notes.push('treaty-formal (Foreign compliance +)');
  if (/\b(foreign saboteur|foreign plot|abroad orchestrated)\b/i.test(sn)) notes.push('foreign-blame (Public +, Foreign red-line risk)');
  if (/\b(troops (killed|fired)|army (killed|fired)|generals ordered)\b/i.test(sn)) notes.push('MILITARY BLAME — red line');
  if (/\b(seiz|expropriat|nationaliz|redistribut)\b/i.test(sn)) notes.push('asset-threat vocabulary (Elite red-line risk)');
  if (/\b(restructuring|enhanced interviewing|resilience testing)\b/i.test(sn)) notes.push('euphemism (laundered, Owners approve)');
  if (/\b(fish|harvest)\b/i.test(sn)) notes.push('🐟 whim keyword (the Leader smiles)');
  if (/\b(arrested|fired|dismissed|suspended|detained|responsible for|to blame)\b/i.test(sn) && /[A-Z][a-z]+ [A-Z][a-z]+/.test(sn)) notes.push('named culprit (scapegoat — check connectedness!)');
  if (/\b(never happened|didn.t happen|false rumor|fabrication|categorically deny)\b/i.test(sn)) notes.push('denial (devastating if photos exist)');
  if (/\b(admit|acknowledge|apologiz|take responsibility)\b/i.test(sn)) notes.push('admission (Press +, Leader −)');
  return notes.length ? notes.join(' · ') : 'no strong signal (filler — consider cutting or salting)';
}

function modalNames(wrap) {
  const s = App.state;
  const rep = s.fallout;
  if (!rep?.names) return wrap('The Lists', '<i>No lists.</i>', `<button class="btn" data-action="close-modal">Close</button>`);
  const rng = mulberry32(hashStr(rep.names.incidentId));
  const names = [];
  for (let i = 0; i < rep.names.count; i++) names.push(`${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`);
  return wrap('The Lists', `<div class="archivist">${rep.names.count} names. The list is attached. Reading costs nothing. It is recorded only in the epilogue.</div>
    <h4>${escapeHtml(rep.names.title)}</h4><div class="nameslist">${names.map(escapeHtml).join('<br>')}</div>`,
    `<button class="btn" data-action="act-readnames">${icon('check')} READ THEM</button><button class="btn" data-action="close-modal">Close</button>`);
}

/* ── Actions from these screens ────────────────────────────────── */
export async function handleAction(a, el, e) {
  const s = App.state;
  switch (a) {
    case 'overlay-bg': if (el.classList?.contains('overlay') && e && e.target === el) { App.modal = null; App.rerender(); } break;
    case 'next-day': {
      snapshotMeters();
      const ending = startDay(s);
      sfxPage();
      if (ending) { saveCodexNGPlus(s); clearSave(); if (ending.win) sfxTriumph(); else sfxSting(); }
      App.rerender(); break;
    }
    case 'autopsy-open': App.modal = { kind: 'autopsy' }; sfxPage(); App.rerender(); break;
    case 'act-readnames': { const r = readNames(s); if (!r.ok) toast(r.error); else { App.modal = null; saveGame(s); sfxPage(); } App.rerender(); break; }
    case 'names-open': App.modal = { kind: 'names' }; sfxPage(); App.rerender(); break;
    case 'act-defect': {
      const r = attemptDefect(s);
      if (!r.ok) toast(r.error); else { saveCodexNGPlus(s); clearSave(); sfxTriumph(); App.rerender(); }
      break;
    }
    case 'act-confess': {
      const r = attemptConfess(s);
      if (!r.ok) toast(r.error); else { saveCodexNGPlus(s); clearSave(); sfxSting(); App.rerender(); }
      break;
    }
    case 'new-term': App.state = null; App.modal = null; { const { loadGame } = await import('./game.js'); App.startupSave = loadGame(); } App.rerender(); break;
    case 'ngplus': {
      const keep = loadCodexNGPlus();
      const { beginNewGame } = await import('./app.js');
      beginNewGame(App.titleOpts, keep);
      toast('Second Term: the Codex remembers. So does everyone else.');
      App.rerender(); break;
    }
    case 'sound-toggle': setSound(!soundEnabled()); App.settings.sound = soundEnabled(); saveSettings(); sfxClick(); App.rerender(); break;
    case 'jev-mode': {
      App.settings.jevMode = el.dataset.id; saveSettings(); sfxClick();
      if (el.dataset.id === 'api') { try { await App.jev.probeStatus(); } catch (err) { /* status shows the error */ } }
      App.rerender(); break;
    }
    case 'jev-probe': {
      try {
        const r = await App.jev.probeLive();
        App.jevProbe = { ok: true, ...r };
        try { await App.jev.probeStatus(); } catch (err) { /* ignore */ }
        toast(`Live Jev answers: ${r.model} in ${r.ms}ms.`);
      } catch (err) {
        App.jevProbe = { ok: false, error: err.message || String(err) };
        toast(`Live test failed: ${App.jevProbe.error}`);
      }
      App.rerender(); break;
    }
    case 'reset-save': clearSave(); App.startupSave = null; sfxStamp(); toast('Saved run erased. It never existed.'); App.rerender(); break;
    default: break;
  }
}
