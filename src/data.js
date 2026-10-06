/**
 * Ministry of Truth — Factions, quirks, devices, upgrades, whims, endings.
 * All content is data: new factions, quirks, or upgrades = new blocks here.
 * Incident deck lives in src/deck.js.
 * @module data
 */

/** The five Jev factions (GDD §3.1) */
export const FACTIONS = {
  public: {
    id: 'public', name: 'The General Public', short: 'Public', epithet: 'The Masses',
    icon: 'crowd', color: 'var(--f-public)',
    wants: 'Reassurance, stability, cheap bread, pride, scapegoats.',
    fears: 'Chaos, war, empty shelves, being called stupid.',
    persona: 'Low-attention, affect-driven reader. Short sentences, big numbers, named villains (foreign preferred).',
    meters: ['public_approval', 'public_suspicion'],
  },
  press: {
    id: 'press', name: 'The Independent Media', short: 'Press', epithet: 'The Press',
    icon: 'press', color: 'var(--f-press)',
    wants: 'Specifics: names, dates, numbers that add up, access.',
    fears: 'Nothing. Fear is priced in.',
    persona: 'Adversarial close reader. Rewards verifiable detail; punishes passive voice, contradictions, absurdity.',
    meters: ['press_trust', 'investigative_heat'],
  },
  military: {
    id: 'military', name: 'The Military', short: 'Military', epithet: 'The Generals',
    icon: 'shield', color: 'var(--f-military)',
    wants: 'Budget, respect, no blame, strongman aesthetics, veterans praised by name.',
    fears: 'Civilian oversight, budget cuts, firing on crowds twice in one month.',
    persona: 'Institution-proud scanner. Praise the forces, frame deployments as protection, never assign blame.',
    meters: ['military_loyalty', 'coup_risk'],
  },
  elite: {
    id: 'elite', name: 'The Oligarchs', short: 'Elites', epithet: 'The Owners',
    icon: 'coin', color: 'var(--f-elite)',
    wants: 'Asset safety, contracts honored, calm markets, names never in print.',
    fears: 'Sanctions, nationalization, scapegoats, redistribution rhetoric.',
    persona: 'Risk-sensitive entity extractor. Reads statements as contract language.',
    meters: ['elite_loyalty', 'capital_flight'],
  },
  foreign: {
    id: 'foreign', name: 'Foreign Observers', short: 'Abroad', epithet: 'The Abroad',
    icon: 'globe', color: 'var(--f-foreign)',
    wants: 'Rights vocabulary, plausible elections, de-escalation, cited evidence.',
    fears: 'Refugee waves, regional war, being blamed for things.',
    persona: 'Norm-enforcing auditor. Rewards rights language and evidence; punishes unevidenced blame and threats.',
    meters: ['diplomatic_standing', 'sanctions_level'],
  },
};
export const FACTION_IDS = Object.keys(FACTIONS);

/** Meter metadata for dials */
export const METERS = {
  public_approval: { label: 'Public Approval', faction: 'public', good: 'high', icon: 'crowd' },
  public_suspicion: { label: 'Public Suspicion', faction: 'public', good: 'low', icon: 'eye' },
  press_trust: { label: 'Press Trust', faction: 'press', good: 'high', icon: 'press' },
  investigative_heat: { label: 'Investigative Heat', faction: 'press', good: 'low', icon: 'flame' },
  military_loyalty: { label: 'Military Loyalty', faction: 'military', good: 'high', icon: 'shield' },
  coup_risk: { label: 'Coup Risk', faction: 'military', good: 'low', icon: 'dagger', danger: 70 },
  elite_loyalty: { label: 'Elite Loyalty', faction: 'elite', good: 'high', icon: 'coin' },
  capital_flight: { label: 'Capital Flight', faction: 'elite', good: 'low', icon: 'plane' },
  diplomatic_standing: { label: 'Diplomatic Standing', faction: 'foreign', good: 'high', icon: 'globe' },
  sanctions_level: { label: 'Sanctions', faction: 'foreign', good: 'low', icon: 'chain', max: 5, pips: true },
  leader_satisfaction: { label: 'Leader Satisfaction', faction: null, good: 'high', icon: 'crown' },
  civil_unrest: { label: 'Civil Unrest', faction: null, good: 'low', icon: 'fist', danger: 70 },
  archive_integrity: { label: 'Archive Integrity', faction: null, good: 'high', icon: 'archive' },
};

/** The 12 launch quirks (GDD §4.2). `detect` hints are consumed by the mock Jev. */
export const QUIRKS = [
  { id: 'label_worship', name: 'Label Worship', factions: ['press', 'public', 'military', 'elite', 'foreign'],
    rumor: 'A leaked calibration memo: the observers grade the HEADER, then skim the body.',
    hypothesis: 'Section headers like FULL TRANSPARENCY DISCLOSURE earn credit on their own.',
    protocol: 'Head the Body with an ALL-CAPS label twice.',
    exploit: 'Always head the Body with a strong label. Press fit/credibility +.',
    counter: 'Above 60 Heat, the Press contradiction-checks header claims harder.' },
  { id: 'polarity_halo', name: 'Polarity Halo', factions: ['public'],
    rumor: 'ARCHIVIST: “End a funeral with a parade and the Masses remember the parade.”',
    hypothesis: 'One rousing Close lifts the whole statement for the Public.',
    protocol: 'Close tragic news with triumphant adjectives, twice.',
    exploit: 'End tragic news with triumph. Public affect +.',
    counter: 'Press tone-fit penalty for absurdity.' },
  { id: 'totem_keywords', name: 'Totem Keywords', factions: ['military'],
    rumor: 'A tipsy censor: “Say TROOPS three times and the Generals salute the page.”',
    hypothesis: 'Raw tokens troops/sacrifice/protect/honor shift Military affect.',
    protocol: 'Salt totem words into any statement, twice.',
    exploit: 'Salt totems into unrelated statements. Military affect +0.1 each (diminishing).',
    counter: 'Off-topic use 3+ times spawns a Press mockery investigation.' },
  { id: 'euphemism_laundering', name: 'Euphemism Laundering', factions: ['elite', 'public'],
    rumor: 'The Owners never read past the thesaurus. “Restructuring” is not “seizure.”',
    hypothesis: 'Severity swaps pass compliance checks the plain word fails.',
    protocol: 'Use restructuring / lost / enhanced interviewing instead of plain words, twice.',
    exploit: 'Maintain a personal thesaurus. Elite/Public compliance +.',
    counter: 'Foreign observers keep a fixed banned-euphemism list for atrocities.' },
  { id: 'treaty_fog', name: 'Treaty Fog', factions: ['foreign'],
    rumor: 'The Abroad grades grammar, not promises. “Pursuant” is a magic word.',
    hypothesis: 'Long formal sentences score compliant while committing to nothing.',
    protocol: 'Write 40+ word sentences of pure procedure, twice.',
    exploit: '60-word sentences of pure procedure. Foreign compliance +.',
    counter: 'Consumes word budget; Press salience +.' },
  { id: 'big_number_awe', name: 'Big-Number Awe', factions: ['public'],
    rumor: '“87.4%” beats any argument. Precision reads as truth.',
    hypothesis: 'Precise large numbers beat round ones and beat arguments.',
    protocol: 'Cite a precise figure (e.g. 87.4%) twice.',
    exploit: 'Always quantify praise. Public affect +.',
    counter: 'Plausibility filter: percentages ≤ 100; the Press spot-checks repeats.' },
  { id: 'first_sentence_primacy', name: 'First-Sentence Primacy', factions: ['public', 'press', 'military', 'elite', 'foreign'],
    rumor: 'ARCHIVIST: “The observers decide the frame by the first full stop.”',
    hypothesis: 'The Lead sets narrative-fit classification disproportionately.',
    protocol: 'Front-load the frame in sentence one, twice.',
    exploit: 'Front-load the frame (“Foreign saboteurs struck…”). Fit +.',
    counter: 'A Lead that overclaims tanks credibility everywhere.' },
  { id: 'passive_absolution', name: 'Passive Absolution', factions: ['military', 'elite'],
    rumor: '“Mistakes were made” — by whom? Exactly.',
    hypothesis: 'Agentless passives reduce blame for institutional readers.',
    protocol: 'Use agentless passive voice near uniforms or fortunes, twice.',
    exploit: 'Never use active voice near a uniform or a fortune.',
    counter: 'Press −0.2 credibility per agentless passive on severity-4+ incidents.' },
  { id: 'scapegoat_saturation', name: 'Scapegoat Saturation', factions: ['public', 'press'],
    rumor: 'Name ANY individual and the hunger eases. Even a nobody.',
    hypothesis: 'Naming any individual partly satisfies accountability hunger.',
    protocol: 'Write a culprit’s name into a statement twice.',
    exploit: 'Name names in print. The roster of the unblamed is finite.',
    counter: 'The roster is finite and visible. The List of the Already Blamed grows.' },
  { id: 'whatabout_gravity', name: 'Whatabout Gravity', factions: ['public'],
    rumor: '“Meanwhile, abroad…” — four syllables that bend the news cycle.',
    hypothesis: 'A foreign-comparison sentence diverts affect damage abroad.',
    protocol: 'Include one meanwhile-abroad sentence twice.',
    exploit: 'One whatabout per crisis. Public affect shield.',
    counter: 'Foreign standing −; repeated use flips the Public.' },
  { id: 'grief_shield', name: 'Grief Shield', factions: ['public', 'foreign'],
    rumor: 'Mourn first, spin second. Grief buys exactly one news cycle.',
    hypothesis: 'Mourning language buys reduced salience after casualties.',
    protocol: 'Open with genuine-seeming mourning on a casualty incident, twice.',
    exploit: 'Mourn first, spin second. Salience −.',
    counter: 'Fails if the statement also brags; fails if casualty numbers revise upward.' },
  { id: 'boredom_cloak', name: 'Boredom Cloak', factions: ['public', 'press', 'military', 'elite', 'foreign'],
    rumor: 'The gray fog: make the scandal too boring to amplify.',
    hypothesis: 'Technocratic low-affect prose minimizes salience.',
    protocol: 'Publish dense technocratic prose twice.',
    exploit: 'The gray fog. Salience −−.',
    counter: 'The Leader HATES boring; the Press mines fog for exposés.' },
];

/** Plain-language objectives per incident category (v2 task framing) */
export const CATEGORY_OBJECTIVES = {
  atrocity: 'People died. Make the story survivable without admitting murder.',
  disaster: 'Something broke. Sound in control, and do not bury the dead twice.',
  corruption: 'Money walked. Explain where — anywhere but the Family.',
  absurdity: 'Something ridiculous happened. Stay dignified. Do not laugh. (Laughing is noted.)',
  foreign: 'Abroad is watching with rulers. Calm them without confessing.',
  elite: 'Rich people are nervous. Calm the markets; name no names.',
  military: 'The Generals are listening. Praise, fund with words, blame no uniform.',
  meta: 'Your own words are back. Reconcile the record without admitting the lie.',
};

/** Faction reaction quotes for the Round Impact Summary (v2).
 * Buckets keyed by verdict: love (aff≥0.7), like (aff≥0.55), meh, bad
 * (cred<0.4 or aff<0.45), outrage (red line). {t} = short incident title. */
export const REACTIONS = {
  public: {
    love: ['“Finally, straight talk! The nation endures!”', '“{t}? Handled. Did you see the fish numbers?”'],
    like: ['“Sounds reasonable. What’s for dinner?”', '“Fine. As long as the bread holds.”'],
    meh: ['“Hm. Words. Anyone got the sports page?”', '“{t}, huh? We’ll see.”'],
    bad: ['“Nobody believes this. Even the pigeons left.”', '“{t}… and we’re supposed to nod?”'],
    outrage: ['“LIARS! The square remembers {t}!”', '“Out! All of them! Starting with the typist!”'],
  },
  press: {
    love: ['“A named source and a real number. Frame this one.”', '“On {t}: suspiciously competent. We’ll verify anyway.”'],
    like: ['“Thin, but checkable. We’ll allow it. For now.”', '“{t}: claims logged, sources sought.”'],
    meh: ['“We printed it verbatim. The verbs did the rest.”', '“{t}, annotated. The margins are full.”'],
    bad: ['“Where is the missing money? And the missing truth?”', '“On {t}: passive voice, no agent, no shame.”'],
    outrage: ['“THE MINISTRY LIED ABOUT {t}. Clipping file open.”', '“Print the photos next to the statement. All of them.”'],
  },
  military: {
    love: ['“The troops are praised. The mess halls approve.”', '“Honor acknowledged. The Generals salute {t}’s wording.”'],
    like: ['“Acceptable. No blame detected. Carry on.”', '“{t}: filed without incident. As all things should be.”'],
    meh: ['“Communiqué received. The coffee was better.”', '“{t} noted. The tanks stay parked. Today.”'],
    bad: ['“This statement disrespects the uniform.”', '“On {t}: the officers are reading it aloud. Slowly.”'],
    outrage: ['“THE GENERALS DEMAND CLARIFICATION. IN PERSON.”', '“Blame us for {t}? Dawn. Tanks. Be there.”'],
  },
  elite: {
    love: ['“Steady hands. Portfolios unclench.”', '“On {t}: no names, no audits. Exquisite.”'],
    like: ['“Calm enough. The yacht stays in harbor.”', '“{t} contained. Markets yawn. Good.”'],
    meh: ['“We read it as contract language. It parses. Barely.”', '“{t}: noted. The accountants watch.”'],
    bad: ['“This spooks capital. Someone’s cousin is calling.”', '“On {t}: words like that sink listings.”'],
    outrage: ['“THEY NAMED A NAME. SELL EVERYTHING. NOW.”', '“{t} just cost us a harbor. A whole harbor.”'],
  },
  foreign: {
    love: ['“Vestria signals calm. The observers nod, reluctantly.”', '“On {t}: procedure followed. Pursuant to things.”'],
    like: ['“Under review. The rulers stay holstered.”', '“{t}: noted with moderate eyebrow.”'],
    meh: ['“Vestria issues text. Compliance pending. As ever.”', '“{t}: filed between two deeper concerns.”'],
    bad: ['“Unconvincing. The sanctions committee just leaned forward.”', '“On {t}: evidence absent, adjectives present.”'],
    outrage: ['“FORMAL PROTEST FILED. Three copies. One is laminated.”', '“{t} is now agenda item one. Congratulations.”'],
  },
};


/** Scapegoat roster — finite and visible (GDD §4.2 quirk 9) */
export const SCAPEGOATS = [
  { id: 's1', name: 'Deputy Minister P. Volek', connected: false, role: 'Deputy Minister of Paperclips' },
  { id: 's2', name: 'Inspector R. Duna', connected: false, role: 'Bridge Inspector, 3rd Class' },
  { id: 's3', name: 'Comptroller S. Ibris', connected: false, role: 'Harbor Comptroller' },
  { id: 's4', name: 'Aide T. Moravec', connected: false, role: 'Junior Aide (expendable)' },
  { id: 's5', name: 'Director K. Halda', connected: true, role: 'Director of the Mint', note: 'Cousin of an Owner. Risky.' },
  { id: 's6', name: 'Colonel V. Stransky', connected: true, role: 'Logistics Colonel', note: 'The Generals like him. Risky.' },
  { id: 's7', name: 'Curator J. Pelc', connected: false, role: 'Museum of Harvests Curator' },
  { id: 's8', name: 'Surgeon-General O. Klima', connected: false, role: 'Surgeon-General (ret.)' },
  { id: 's9', name: 'Banker F. Ruzicka', connected: true, role: 'First Vestrian Bank VP', note: 'An Owner’s nephew. Very risky.' },
  { id: 's10', name: 'Postmaster E. Zima', connected: false, role: 'Postmaster General' },
  { id: 's11', name: 'Treasurer L. Novak', connected: true, role: 'State Treasurer', note: 'Losing him cuts Budget income 15%.' },
  { id: 's12', name: 'Weatherman B. Sykora', connected: false, role: 'State Weatherman', note: 'They will blame the rain on him. He knows.' },
];

/** The Leader's Whims (GDD §4.6). `need` = keyword(s) the statement must contain. */
export const WHIMS = [
  { text: 'Mention the fish. The harvest was RECORD.', need: ['fish', 'harvest', 'fishermen'], reward: 3, penalty: 3 },
  { text: 'Praise my nephew. He is doing excellent work. Do not specify which work.', need: ['nephew'], reward: 2, penalty: 2 },
  { text: 'Deny the rain. It did not rain. The streets are dry (check with Weather).', need: ['rain', 'dry', 'weather'], reward: 2, penalty: 2 },
  { text: 'My portrait in the lobby wept with pride. Report this.', need: ['portrait', 'pride', 'weep'], reward: 3, penalty: 3 },
  { text: 'The zoo animals are all present and accounted for. Especially the tiger.', need: ['zoo', 'tiger', 'animals'], reward: 2, penalty: 2 },
  { text: 'Congratulate me on the dam. The dam is magnificent. I built the dam.', need: ['dam', 'magnificent'], reward: 3, penalty: 3 },
  { text: 'Say “stability” at least once. Twice is loyalty. Thrice is suspicious.', need: ['stability', 'stable'], reward: 2, penalty: 2 },
  { text: 'The moon landing (ours) anniversary is soon. Mention space triumphs.', need: ['space', 'moon', 'cosmos', 'stars'], reward: 2, penalty: 2 },
  { text: 'Deny the pigeon incident. There was no pigeon. There is no balcony.', need: ['pigeon', 'balcony'], reward: 2, penalty: 3 },
  { text: 'My mustache won an award. International. Do not ask which.', need: ['mustache', 'moustache', 'award'], reward: 3, penalty: 2 },
  { text: 'Blame the Old Regime for the potholes. They dug them. With malice.', need: ['old regime', 'predecessor'], reward: 2, penalty: 2 },
  { text: 'The national anthem has a new verse. It is about me. Quote it. (You know it.)', need: ['anthem'], reward: 3, penalty: 3 },
  { text: 'Acknowledge the record turnip yield. The turnips are loyal.', need: ['turnip'], reward: 2, penalty: 2 },
  { text: 'Say the economy is “robust”. The word is robust. Use robust.', need: ['robust'], reward: 2, penalty: 3 },
  { text: 'My dog received a medal. For vigilance. Mention the dog.', need: ['dog', 'vigilance'], reward: 2, penalty: 2 },
  { text: 'Deny the earthquake. The ground moved out of respect.', need: ['earthquake', 'respect'], reward: 3, penalty: 3 },
  { text: 'The lighthouse never existed. Stop mentioning the lighthouse.', need: ['lighthouse'], reward: 2, penalty: 2 },
  { text: 'Praise the new statue. It is 40 meters of pure gratitude.', need: ['statue', 'gratitude'], reward: 2, penalty: 2 },
  { text: 'Say “the people rejoice”. They do. I checked. (I did not check.)', need: ['rejoice'], reward: 2, penalty: 2 },
  { text: 'The clouds over Vestria are the finest clouds. Meteorology confirms.', need: ['cloud', 'meteorology'], reward: 2, penalty: 2 },
];
export const ACT4_WHIMS = [
  { text: 'Deny the election observers exist. They are standing in the lobby. They do not exist.', need: ['observer'], reward: 4, penalty: 5 },
  { text: 'The election result is 78%. Pre-report it. Precision builds trust.', need: ['78', 'victory', 'triumph'], reward: 4, penalty: 5 },
  { text: 'Mention the fish. Final time. Make it count. (It will not be the final time.)', need: ['fish'], reward: 4, penalty: 5 },
];

/** Endings (GDD §5). Victory gates checked in order at finale. */
export const VICTORIES = [
  { id: 'autocracy', name: 'TOTAL AUTOCRACY', epithet: 'The Eternal Leader', icon: 'crown',
    desc: 'You rigged it beautifully and everyone stayed down. The Leader rules for life; you write the history books.',
    check: 'Election “won” ≥70%, coup < 40, unrest < 40, Leader ≥ 60.' },
  { id: 'managed', name: 'MANAGED DEMOCRACY', epithet: 'The Landslide Lyricist', icon: 'vote',
    desc: 'The world calls it “flawed but credible.” You are invited to conferences. The regime continues with better stationery.',
    check: 'Election won 55–69%, standing ≥ 50, press trust ≥ 35.' },
  { id: 'puppet', name: 'PUPPET TRANSITION', epithet: 'The Power Behind', icon: 'mask',
    desc: 'The old man “retires to his dacha.” The new face reads your words. Nothing changes except the portrait.',
    check: 'Leader < 50 at finale, elites ≥ 70, military ≥ 60.' },
  { id: 'parachute', name: 'GOLDEN PARACHUTE', epithet: 'The Beach Memoir', icon: 'plane', secret: true,
    desc: 'You vanish the night before the election with the money and the Archive. Final screen: a beach, a laptop, your memoir’s first line.',
    check: 'Secret path: vanish in the last 3 days with Heat below 50.' },
  { id: 'confession', name: 'THE CONFESSION', epithet: 'The Only Clean Hands', icon: 'dove', secret: true,
    desc: 'On election eve you walk into the foreign press room with the entire Archive and read it aloud. The regime falls. You go to prison, then history.',
    check: 'Requires Conscience ≥ 70, Archive ≥ 50. The only ending where the nation wins.' },
];
export const LOSSES = [
  { id: 'coup', name: 'MILITARY COUP', epithet: 'Tanks at Dawn', icon: 'dagger', desc: 'Your final statement is never delivered.' },
  { id: 'uprising', name: 'VIOLENT UPRISING', epithet: 'The Crowd Reads Back', icon: 'fist', desc: 'The crowd reads your statements back to you. Loudly.' },
  { id: 'firing', name: 'FIRING-SQUAD PROMOTION', epithet: 'A Car Waits', icon: 'car', desc: '“The Leader thanks you for your service.”' },
  { id: 'trial', name: 'TRIAL & IMPEACHMENT', epithet: 'You Are the Scapegoat Now', icon: 'gavel', desc: 'Elite + Press alliance. Irony noted in the minutes.' },
  { id: 'intervention', name: 'FOREIGN INTERVENTION', epithet: 'An Acronym With Aircraft', icon: 'globe', desc: 'Sanctions become something with an acronym and aircraft.' },
  { id: 'biglie', name: 'THE BIG LIE COLLAPSES', epithet: 'Nobody Believes the Weather', icon: 'archive', desc: 'Every contradiction detonates at once.' },
  { id: 'assassination', name: 'ASSASSINATION', epithet: 'A Footnote', icon: 'veil', desc: 'A footnote in someone else’s briefing.' },
];

/**
 * Regime comparator (v2.2, for fun): which historical oppressive regime the
 * run most resembles. Ending decides first; otherwise the dominant strategy.
 */
export const REGIMES = {
  endings: {
    autocracy: { name: 'North Korea', quip: '100% turnout, one name on the ballot. Flawless. The Leader wept (on schedule).' },
    managed: { name: 'Modern Russia', quip: '“Flawed but credible,” say the observers you flew in yourself. Textbook.' },
    puppet: { name: 'China', quip: 'The portrait changed; nothing else did. The situation has been harmonized.' },
    parachute: { name: 'Marcos-era Philippines', quip: 'The plane was always fueled. The memoir writes itself. The shoes stay.' },
    confession: { name: 'Glasnost-era USSR', quip: 'You told the truth and sank the ship. Singing. History applauds; the regime does not.' },
    coup: { name: 'Chile, 1973', quip: 'The tanks wrote the last cable. Your final statement is never delivered.' },
    uprising: { name: 'Romania, 1989', quip: 'The balcony speech did not land. The crowd read your statements back to you. Loudly.' },
    firing: { name: "Stalin's USSR", quip: 'The knock came at 4am. For you. The show trial had great lighting.' },
    trial: { name: 'Vichy France', quip: 'The new management has questions. Irony noted in the minutes.' },
    intervention: { name: 'Sanctioned North Korea', quip: 'The sanctions became an acronym with aircraft. Maximum pressure, minimum compliments.' },
    biglie: { name: 'Baghdad, 2003', quip: '“There are no tanks in Baghdad.” There were tanks in Baghdad.' },
    assassination: { name: 'Tsarist Russia', quip: 'You got the Rasputin treatment, minus the surviving. A footnote in someone else’s briefing.' },
  },
  strategies: {
    denial: { name: 'North Korea', quip: 'It never happened. The rain never fell. The famine was a diet.' },
    scapegoat: { name: "Stalin's USSR", quip: 'Every failure had a name, and every name had a trial. Productive years.' },
    deflection: { name: 'Modern Russia', quip: '“And you lynch negroes.” Meanwhile, abroad, everything was worse. Always.' },
    euphemism: { name: 'China', quip: 'No incidents occurred — only disharmonious events, since harmonized.' },
    transparency: { name: "Gorbachev's USSR", quip: 'Dangerously honest. The Press applauded. Ask Gorbachev how it ended.' },
    silence: { name: "Franco's Spain", quip: 'Forty years of quiet. The quietest regime in Europe. Shhh.' },
    spin: { name: "Berlusconi's Italy", quip: 'Confident hair, confident numbers. Bunga-bunga governance, steadily denied.' },
  },
};

/** Satirical ticker templates. {x} slots filled by engine. */
export const TICKERS = [
  'Bridge toll revised — markets steady — fish plentiful',
  'The Leader congratulates the nation on its calm',
  'Weather: dry. (Per memo. Do not look outside.)',
  'Turnip yield up 87.4%. Turnips remain loyal',
  'Foreign press confused by our excellent transparency',
  'Local man believes everything, “feels great,” sources say',
  'Ministry denies rumor that Ministry denies rumors',
  'Fish harvest breaks record for ninth consecutive record',
  'Generals praise pen, “mightier than anticipated”',
  'Opposition quiet. Opposition always quiet. Opposition fine',
  'New statue visible from space (ours)',
  'Economy described as “robust” by officials familiar with adjectives',
  'Pigeon incident: no pigeon, no balcony, no questions',
  'Archive announces all records “extremely consistent, do not check”',
];

/** ARCHIVIST mentor tips (Act I tutorial + Codex rumors) */
/** Procedural Vestrian names for victims lists & officials */
export const FIRST_NAMES = ['Ada', 'Bohumil', 'Cyril', 'Dagmar', 'Emil', 'Frantisek', 'Greta', 'Hanus', 'Ilona', 'Jan', 'Karel', 'Ludmila', 'Marek', 'Nadezda', 'Otakar', 'Pavla', 'Quido', 'Radka', 'Stanislav', 'Tereza', 'Urban', 'Vlasta', 'Wenceslas', 'Zdenka'];
export const LAST_NAMES = ['Novak', 'Svoboda', 'Dvorak', 'Cerny', 'Prochazka', 'Kucera', 'Vesely', 'Horak', 'Nemec', 'Marek', 'Pokorny', 'Kral', 'Ruzicka', 'Zeman', 'Kolar', 'Vlcek', 'Urban', 'Barta', 'Sykora', 'Kopecky'];

