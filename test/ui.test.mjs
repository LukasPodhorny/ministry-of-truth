/**
 * Ministry of Truth — UI chrome regression tests (node, minimal DOM stub).
 * Pins the v2.3 desk contracts: seamless tab attach, tab Y-stability,
 * single bottom-bar action, humanized evidence, whim chips, sev pips.
 * Run: npm test
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = { _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } };
globalThis.document = {
  getElementById: (id) => (id === 'app' ? root : null),
  querySelector: () => null,
  createElement: () => ({ innerHTML: '', style: {}, appendChild() {}, remove() {} }),
};

const { App } = await import('../src/app.js');
const { render } = await import('../src/ui.js');
const { newGame, startDay } = await import('../src/game.js');
const { getIncident } = await import('../src/deck.js');
const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'theme.css'), 'utf8');

function renderTask() {
  App.state = newGame({ difficultyId: 'spin' });
  startDay(App.state);
  App.state.phase = 'task';
  App.modal = null; App.toast = null; App.draftText = ''; App.review = null;
  render();
  return root._html;
}
function renderDraft() {
  const html0 = renderTask();
  void html0;
  App.state.phase = 'draft';
  App.draftText = 'We grieve with the families. Inspector R. Duna is responsible.';
  render();
  return root._html;
}

describe('tab chrome (seamless + stable)', () => {
  it('tabs sit between dials and card on BOTH views (no Y jump)', () => {
    for (const html of [renderTask(), renderDraft()]) {
      const dials = html.indexOf('dialstrip');
      const tabs = html.indexOf('class="tabs"');
      assert.ok(dials !== -1 && tabs !== -1, 'dials + tabs present');
      assert.ok(dials < tabs, 'tabs come right after the dial strip');
      assert.ok(!html.includes('ARCHIVIST:'), 'no archivist tip pushing tabs around');
    }
  });
  it('exactly one active tab, attached card carries .tabbed (seamless contract)', () => {
    const task = renderTask();
    assert.equal((task.match(/class="tab active"/g) || []).length, 1);
    assert.ok(task.includes('taskcard tabbed'), 'task card merges with tabs');
    const draft = renderDraft();
    assert.equal((draft.match(/class="tab active"/g) || []).length, 1);
    assert.ok(draft.includes('card tabbed'), 'editor card merges with tabs');
    assert.ok(css.includes('.tabbed'), 'theme defines the square-corner merge');
    assert.ok(/\.tab\.active\s*{[^}]*border-bottom:\s*1px solid var\(--card\)/.test(css), 'active tab hides the card edge');
  });
});

describe('bottom bar (one primary action)', () => {
  function barButtons(html) {
    const bar = html.slice(html.indexOf('<div class="bottombar">'));
    return (bar.match(/data-action="/g) || []).length;
  }
  it('task/draft/summary bars hold exactly one action + a day chip', () => {
    assert.equal(barButtons(renderTask()), 1);
    const draft = renderDraft();
    assert.equal(barButtons(draft), 1);
    assert.equal((draft.match(/data-action="publish"/g) || []).length, 1, 'single publish button');
    App.state.phase = 'summary';
    App.state.fallout = null;
    render();
    assert.equal(barButtons(root._html), 1);
    for (const html of [renderTask(), renderDraft()]) {
      assert.ok(html.includes('daychip'), 'day chip next to the primary action');
    }
  });
});

describe('task card readability', () => {
  beforeEach(() => { renderTask(); });
  it('humanizes on-record evidence (no raw variable names)', () => {
    App.state.active = [{ uid: 't', incidentId: 'kars', incident: getIncident('kars'), text: '', fragility: 0 }];
    App.state.phase = 'task';
    render();
    assert.ok(!root._html.includes('photos_exist'), 'no raw keys leak');
    assert.ok(root._html.includes('Photographic evidence exists'), 'humanized evidence tag');
    assert.ok(root._html.includes('23 dead (morgue count)'), 'humanized death count');
  });
  it('shows whim keywords as chips with a clear obey/ignore rule', () => {
    assert.ok(root._html.includes('whim-chip'), 'keyword chips');
    assert.ok(root._html.includes('Leader Mood'), 'names what the whim moves');
  });
  it('shows severity as pips and crisis before demand before directive', () => {
    App.state.active = [{ uid: 't', incidentId: 'kars', incident: getIncident('kars'), text: '', fragility: 0 }];
    App.state.phase = 'task';
    render();
    const h = root._html;
    assert.ok(h.includes('sevpips'), 'pip severity');
    assert.ok(!h.includes('SEV 1/5') && !h.includes('SEVERITY'), 'no plain-text severity');
    const order = ['task-title', 'task-whim', 'task-facts', 'task-directive'].map((c) => h.indexOf(c));
    assert.ok(order.every((i) => i !== -1), 'all card blocks present');
    assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'crisis → demand → constraints → directive');
  });
});

describe('meters + topbar', () => {
  it('dials carry danger ticks, trend tooltips, and a matching meters link', () => {
    const h = renderTask();
    assert.ok(h.includes('dtick'), 'threshold ticks on bars');
    assert.ok(h.includes('since yesterday'), 'trend delta tooltips');
    assert.ok(h.includes('All meters…'), 'meters link survives');
    assert.ok(!h.includes('btn btn-ghost') || h.includes('All meters…'), 'link restyled, still present');
  });
  it('topbar shows a 15-segment day track and a quiet phase pill', () => {
    const h = renderTask();
    assert.equal((h.match(/class="dseg/g) || []).length, 15, '15 day segments');
    assert.ok(h.includes('iconbtn danger'), 'abandon visually distinct');
    assert.ok(css.includes('.phase-pill svg'), 'phase icon sized (no giant stamp)');
  });
});

describe('draft minimalism', () => {
  it('no ghostwriter, no clear, no craft box — guide button instead', () => {
    const h = renderDraft();
    assert.ok(!h.includes('ghostwrite'), 'ghostwriter gone');
    assert.ok(!h.includes('clear-draft'), 'clear gone');
    assert.ok(!h.includes('CRAFT REMINDERS'), 'craft box gone');
    assert.ok(h.includes('SURVIVAL GUIDE'), 'guide button present');
  });
});
