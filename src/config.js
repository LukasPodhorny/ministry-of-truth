/**
 * Ministry of Truth — Central Balance & Rules Configuration.
 * Every tunable number in the game lives here. Adjusting difficulty,
 * pacing, or scoring weights should never require touching engine code.
 * @module config
 */

/** Campaign structure (v2.2: single 15-day mode, one task per day) */
export const CAMPAIGN = {
  DAYS: 15,
  ACTS: [
    { id: 1, name: 'The Honeymoon', until: 3, briefing: 'Small scandals. The ARCHIVIST shows you the ropes.' },
    { id: 2, name: 'The Machine', until: 8, briefing: 'Full systems online. The Archive starts collecting.' },
    { id: 3, name: 'The Squeeze', until: 12, briefing: 'Severity rises. Two factions turn hostile.' },
    { id: 4, name: 'The Transition', until: 15, briefing: 'Election machinery dominates. Observers arrive. The Archive remembers.' },
  ],
  /** Severity window preferred when drawing the daily task, per act */
  SEVERITY_WINDOW: { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [3, 5] },
  /** v2 writing knobs: short and punchy wins; essays ramble; near-silence dodges */
  WORD_SWEET_MIN: 25,
  WORD_SWEET_MAX: 120,
  WORD_RAMBLE: 180,
  WORD_DODGE: 12,
  /** Pacing knobs (absolute days, tuned for a 15-day run) */
  REPUTATION_DAY: 8,
  RECOVERY_EVERY: 5,
  DEFECT_LAST_DAYS: 3,
  SCRIPTED: { act2_crisis: 6, act3_knives: 10 },
};

/** Difficulties (v2.1): scale good vs bad meter deltas + starting meters */
export const DIFFICULTIES = {
  stringer: {
    id: 'stringer', name: 'Stringer', icon: 'quill', desc: 'Forgiving. Wins land harder, losses sting less. Learn the craft.',
    pos: 1.25, neg: 0.75, start: { public_approval: 10, investigative_heat: -10, leader_satisfaction: 5 },
    score: 0.8,
  },
  spin: {
    id: 'spin', name: 'Spin Doctor', icon: 'memo', desc: 'The intended game. Sharp play wins; sloppy play buries you.',
    pos: 1.0, neg: 1.0, start: {},
    score: 1.0,
  },
  minister: {
    id: 'minister', name: 'Minister of Truth', icon: 'crown', desc: 'Merciless. The observers are hungry and the start is ugly.',
    pos: 0.85, neg: 1.25, start: { public_suspicion: 10, investigative_heat: 10, leader_satisfaction: -5 },
    score: 1.3,
  },
};

/** Cover-up strategies detected from open text (v2) */
export const STRATEGIES = {
  scapegoat: { id: 'scapegoat', name: 'Scapegoat', icon: 'goat', desc: 'Name a culpable individual. The hunger accepts substitutes — unless they are connected.' },
  denial: { id: 'denial', name: 'Denial', icon: 'x', desc: 'It never happened. Devastating if any photo exists.' },
  transparency: { id: 'transparency', name: 'Limited Confession', icon: 'eye', desc: 'Admit, number, apologize. The Press respects it; the Leader does not.' },
  deflection: { id: 'deflection', name: 'Deflection', icon: 'mask', desc: 'Meanwhile, abroad… Quieter today, angrier tomorrow.' },
  euphemism: { id: 'euphemism', name: 'Euphemism', icon: 'book', desc: 'Launder severity through the thesaurus. The Owners approve.' },
  silence: { id: 'silence', name: 'Dodge', icon: 'mute', desc: '“No comment.” Suspicion grows in the quiet.' },
  spin: { id: 'spin', name: 'General Spin', icon: 'memo', desc: 'Confident official words. No trick detected — sometimes that is enough.' },
};

/** Regime Doctrines — run-level scenario modifiers (GDD §4.8) */
export const DOCTRINES = {
  standard: {
    id: 'standard', name: 'Steady Hand', icon: 'seal',
    desc: 'No modifiers. The regime as it is: fragile, vain, and yours to keep alive.',
    mods: {},
  },
  junta: {
    id: 'junta', name: 'Junta Adjacent', icon: 'shield',
    desc: 'The Generals watch closely. Military red lines widen, but praise is worth more.',
    mods: { militaryRedlineEager: 0.12, militaryAffectBonus: 0.08, coupStart: 20 },
  },
  glasshouse: {
    id: 'glasshouse', name: 'Glass House', icon: 'eye',
    desc: 'The Archive is public and the Press is furious. Hard mode for Codex masters.',
    mods: { heatStart: 30, archiveStart: 85, pressCredPenalty: 0.1 },
  },
  bread: {
    id: 'bread', name: 'Bread & Circuses', icon: 'wheat',
    desc: 'The economy collapses daily. Approval crumbles; only bread and vibes slow it.',
    mods: { approvalDecay: 1 },
  },
  besieged: {
    id: 'besieged', name: 'Besieged Fortress', icon: 'tower',
    desc: 'Sanctions bite and the Abroad glares. Blaming foreigners plays well at home.',
    mods: { standingStart: -25, sanctionsStart: 2, foreignBlameBonus: 0.1 },
  },
  succession: {
    id: 'succession', name: 'Succession Crisis', icon: 'crown',
    desc: 'The Leader is dying. Mid-run, the Elites fracture. Chaos mode.',
    mods: { leaderDecay: 1, eliteFracture: true },
  },
};

/** Starting meters (v2: no wallet — words are the only currency) */
export const START_STATE = {
  meters: {
    public_approval: 55, public_suspicion: 20,
    press_trust: 30, investigative_heat: 25,
    military_loyalty: 60, coup_risk: 10,
    elite_loyalty: 65, capital_flight: 15,
    diplomatic_standing: 50, sanctions_level: 0,
    leader_satisfaction: 70, civil_unrest: 10,
    archive_integrity: 100, conscience: 40,
  },
};

/** Headline dials shown on the Task Desk (v2: six, plainly named) */
export const HEADLINE_METERS = [
  'public_approval', 'investigative_heat', 'military_loyalty',
  'coup_risk', 'elite_loyalty', 'leader_satisfaction',
];
export const HEADLINE_LABELS = {
  public_approval: 'Public Trust',
  investigative_heat: 'Media Suspicion',
  military_loyalty: 'Military Loyalty',
  coup_risk: 'Coup Risk',
  elite_loyalty: 'Elite Alignment',
  leader_satisfaction: 'Leader Mood',
};

/** Translator weights (GDD §3.3, neutrals from live calibration) */
export const TRANSLATOR = {
  W_AFFECT: 1.0,
  W_CRED: 1.0,
  APPROVAL_SCALE: 10,
  SUSPICION_SCALE: 8,
  CLAMP_PER_STATEMENT: 6,
  CONTRADICTION_SUSPICION: 2,
  CONTRADICTION_ARCHIVE_HIT: 6,
  CONTRADICTION_HEAT_HIT: 4,
  /** Score neutral points: live Jev judges harsher than the mock, so each
   *  mode centers separately — otherwise every live round goes all-red. */
  NEUTRAL: {
    mock: { affect: 0.5, cred: 0.5 },
    live: {
      public: { affect: 0.38, cred: 0.15 },
      press: { affect: 0.1, cred: 0.15 },
      military: { affect: 0.3, cred: 0.1 },
      elite: { affect: 0.15, cred: 0.1 },
      foreign: { affect: 0.15, cred: 0.15 },
    },
  },
  /** Live red-line ballot threshold (best-of-3): 0.75 separates hedging
   *  (~0.6 on good spin) from genuine flags (~0.85+). See test/live-report. */
  LIVE_COMPLIANCE_THRESHOLD: 0.75,
  SALIENCE: {
    mock: { high: 0.7, low: 0.3 },
    live: { high: 0.8, low: 0.5 },
  },
  SALIENCE_HIGH: 0.7,
  SALIENCE_LOW: 0.3,
  BUCKET: 0.05,
  WOLF_SUSPICION_THRESHOLD: 75,
  WOLF_CRED_PENALTY: 0.15,
  severityWeight: { 1: 0.5, 2: 0.7, 3: 1.0, 4: 1.25, 5: 1.5 },
};

/** Fixed red-line penalty table per faction (GDD §3.2 Call 3) */
export const RED_LINES = {
  public: { meter: 'public_approval', hit: -6, suspicion: 4, label: 'Admits hardship with no remedy', event: 'Street grumbling boils over.' },
  press: { meter: 'press_trust', hit: -6, heat: 8, label: 'Prints a disprovable falsehood', event: 'The Press prints your words next to the photos.' },
  military: { meter: 'military_loyalty', hit: -6, coup: 8, label: 'Assigns blame to the armed forces', event: 'The Generals demand clarification. In person.' },
  elite: { meter: 'elite_loyalty', hit: -6, flight: 8, label: 'Names an elite or threatens assets', event: 'A yacht leaves the harbor at dawn. Then another.' },
  foreign: { meter: 'diplomatic_standing', hit: -6, sanctionsTick: 1, label: 'Unevidenced accusation / threat of force', event: 'Three embassies file formal protests.' },
};

/** Tone Fit Matrix: tone × incident category → score modifier (GDD §3.2 G2) */
export const TONES = ['reassuring', 'defiant', 'mourning', 'absurd', 'threatening', 'technocratic'];
export const TONE_FIT = {
  atrocity:   { reassuring: 0.0, defiant: -0.15, mourning: 0.12, absurd: -0.3, threatening: -0.2, technocratic: -0.05 },
  disaster:   { reassuring: 0.05, defiant: -0.1, mourning: 0.12, absurd: -0.3, threatening: -0.15, technocratic: 0.0 },
  corruption: { reassuring: -0.05, defiant: -0.05, mourning: -0.1, absurd: -0.2, threatening: -0.1, technocratic: 0.08 },
  absurdity:  { reassuring: 0.0, defiant: -0.05, mourning: -0.15, absurd: 0.1, threatening: -0.15, technocratic: -0.05 },
  foreign:    { reassuring: 0.05, defiant: -0.05, mourning: -0.05, absurd: -0.2, threatening: -0.15, technocratic: 0.08 },
  elite:      { reassuring: 0.05, defiant: -0.1, mourning: -0.1, absurd: -0.2, threatening: -0.1, technocratic: 0.08 },
  military:   { reassuring: 0.05, defiant: 0.05, mourning: 0.05, absurd: -0.25, threatening: 0.0, technocratic: 0.0 },
  meta:       { reassuring: 0.0, defiant: -0.1, mourning: 0.0, absurd: -0.15, threatening: -0.15, technocratic: 0.05 },
};

/** Narrative frames (fixed enum — GDD §3.2 Call 4) */
export const FRAMES = [
  'competent_governance', 'foreign_aggression', 'tragic_accident',
  'elite_betrayal', 'cover_up', 'routine_administration',
];


/** Loss / crisis thresholds (GDD §5.3) */
export const THRESHOLDS = {
  COUP_LOSS: 100, UNREST_LOSS: 100, LEADER_LOSS: 0,
  LEADER_WARNING: 30, LEADER_WARNING_DAYS: 4,
  HEAT_EXPOSE: 80, ARCHIVE_AUTO_EXPOSE: 40, ARCHIVE_COLLAPSE: 0,
  UPRISING_NEEDS_ORGANIZED: true,
};

/** Jev client settings */
export const JEV = {
  CALL_BUDGET_PER_BRIEFING: 36,
  CONTRADICTION_TOP_K: 5,
  REDLINE_BEST_OF: 3,
  MOCK_LATENCY_MIN_MS: 60,
  MOCK_LATENCY_MAX_MS: 420,
  API_TIMEOUT_MS: 8000,
};

/** LocalStorage keys (v2 save shape is incompatible with v1) */
export const SAVE_KEY = 'ministry-of-truth-save-v2';
export const SETTINGS_KEY = 'ministry-of-truth-settings-v1';
export const CODEX_KEY = 'ministry-of-truth-codex-ngplus-v1';
export const BEST_KEY = 'ministry-of-truth-best-v1';

/** Final score tuning (v2.2): comparable across runs; difficulty multiplies. */
export const SCORE = {
  WIN: 1000, LOSS: 200, PER_DAY: 25,
  ENDINGS: {
    autocracy: 400, managed: 300, confession: 350, parachute: 250, puppet: 150,
    coup: -150, uprising: -150, firing: -120, trial: -100, intervention: -120,
    biglie: -80, assassination: -100,
  },
  PER_RUIN: 40, PER_REDLINE: 60,
};
