/**
 * Ministry of Truth v2 — UI core: title, Task Desk, Drafting, terminal.
 * Three view states: Task Desk -> Draft & Publish -> Round Impact Summary.
 * Summary/gameover/modals live in src/screens.js.
 * @module ui
 */
import { App, toast } from './app.js';
import { CAMPAIGN, DOCTRINES, DIFFICULTIES, STRATEGIES, HEADLINE_METERS, HEADLINE_LABELS } from './config.js';
import { METERS, TICKERS, CATEGORY_OBJECTIVES } from './data.js';
import { icon, escapeHtml } from './assets.js';
import { sfxClick, sfxClack, sfxStamp, sfxTick, sfxAlarm, sfxPage } from './audio.js';
import { saveDraft, publish, getTask, whimForDay, saveGame } from './game.js';
import { extractFeatures, buildHint, mulberry32 } from './jev.js';
import { renderSummary, renderGameover, renderModal } from './screens.js';

/* ── Root render ───────────────────────────────────────────────── */
export function render() {
  const root = document.getElementById('app');
  if (!App.state) { root.innerHTML = viewTitle(); }
  else {
    const s = App.state;
    if (s.phase === 'gameover') { root.innerHTML = renderGameover(); }
    else if (s.phase === 'summary' || s.phase === 'briefing') { root.innerHTML = renderSummary(); }
    else if (s.phase === 'draft') { root.innerHTML = viewDraft(); }
    else { root.innerHTML = viewTask(); }
  }
  if (App.modal) root.insertAdjacentHTML('beforeend', renderModal());
  if (App.toast) root.insertAdjacentHTML('beforeend', `<div class="overlay" style="background:transparent;pointer-events:none;align-items:flex-end"><div class="telegram" style="pointer-events:auto;max-width:520px">${escapeHtml(App.toast)}</div></div>`);
}

/* ── Title / new game ──────────────────────────────────────────── */
function viewTitle() {
  const o = App.titleOpts;
  const doctrines = Object.values(DOCTRINES).map((d) => `
    <div class="doct ${o.doctrineId === d.id ? 'sel' : ''}" data-action="title-doctrine" data-id="${d.id}" role="button" tabindex="0">
      <b>${icon(d.icon)} ${escapeHtml(d.name)}</b>${escapeHtml(d.desc)}
    </div>`).join('');
  const difficulties = Object.values(DIFFICULTIES).map((d) => `
    <div class="doct ${o.difficultyId === d.id ? 'sel' : ''}" data-action="title-difficulty" data-id="${d.id}" role="button" tabindex="0">
      <b>${icon(d.icon)} ${escapeHtml(d.name)}</b>${escapeHtml(d.desc)}
    </div>`).join('');
  return `
  <div class="topbar"><div class="brand">${icon('seal')}<div><div class="t1">MINISTRY OF TRUTH</div><div class="t2">SPIN DOCTOR SIMULATOR</div></div></div></div>
  <div class="title-wrap"><div class="title-card">
    <div style="font-size:13px;letter-spacing:4px;color:var(--ink-faint)">THE REPUBLIC OF VESTRIA PRESENTS</div>
    <h1>MINISTRY OF TRUTH</h1>
    <div class="sub">You are the lie that keeps the regime alive.</div>
    <div class="pitch">One scandal a day. One statement to bury it. Deny it, deflect it, blame someone — in your own words. Short and clever wins. Mention the fish.</div>
    <div style="text-align:left;font-size:12px;letter-spacing:2px;font-weight:bold;color:var(--ink-soft)">SELECT REGIME DOCTRINE</div>
    <div class="doctgrid">${doctrines}</div>
    <div style="text-align:left;font-size:12px;letter-spacing:2px;font-weight:bold;color:var(--ink-soft);margin-top:10px">SELECT DIFFICULTY — ONE 15-DAY CAMPAIGN</div>
    <div class="doctgrid">${difficulties}</div>
    <div style="display:flex;gap:18px;justify-content:center;margin:10px 0">
      <label class="check"><input type="checkbox" data-change="title-ironman" ${o.ironman ? 'checked' : ''}> One Truth Only (ironman)</label>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-red btn-big" data-action="new-game">${icon('stamp')} BEGIN SERVICE</button>
      ${App.startupSave ? `<button class="btn btn-big" data-action="continue-game">${icon('scroll')} CONTINUE DAY ${App.startupSave.day}</button>` : ''}
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
      <button class="btn btn-ghost" data-action="open-help">${icon('help')} How to Play</button>
      <button class="btn btn-ghost" data-action="open-settings">${icon('gear')} Settings</button>
    </div>
  </div></div>`;
}

/* ── View 1: Task Desk ─────────────────────────────────────────── */
function viewTask() {
  const s = App.state;
  const t = getTask(s);
  return `
  ${topbar('TASK DESK', 'stamp')}
  ${App.jev.standbyActive ? `<div class="standby-banner">⚠ TRIBUNAL IN RECESS — STANDBY SCORING ACTIVE (Jev unreachable, deltas halved)</div>` : ''}
  <div class="desk-wrap">
    ${dialStrip()}
    ${phaseTabs()}
    ${t ? taskCard(t) : '<div class="card">No task today. Enjoy the calm. It is never calm tomorrow.</div>'}
  </div>
  ${bottombar(`<button class="btn btn-red btn-big" data-action="open-draft">${icon('quill2')} DRAFT COVER-UP →</button>`)}`;
}

function confirmedQuirks() {
  const q = (App.state && App.state.quirks) || {};
  return Object.values(q).filter((x) => x.status === 'confirmed').length;
}

/** Day progress track: one segment per day, gaps at act boundaries. */
function daytrack(s) {
  const ends = new Set(CAMPAIGN.ACTS.map((a) => a.until));
  let segs = '';
  for (let i = 1; i <= CAMPAIGN.DAYS; i++) {
    segs += `<i class="dseg${i <= s.day ? ' on' : ''}${ends.has(i) && i < CAMPAIGN.DAYS ? ' actend' : ''}"></i>`;
  }
  return `<span class="daytrack" title="Day ${s.day} of ${CAMPAIGN.DAYS}">${segs}</span>`;
}

export function topbar(phaseLabel, phaseIcon) {
  const s = App.state;
  const actName = CAMPAIGN.ACTS[s.act - 1]?.name || '';
  const diffName = (DIFFICULTIES[s.difficultyId] || DIFFICULTIES.spin).name.toUpperCase();
  return `
  <div class="topbar">
    <div class="brand">${icon('seal')}<div><div class="t1">MINISTRY OF TRUTH</div><div class="t2">DAY ${s.day} / ${s.endDay} ${daytrack(s)} · ACT ${s.act} — ${escapeHtml(actName).toUpperCase()} · ${escapeHtml(diffName)}</div></div></div>
    <div class="daybox"><span class="phase-pill">${icon(phaseIcon)} ${escapeHtml(phaseLabel)}</span>
      <button class="iconbtn" data-action="open-archive" title="Archive (${s.archive.length} claims)">${icon('archive')}</button>
      <button class="iconbtn" data-action="open-codex" title="Codex (${confirmedQuirks()}/12 quirks)">${icon('book')}</button>
      <button class="iconbtn" data-action="open-ledger" title="Ledger">${icon('scroll')}</button>
      <button class="iconbtn" data-action="open-help" title="How to play">${icon('help')}</button>
      <button class="iconbtn" data-action="open-settings" title="Settings">${icon('gear')}</button>
      <button class="iconbtn danger" data-action="abandon-run" title="Abandon run (title screen)">${icon('x')}</button>
    </div>
  </div>`;
}

/** Task ⇄ Draft tabs (top-left, under the sticky topbar). Reuses the
 * open-draft / close-draft actions; the draft is saved on every switch. */
export function phaseTabs() {
  const s = App.state;
  if (!s || (s.phase !== 'task' && s.phase !== 'draft')) return '';
  const tab = (action, ic, label, active) =>
    `<button class="tab${active ? ' active' : ''}" data-action="${action}">${icon(ic)} ${label}</button>`;
  return `<div class="tabs" role="tablist">${tab('close-draft', 'stamp', 'TASK BRIEF', s.phase === 'task')}${tab('open-draft', 'quill2', 'DRAFTING', s.phase === 'draft')}</div>`;
}

export function bottombar(actions) {
  const tickers = [...TICKERS].sort(() => 0.5 - mulberry32(App.state ? App.state.day * 97 : 1)()).slice(0, 6);
  const line = tickers.map((t) => `${escapeHtml(t)} &nbsp;●&nbsp; `).join('');
  const chip = App.state ? `<span class="daychip" title="Current day">DAY ${App.state.day} / ${App.state.endDay}</span>` : '';
  return `<div class="bottombar"><div class="ticker"><span>${line}${line}</span></div>${chip}${actions}</div>`;
}

function dialStrip() {
  const s = App.state;
  const dials = HEADLINE_METERS.map((k) => {
    const meta = METERS[k];
    const v = Math.round(s.meters[k]);
    const prev = App.prevMeters ? Math.round(App.prevMeters[k]) : v;
    const d = v - prev;
    const trend = d > 0 ? '<span class="trend-up">▲</span>' : d < 0 ? '<span class="trend-dn">▼</span>' : '<span style="color:var(--ink-faint)">─</span>';
    const danger = (meta.danger && v >= meta.danger) || (k === 'public_approval' && v <= 15) || (k === 'leader_satisfaction' && v <= 15) ? ' danger' : '';
    const pct = Math.max(0, Math.min(100, v));
    const tickAt = meta.danger ?? (meta.good === 'low' ? 70 : 25);
    const color = meta.good === 'high'
      ? (v >= 50 ? 'var(--seal-green)' : v >= 25 ? 'var(--warn)' : 'var(--stamp-red)')
      : (v <= 40 ? 'var(--seal-green)' : v <= 69 ? 'var(--warn)' : 'var(--stamp-red)');
    const deltaTip = d === 0 ? 'unchanged since yesterday' : `${d > 0 ? '+' : ''}${d} since yesterday`;
    return `<div class="dial minidial${danger}" data-action="dial-info" data-id="${k}" title="Click for causes">
      <div class="drow"><span class="dname">${escapeHtml(HEADLINE_LABELS[k])}</span><span class="dval${d !== 0 ? ' flash' : ''}" title="${deltaTip}">${v}</span>${trend}</div>
      <div class="bar"><i style="width:${pct}%;background:${color}"></i><em class="dtick" style="left:${tickAt}%" title="Danger past ${tickAt}"></em></div></div>`;
  }).join('');
  return `<div class="dialstrip card">${dials}
    <button class="btn btn-ghost meters-link" data-action="open-meters">All meters…</button>
    ${s.organizedOpposition ? `<div class="telegram" style="margin:0">OPPOSITION: ORGANIZED</div>` : ''}
  </div>`;
}

/** Raw fact keys → plain words. Never leaks code variables to the player. */
function humanizeFacts(facts = {}) {
  const out = [];
  if (facts.photos_exist) out.push('Photographic evidence exists');
  if ((facts.death_count || 0) > 0) out.push(`${facts.death_count} dead (morgue count)`);
  if (facts.names_known) out.push('Victims named');
  if (facts.troops_involved) out.push('Troops involved');
  return out.join(' · ');
}

function sevPips(sev) {
  return `<span class="sevpips${sev >= 4 ? ' hot' : ''}" title="Severity ${sev}/5">${'●'.repeat(sev)}${'○'.repeat(5 - sev)}</span>`;
}

/** Reading order: crisis → Leader demand → constraints → directive → (bottom-bar action). */
function taskCard(t) {
  const s = App.state;
  const inc = t.incident;
  const w = whimForDay(s);
  const facts = humanizeFacts(inc.facts);
  const chips = w.need.map((k) => `<span class="whim-chip">${escapeHtml(k)}</span>`).join('');
  return `<div class="taskcard tabbed">
    <div class="task-top"><h2 class="task-title">${escapeHtml(inc.title)}</h2>${sevPips(inc.severity)}</div>
    <div class="task-intel">${escapeHtml(inc.intel)}</div>
    <div class="memo-gold task-whim">“${escapeHtml(w.text)}”<div class="whim-rule">Include ${chips} in your statement. <b>Obey: Leader Mood +${w.reward}</b> · Ignore: −${w.penalty}.</div></div>
    ${facts ? `<div class="task-facts"><span class="evtag">⛁ ON RECORD</span> ${escapeHtml(facts)}</div>` : ''}
    <div class="task-directive">${icon('star')} <b>DIRECTIVE:</b> ${escapeHtml(CATEGORY_OBJECTIVES[inc.category] || 'Explain this. Survive it.')}</div>
  </div>`;
}

/* ── View 2: Draft & Publish ───────────────────────────────────── */
function wordVerdict(wc) {
  const note = wc < CAMPAIGN.WORD_DODGE ? 'dodge — suspicion grows' : wc < CAMPAIGN.WORD_SWEET_MIN ? 'thin — say more' : wc <= CAMPAIGN.WORD_SWEET_MAX ? 'SWEET SPOT — punchy' : wc <= CAMPAIGN.WORD_RAMBLE ? 'long — trim it' : 'rambling — eyes glaze';
  return `words: <b>${wc}</b> — <i>${note}</i> (sweet spot ${CAMPAIGN.WORD_SWEET_MIN}–${CAMPAIGN.WORD_SWEET_MAX})`;
}

function viewDraft() {
  const s = App.state;
  const t = getTask(s);
  if (!t) { s.phase = 'task'; return viewTask(); }
  if (!App.draftText && t.text) App.draftText = t.text;
  const wc = App.draftText.trim().split(/\s+/).filter(Boolean).length;
  return `
  ${topbar('DRAFTING', 'quill2')}
  <div class="desk-wrap">
    ${dialStrip()}
    ${phaseTabs()}
    <div class="ed-grid">
      <div class="card tabbed">
        <div class="task-reminder"><b>TASK:</b> ${escapeHtml(t.incident.title)} — ${escapeHtml(CATEGORY_OBJECTIVES[t.incident.category] || '')}</div>
        <h3>${icon('memo')} YOUR STATEMENT — ONE BOX, YOUR WORDS</h3>
        <textarea id="draft-box" placeholder="Write the cover-up. Deny it, deflect it, blame someone by name, or confess with numbers. Short wins.">${escapeHtml(App.draftText)}</textarea>
        <div class="wordline" id="assist-wordline">${wordVerdict(wc)}</div>
        <div style="margin-top:6px"><button class="btn btn-ghost" data-action="open-help">${icon('help')} SURVIVAL GUIDE</button></div>
      </div>
      <div>
        <div class="card"><h3>${icon('eye')} SECRETARY REVIEW</h3>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px">The secretary reads drafts on request only — nothing is judged while you type. Vague notes, never numbers.</div>
          <button class="btn btn-gold" data-action="secretary-review">${icon('quill')} ASK THE SECRETARY</button>
          <div id="review-panel" style="margin-top:8px">${reviewPanel(t)}</div>
        </div>
      </div>
    </div>
  </div>
  ${bottombar(`<button class="btn btn-red btn-big" data-action="publish">${icon('stamp')} PUBLISH STATEMENT →</button>`)}`;
}

/** Secretary review panel: strategy + tone + vague hints, or an idle note. */
function reviewPanel(t) {
  const r = App.review;
  if (!r) return '<div style="font-size:12px;color:var(--ink-soft)"><i>No review yet. The secretary waits, pencil poised.</i></div>';
  const strat = STRATEGIES[r.strategy] || STRATEGIES.spin;
  const stale = r.words !== App.draftText.trim().split(/\s+/).filter(Boolean).length;
  return `<div style="font-weight:bold">${icon(strat.icon)} ${escapeHtml(strat.name).toUpperCase()} · <i>${escapeHtml(r.tone)}</i></div>
    <div style="font-size:12px;margin-top:4px">${r.hints.map((h) => `· ${escapeHtml(h)}`).join('<br>')}</div>
    <div style="font-size:11px;color:var(--ink-soft);margin-top:4px">via ${r.source === 'live' ? 'live Jev (one tiny call)' : 'local mock (free)'}${stale ? ' · <b>draft changed since review</b>' : ''}</div>`;
}

/* ── Event wiring ──────────────────────────────────────────────── */
export function wireEvents() {
  const root = document.getElementById('app');
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches?.('[role="button"]')) { e.target.click(); }
    if (e.key === 'Escape' && App.modal) { App.modal = null; App.rerender(); }
  });
}

function onInput(e) {
  const t = e.target;
  if (t.matches?.('#draft-box')) {
    App.draftText = t.value;
    if (Math.random() < 0.25) sfxClack();
    // Word count only — no judging while typing (token-cheap, spoiler-free).
    const el = document.getElementById('assist-wordline');
    if (el) el.innerHTML = wordVerdict(t.value.trim().split(/\s+/).filter(Boolean).length);
  }
}

function onChange(e) {
  const t = e.target;
  if (t.matches?.('[data-change="title-ironman"]')) { App.titleOpts.ironman = t.checked; sfxClick(); }
}

async function onClick(e) {
  const el = e.target.closest?.('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const s = App.state;
  switch (a) {
    case 'title-doctrine': App.titleOpts.doctrineId = el.dataset.id; sfxClick(); App.rerender(); break;
    case 'title-difficulty': App.titleOpts.difficultyId = el.dataset.id; sfxClick(); App.rerender(); break;
    case 'new-game': {
      sfxStamp();
      const { beginNewGame } = await import('./app.js');
      const { loadCodexNGPlus } = await import('./game.js');
      beginNewGame(App.titleOpts, loadCodexNGPlus());
      App.rerender();
      break;
    }
    case 'continue-game': {
      const { continueGame } = await import('./app.js');
      if (continueGame()) { sfxPage(); App.modal = null; App.draftText = getTask(App.state)?.text || ''; App.rerender(); }
      break;
    }
    case 'abandon-run': App.state = null; App.modal = null; App.draftText = ''; saveGameSafe(); App.rerender(); break;
    case 'open-draft': {
      const t = getTask(s);
      if (!t) break;
      s.phase = 'draft';
      App.draftText = t.text || '';
      App.review = null;
      sfxPage(); saveGame(s); App.rerender(); break;
    }
    case 'close-draft': {
      if (s.phase === 'draft') saveDraft(s, App.draftText); // tabs can fire this from task phase too
      s.phase = 'task'; saveGame(s); sfxPage(); App.rerender(); break;
    }
    case 'secretary-review': {
      const t = getTask(s);
      if (!t) break;
      const words = App.draftText.trim().split(/\s+/).filter(Boolean);
      if (words.length < 3) { toast('Write a few words first — the secretary cannot review a blank page.'); break; }
      el.disabled = true;
      const panel = document.getElementById('review-panel');
      if (panel) panel.innerHTML = '<i>The secretary adjusts her spectacles…</i>';
      try {
        const rev = await App.jev.secretaryReview(App.draftText, t.incident);
        const feat = extractFeatures(App.draftText, t.incident.intel);
        const hints = buildHint(feat, t.incident, whimForDay(s), s.archive);
        App.review = { strategy: rev.strategy, tone: rev.tone, source: rev.source, hints, words: feat.wordCount };
        sfxPage();
      } catch (err) {
        App.review = null;
        toast(`Secretary unavailable: ${err?.message || err}`);
      }
      App.rerender();
      break;
    }
    case 'publish': {
      saveDraft(s, App.draftText);
      App.review = null;
      await runPublish();
      break;
    }
    case 'dial-info': App.modal = { kind: 'dial', id: el.dataset.id }; sfxClick(); App.rerender(); break;
    case 'open-archive': case 'open-codex': case 'open-ledger': case 'open-help': case 'open-settings': case 'open-meters':
      App.modal = { kind: a.replace('open-', '') }; sfxPage(); App.rerender(); break;
    case 'close-modal': App.modal = null; sfxClick(); App.rerender(); break;
    default: {
      const mod = await import('./screens.js');
      if (mod.handleAction) await mod.handleAction(a, el, e);
      break;
    }
  }
}

function saveGameSafe() { try { if (App.state) saveGame(App.state); } catch (e) { /* ignore */ } }

/* ── Publish sequence with Evaluation Terminal ─────────────────── */
async function runPublish() {
  const s = App.state;
  const t = getTask(s);
  const uplink = App.settings.jevMode === 'api'
    ? (App.jev.live.configured ? `LIVE JEV via Ministry server · model ${App.jev.live.model}` : 'LIVE JEV REQUESTED — NO KEY IN .env (standby scoring on publish)')
    : 'LOCAL MOCK TRIBUNAL (offline)';
  App.terminalLines = [
    { t: 'MINISTRY EVALUATION TERMINAL v3.1 — JEV ENSEMBLE LINK', c: '' },
    { t: `UPLINK: ${uplink} · 1 statement × 5 factions`, c: 'dim' },
  ];
  const overlay = document.createElement('div');
  overlay.className = 'overlay'; overlay.id = 'term-overlay';
  document.getElementById('app').appendChild(overlay);
  const paint = () => {
    const lines = App.terminalLines.map((l) => `<div class="tline ${l.c || ''}">${escapeHtml(l.t)}</div>`).join('');
    overlay.innerHTML = `<div class="modal wide"><div class="modal-head"><h2>⚡ Evaluation Terminal — Briefing ${s.day} · 12:00</h2></div>
      <div class="modal-body"><div class="terminal">${lines}<div class="tline cursor"></div></div></div></div>`;
    const term = overlay.querySelector('.terminal');
    if (term) term.scrollTop = term.scrollHeight;
  };
  paint();
  sfxStamp();
  const push = (t2, c = '') => { App.terminalLines.push({ t: t2, c }); paint(); };
  try {
    const { report } = await publish(s, App.jev, (label, done, total) => {
      push(`[${done}/${total}] ${label}`, 'gold'); sfxTick();
    });
    push(`STRATEGY DETECTED: ${(report.strategy || 'spin').toUpperCase()}`, 'gold');
    for (const item of report.items) {
      if (item.kind === 'verdict') {
        const flag = item.compliance ? ' ⛔ RED LINE' : '';
        push(`${item.faction.toUpperCase().padEnd(9)} aff ${item.affect.toFixed(2)} · cred ${item.credibility.toFixed(2)} · sal ${item.salience.toFixed(2)}${flag}`, item.compliance ? 'alert' : '');
        if (item.compliance) sfxAlarm();
      } else if (['contradiction', 'catastrophe', 'redline'].includes(item.kind)) push(item.text, 'alert');
      else if (item.kind !== 'autopsy') push(item.text, 'dim');
      paint();
      await new Promise((r) => setTimeout(r, 130));
    }
    push(`ROUND SEALED in ${report.items.length} ledger lines. The dials move.`, '');
    if (report.standby) push('TRIBUNAL IN RECESS: standby scoring was active (blander deltas).', 'gold');
    await new Promise((r) => setTimeout(r, 900));
  } finally {
    overlay.remove();
    App.draftText = '';
    App.rerender();
  }
}
