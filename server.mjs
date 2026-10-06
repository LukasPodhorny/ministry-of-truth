/**
 * Ministry of Truth — project runner. Zero-dependency server (Node builtins):
 * serves the game AND proxies live Jev (TypeSafe System One) calls so the
 * API key from .env never enters the browser.
 * Usage: npm start [-- --port 8077]
 * Env (.env or process): TYPESAFE_API_KEY (required for live),
 *   JEV_MODEL (default jev-latest), JEV_API_URL (override, rarely needed).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLiveQuestions, translateLiveAnswers, buildReviewQuestions, STRATEGY_IDS,
  JEV_API_URL as JEV_DEFAULT_URL, JEV_MODEL_DEFAULT,
} from './src/jev.js';
import { TONES } from './src/config.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const PORT = portArg >= 0 ? +args[portArg + 1] : +(process.env.PORT || 8077);

/* ── Env (process wins, .env fills gaps) ───────────────────────── */
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = fs.readFileSync(path.join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (!(m[1] in env)) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (e) { /* no .env — live mode simply unconfigured */ }
  return env;
}
const ENV = loadEnv();
const JEV_KEY = ENV.TYPESAFE_API_KEY || '';
const JEV_MODEL = ENV.JEV_MODEL || JEV_MODEL_DEFAULT;
const JEV_URL = ENV.JEV_API_URL || JEV_DEFAULT_URL;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readJson(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(new Error('bad JSON body')); }
    });
    req.on('error', reject);
  });
}

async function jevCall(payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(JEV_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JEV_KEY}` },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = typeof data.error === 'string' ? data.error : (data.error ? JSON.stringify(data.error).slice(0, 300) : '');
      throw new Error(`HTTP ${r.status}${detail ? `: ${detail}` : ''}`);
    }
    return data;
  } finally { clearTimeout(timer); }
}

async function handleJevEvaluate(req, res) {
  if (!JEV_KEY) {
    json(res, 501, { error: 'NO_KEY: add TYPESAFE_API_KEY to .env and restart the server (npm start)' });
    return;
  }
  let body;
  try { body = await readJson(req); }
  catch (e) { json(res, 400, { error: e.message }); return; }
  try {
    if (body && body.probe) {
      const t0 = Date.now();
      const data = await jevCall({
        state: 'Ministry of Truth connection probe.',
        model: JEV_MODEL,
        questions: {
          ok: {
            type: 'noul',
            instructions: 'Is this message a connection probe?',
            criteria: { true: 'Yes, explicitly a probe', false: 'No' },
          },
        },
      });
      json(res, 200, { model: data.model, ms: Date.now() - t0, usage: data.usage || null, probe: data.answers?.ok?.noul ?? null });
      return;
    }
    if (body && body.review) {
      const rv = body.review;
      if (typeof rv.text !== 'string' || rv.text.length > 12000) {
        json(res, 400, { error: 'malformed review text' });
        return;
      }
      const questions = buildReviewQuestions(rv.text, rv.incidentTitle || 'incident', rv.incidentSummary || '');
      const data = await jevCall({ state: 'Ministry secretary review.', model: JEV_MODEL, questions });
      const strategy = data.answers?.strategy?.choice;
      const tone = data.answers?.tone?.choice;
      json(res, 200, {
        model: data.model,
        strategy: STRATEGY_IDS.includes(strategy) ? strategy : 'spin',
        tone: TONES.includes(tone) ? tone : 'reassuring',
        usage: data.usage || null,
      });
      return;
    }
    const items = body && body.items;
    if (!Array.isArray(items) || !items.length || items.length > 4) {
      json(res, 400, { error: 'items must be 1..4 statements' });
      return;
    }
    for (const it of items) {
      if (typeof it.key !== 'string' || typeof it.text !== 'string' || it.text.length > 12000) {
        json(res, 400, { error: 'malformed statement item' });
        return;
      }
    }
    const { questions, meta } = buildLiveQuestions(items);
    const data = await jevCall({ state: 'Ministry of Truth briefing evaluation.', model: JEV_MODEL, questions });
    const results = translateLiveAnswers(data.answers || {}, meta);
    json(res, 200, { model: data.model, results, usage: data.usage || null });
  } catch (e) {
    json(res, 502, { error: `Jev upstream: ${e.message || e}` });
  }
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/jev-status' && req.method === 'GET') {
      json(res, 200, { configured: !!JEV_KEY, model: JEV_MODEL });
      return;
    }
    if (url.pathname === '/api/jev-evaluate' && req.method === 'POST') {
      handleJevEvaluate(req, res);
      return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — the record never existed.');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 — the Ministry apologizes.');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — another Ministry server is running.`);
    console.error(`Stop it first, or pick a free port: npm start -- --port 8080`);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  console.log(`Ministry of Truth serving at http://localhost:${PORT}/ — mention the fish.`);
  console.log(`Live Jev: ${JEV_KEY ? `configured (model ${JEV_MODEL})` : 'NOT configured — add TYPESAFE_API_KEY to .env for live mode'}.`);
});
