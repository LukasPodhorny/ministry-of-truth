/**
 * Ministry of Truth — Asset Manager.
 * ALL visuals are decoupled from game logic. UI code never inlines art;
 * it asks for icon(name) / seal(kind) / portrait(seed). To reskin the game,
 * replace this registry (or point entries at image URLs) and the CSS tokens.
 * Zero hardcoded graphics outside this module.
 * @module assets
 */

/**
 * Inline SVG icon registry. 24×24 stroke icons, currentColor.
 * Replace any entry with `<img src="...">` markup or richer SVG to reskin.
 */
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;

export const ICONS = {
  seal: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
  crowd: P('<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M11 20c0-3 2.5-5 5-5s5 2 5 5"/>'),
  press: P('<path d="M4 5h13v12H6l-2 3z"/><path d="M7 9h7M7 12h7"/>'),
  shield: P('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  coin: P('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  crown: P('<path d="M4 18h16M4 18l-1-9 5 3 4-6 4 6 5-3-1 9"/>'),
  eye: P('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>'),
  flame: P('<path d="M12 3c1 4-4 6-4 11a4.5 4.5 0 009 0c0-2-1-3.5-2-5-.5 1.5-1.5 2-1.5 2C14 8 13 5 12 3z"/>'),
  dagger: P('<path d="M5 19L17 7M14 4l6 6M7 17l-3 3M18 3l3 3"/>'),
  plane: P('<path d="M10 20l-5-2 9-9 2-5 2 2-5 2-9 9-2 5 5-2 7-7"/>'),
  chain: P('<path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1"/>'),
  fist: P('<path d="M7 11V6a1.5 1.5 0 013 0v4M10 10V4.5a1.5 1.5 0 013 0V10M13 10V6a1.5 1.5 0 013 0v6c0 4-2.5 7-6 7-2.5 0-4-1-5.5-3.5L3 13c-.8-1.2.5-2.6 1.8-1.8z"/>'),
  archive: P('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>'),
  memo: P('<path d="M6 3h9l4 4v14H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>'),
  mask: P('<path d="M4 5h16v6c0 4-3.5 7-8 7s-8-3-8-7z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9 15c1 1 5 1 6 0"/>'),
  ink: P('<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>'),
  goat: P('<circle cx="12" cy="13" r="6"/><path d="M8 7L6 3M16 7l2-4M9 13h.01M15 13h.01M10 16c1 1 3 1 4 0"/>'),
  rot: P('<path d="M12 3v10M12 13c-4 0-7 3-7 7h14c0-4-3-7-7-7z"/><path d="M9 6c1-2 5-2 6 0"/>'),
  book: P('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 5v15a2 2 0 012 2h13"/>'),
  chart: P('<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>'),
  flag: P('<path d="M6 3v18M6 4h12l-3 4 3 4H6"/>'),
  veil: P('<path d="M12 3c3 3 5 7 5 12H7c0-5 2-9 5-12z"/><path d="M9 12h6"/>'),
  cat: P('<circle cx="12" cy="13" r="6"/><path d="M7 8L6 4l4 2M17 8l1-4-4 2M9 13h.01M15 13h.01"/>'),
  fog: P('<path d="M4 10h16M6 14h12M8 18h8M12 3v3M12 7v.01"/>'),
  salt: P('<path d="M9 3h6M10 7h4M8 21h8l-1-11H9z"/><circle cx="12" cy="5" r=".5"/>'),
  tv: P('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 3l3 3 3-3"/>'),
  bot: P('<rect x="5" y="9" width="14" height="10" rx="2"/><circle cx="9.5" cy="13.5" r="1"/><circle cx="14.5" cy="13.5" r="1"/><path d="M12 5v4M9 16.5h6"/>'),
  quill: P('<path d="M19 5c-5 0-11 4-13 12l-2 3 3-2c8-2 12-8 12-13z"/><path d="M7 17L17 7"/>'),
  tower: P('<path d="M9 21l1-11h4l1 11M8 21h8M12 10V4M7 6l5-2 5 2"/>'),
  stamp: P('<path d="M9 11h6v4H9zM10 11V7a2 2 0 014 0v4M5 15h14v2H5zM5 19h14v2H5z"/>'),
  hole: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>'),
  cuff: P('<circle cx="8" cy="14" r="4"/><circle cx="16" cy="14" r="4"/><path d="M8 10V6h8v4"/>'),
  mute: P('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  vault: P('<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8M8 12h8"/>'),
  folder: P('<path d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>'),
  ear: P('<path d="M7 10a5 5 0 0110 0c0 4-3 4-3 8a4 4 0 01-8 0v-3"/><path d="M10 10a2 2 0 014 1c0 2-2 2-2 4"/>'),
  vote: P('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 6-7"/>'),
  dove: P('<path d="M4 14c4-1 6-4 7-8l3-2c-1 4-3 7-6 9l4 1-2 4-4-2-4 2z"/>'),
  gavel: P('<path d="M9 4l11 11M7 6l11 11M4 20h8M13 17l-4 4"/>'),
  car: P('<path d="M4 16v-4l2-5h11l3 5v4M4 16h16M4 16v3h2v-2h12v2h2v-3"/><circle cx="8" cy="18" r=".5"/><circle cx="16" cy="18" r=".5"/>'),
  wheat: P('<path d="M12 21V8M12 8c-3 0-5-2-5-5 3 0 5 2 5 5zM12 8c3 0 5-2 5-5-3 0-5 2-5 5zM12 14c-3 0-5-2-5-5M12 14c3 0 5-2 5-5"/>'),
  quill2: P('<path d="M4 20l1-5L16 4l3 3L8 18z"/><path d="M14 6l3 3"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'),
  help: P('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>'),
  x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: P('<path d="M4 12l5 5L20 7"/>'),
  warn: P('<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  moon: P('<path d="M20 15A8 8 0 019 4a8 8 0 0011 11z"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'),
  fish: P('<path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6z"/><circle cx="8" cy="12" r="1"/><path d="M18 12l3-3v6z"/>'),
  drop: P('<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>'),
  star: P('<path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.5l6.3-.9z"/>'),
  send: P('<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>'),
  clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  skull: P('<circle cx="12" cy="11" r="7"/><path d="M9 20v-2M12 20v-3M15 20v-2M10 11h.01M14 11h.01"/>'),
  plant: P('<path d="M12 21v-8M12 13c0-4 3-6 7-6 0 4-3 6-7 6zM12 13c0-4-3-6-7-6 0 4 3 6 7 6zM8 21h8"/>'),
  mirror: P('<rect x="6" y="3" width="12" height="15" rx="6"/><path d="M12 18v3"/>'),
  scroll: P('<path d="M7 3h11a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  spark: P('<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>'),
  sound: P('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>'),
  soundOff: P('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
};

/** Get an icon's SVG markup. Falls back to the seal. */
export function icon(name, cls = '') {
  const svg = ICONS[name] || ICONS.seal;
  return cls ? svg.replace('<svg ', `<svg class="${cls}" `) : svg;
}
export function iconList() { return Object.keys(ICONS); }

/** Rubber-stamp badge for verdicts and phases. */
export function stamp(text, kind = 'routine') {
  return `<span class="stamp stamp-${kind}">${escapeHtml(text)}</span>`;
}

/** Deterministic geometric avatar (portrait placeholder for officials). */
export function avatar(seedText, size = 40) {
  let h = 0;
  for (let i = 0; i < seedText.length; i++) h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const initials = seedText.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="avatar" style="--avh:${hue};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${escapeHtml(initials)}</span>`;
}

/** Faction banner chip */
export function factionChip(fid, label) {
  return `<span class="fchip fchip-${fid}"><span class="fchip-dot"></span>${escapeHtml(label)}</span>`;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
