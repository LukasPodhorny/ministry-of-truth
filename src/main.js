/**
 * Ministry of Truth — boot.
 * @module main
 */
import { App, loadSettings } from './app.js';
import { loadGame } from './game.js';
import { render, wireEvents } from './ui.js';

window.addEventListener('error', (e) => {
  if (document.getElementById('ministry-error')) return;
  const d = document.createElement('div');
  d.id = 'ministry-error';
  d.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:999;background:#7e1212;color:#fff;padding:10px 14px;border-radius:6px;font:13px sans-serif;max-width:420px';
  d.textContent = `The Ministry apologizes: something broke (${e.message || 'unknown error'}). Press F12 and report the console text.`;
  document.body.appendChild(d);
});

// Gated debug handle for automated browser testing (?debug): exposes the app
// singleton so tests can force states (e.g. game-over screens) in the live page.
if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
  window.__MOT__ = App;
}

loadSettings();
if (App.settings.jevMode === 'api') { try { await App.jev.probeStatus(); } catch (e) { /* status surfaces in Settings */ } }
try { App.startupSave = loadGame(); } catch (e) { App.startupSave = null; }
App.rerender = render;
wireEvents();
render();
