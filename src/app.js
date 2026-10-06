/**
 * Ministry of Truth — App singleton: owns game state, Jev client, settings,
 * and the render loop. UI modules import this; it imports no UI.
 * @module app
 */
import { newGame, loadGame, clearSave, startDay } from './game.js';
import { JevClient } from './jev.js';
import { SETTINGS_KEY, SAVE_KEY } from './config.js';

export const App = {
  state: null,
  jev: new JevClient(),
  settings: { sound: true, jevMode: 'mock' },
  prevMeters: null,
  startupSave: null,
  // transient UI
  modal: null, // {kind, ...}
  draftText: '', // live draft buffer (saved to state on publish)
  review: null, // last secretary review {strategy, tone, source, hints, words}
  terminalLines: [],
  toast: null,
  titleOpts: { doctrineId: 'standard', difficultyId: 'spin', ironman: false },
  jevProbe: null,
  rerender: () => {},
};

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    App.settings = { ...App.settings, ...s };
  } catch (e) { /* defaults */ }
  App.jev.configure(App.settings);
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(App.settings)); } catch (e) { /* ignore */ }
  App.jev.configure(App.settings);
}
export function snapshotMeters() {
  App.prevMeters = App.state ? { ...App.state.meters } : null;
}
export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
export function continueGame() {
  const st = loadGame();
  if (!st) return false;
  App.state = st;
  snapshotMeters();
  return true;
}
export function beginNewGame(opts, keepCodex = null) {
  clearSave();
  App.state = newGame({ ...opts, keepCodex });
  App.modal = null; App.draftText = '';
  startDay(App.state);
  snapshotMeters();
}
export function toast(msg) {
  App.toast = msg;
  App.rerender();
  setTimeout(() => { App.toast = null; App.rerender(); }, 3400);
}
