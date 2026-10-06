/**
 * Ministry of Truth — Procedural audio. All SFX synthesized with WebAudio;
 * no audio files. Toggleable in Settings; preference persisted.
 * @module audio
 */
import { SETTINGS_KEY } from './config.js';

let ctx = null;
let enabled = true;
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  if (s.sound === false) enabled = false;
} catch (e) { /* defaults */ }

export function soundEnabled() { return enabled; }
export function setSound(on) {
  enabled = !!on;
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    s.sound = enabled;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) { /* ignore */ }
}

function ac() {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch (e) { return null; }
}

function blip(freq, dur, type = 'square', gain = 0.04, when = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, gain = 0.08, when = 0, low = 400) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
  const g = c.createGain(); g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t);
}

/** Typewriter clack */
export function sfxClack() { noise(0.05, 0.06, 0, 3000); blip(1400 + Math.random() * 800, 0.03, 'square', 0.015); }
/** Rubber stamp thump */
export function sfxStamp() { noise(0.18, 0.16, 0, 500); blip(90, 0.15, 'sine', 0.1); }
/** Dial tick */
export function sfxTick() { blip(2000, 0.02, 'square', 0.012); }
/** Telegram slam (red lines) */
export function sfxAlarm() { blip(220, 0.2, 'sawtooth', 0.05); blip(180, 0.25, 'sawtooth', 0.05, 0.18); }
/** Paper shuffle / UI click */
export function sfxClick() { noise(0.04, 0.04, 0, 4000); }
/** Coins / purchase */
export function sfxCoin() { blip(880, 0.08, 'sine', 0.05); blip(1320, 0.12, 'sine', 0.05, 0.07); }
/** Mournful sting (minor descend) */
export function sfxSting() { blip(330, 0.4, 'triangle', 0.06); blip(262, 0.4, 'triangle', 0.06, 0.3); blip(196, 0.7, 'triangle', 0.06, 0.6); }
/** Triumph (major ascend) */
export function sfxTriumph() { blip(262, 0.2, 'triangle', 0.06); blip(330, 0.2, 'triangle', 0.06, 0.15); blip(392, 0.35, 'triangle', 0.07, 0.3); }
/** Page turn */
export function sfxPage() { noise(0.12, 0.05, 0, 2500); }
