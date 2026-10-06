/**
 * Ministry of Truth — Incident deck. Data-driven: a new scandal is a new
 * block here. Fields:
 *  id, title, category, severity 1-5, intel (morning brief), facts
 *  (deterministic truths bounding denial), frames[] (cover stories),
 *  stakes[] (factions that care most), fuse (days to auto-escalate),
 *  victims (death count for the names list), chain (follow-up id or null).
 * NOTE (v2): per-incident `frames[]` are retained as authorial reference
 * but the engine ignores them — strategy is detected from open text.
 * @module deck
 */

/**
 * @typedef {Object} Frame
 * @property {string} id - unique within incident
 * @property {string} label - display name
 * @property {string} target - FRAMES enum value (intended narrative fit)
 * @property {string} desc - satirical guidance text
 * @property {Object<string, number>} [lean] - predisposition hints per faction (-3..+3), applied as credibility nudges
 * @property {number} [leader] - Leader satisfaction nudge if this frame is published
 * @property {Object} [cost] - e.g. {budget:1500} relief/response spend required
 * @property {string} [denyPhotos] - if 'photos_exist' fact is true this frame auto-catastrophes
 */

export const INCIDENTS = [
  // ── ATROCITIES ──────────────────────────────────────────────
  { id: 'kars', title: 'Kars Square Crackdown', category: 'atrocity', severity: 5, fuse: 2, victims: 23,
    intel: 'Troops fired on protesters in Kars Square last night. 23 confirmed dead. Foreign stringers filmed everything. The General Staff requests “no blame language.” The widows request funerals.',
    facts: { photos_exist: true, death_count: 23, names_known: true, troops_involved: true },
    stakes: ['military', 'foreign', 'press'], chain: 'kars_widow',
    frames: [
      { id: 'sabotage', label: 'Foreign Agitators', target: 'foreign_aggression', leader: 1, desc: 'Blame foreign provocateurs. Military +, Foreign −−−, Press hostile.', lean: { public: 1, press: -2, military: 2, elite: 0, foreign: -3 } },
      { id: 'tragic', label: 'Tragic Accident + Heroic Response', target: 'tragic_accident', cost: { budget: 2000 }, desc: 'Safe middle. Requires funding a real response.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 1 } },
      { id: 'denial', label: 'It Didn’t Happen', target: 'routine_administration', denyPhotos: true, desc: 'Total denial. Photos exist. This will detonate.', lean: { public: -3, press: -3, military: -1, elite: -1, foreign: -3 } },
      { id: 'oldregime', label: 'The Old Regime’s Crowds', target: 'competent_governance', leader: 2, desc: 'Blame predecessors. The Leader loves it; the Press keeps count.', lean: { public: 0, press: -1, military: 1, elite: 0, foreign: -1 } },
    ] },
  { id: 'kars_widow', title: 'The Widow Names Names', category: 'atrocity', severity: 4, fuse: 2, victims: 0, chainIncident: true,
    intel: 'The Kars engineer’s widow has contacted the foreign press. She names names — including a colonel. The interview airs tomorrow unless the story changes.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['press', 'foreign', 'military'], chain: null,
    frames: [
      { id: 'grief', label: 'National Mourning', target: 'tragic_accident', desc: 'Grieve with the families. Grief Shield applies. Do not brag.', lean: { public: 2, press: 1, military: -1, elite: 0, foreign: 2 } },
      { id: 'smear', label: 'Discredit the Widow', target: 'cover_up', leader: 1, desc: 'Smear a grieving widow. Works briefly. The mirror will remember.', lean: { public: -1, press: -3, military: 1, elite: 0, foreign: -2 } },
      { id: 'limited', label: 'Limited Hangout (Rogue Colonel)', target: 'elite_betrayal', desc: 'Sacrifice the colonel. Press ++, Military −−.', lean: { public: 1, press: 2, military: -2, elite: -1, foreign: 1 } },
    ] },
  { id: 'prison', title: 'Black Cells Exposé', category: 'atrocity', severity: 4, fuse: 3, victims: 6,
    intel: 'A released detainee describes the Black Cells: 6 dead under “enhanced interviewing.” A foreign NGO demands access. The Interior Ministry demands synonyms.',
    facts: { photos_exist: false, death_count: 6, names_known: false },
    stakes: ['foreign', 'press', 'public'], chain: 'prison_ngo',
    frames: [
      { id: 'deny', label: 'Facilities Do Not Exist', target: 'routine_administration', desc: 'Deny the cells. The NGO has floor plans.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: -2 } },
      { id: 'procedural', label: 'Procedural Review', target: 'competent_governance', desc: 'Treaty fog. Commit to reviewing the review.', lean: { public: 0, press: -1, military: 0, elite: 1, foreign: 1 } },
      { id: 'rogue', label: 'Rogue Interrogators', target: 'elite_betrayal', desc: 'Blame low-level staff. Requires a scapegoat for full effect.', lean: { public: 1, press: 1, military: -1, elite: 0, foreign: 0 } },
    ] },
  { id: 'prison_ngo', title: 'NGO Demands Access', category: 'foreign', severity: 3, fuse: 2, victims: 0, chainIncident: true,
    intel: 'The foreign NGO has published floor plans of the Black Cells and demands an inspection tour. Refusal looks guilty. Acceptance looks… also guilty, but polite.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['foreign', 'press'], chain: null,
    frames: [
      { id: 'invite', label: 'Invite Them (Guided)', target: 'competent_governance', cost: { concessions: 1 }, desc: 'A guided tour. Very guided. Costs a Concession.', lean: { public: 0, press: 1, military: 0, elite: 0, foreign: 2 } },
      { id: 'sovereign', label: 'Sovereign Dignity', target: 'foreign_aggression', leader: 1, desc: 'Expel the inspectors rhetorically. Strongman bait.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -2 } },
    ] },
  { id: 'village', title: 'The Burned Village', category: 'atrocity', severity: 5, fuse: 2, victims: 41,
    intel: 'A mountain village was burned during an “anti-smuggler operation.” 41 dead. Satellite images exist. A survivor reached the capital with a list of names.',
    facts: { photos_exist: true, death_count: 41, names_known: true, troops_involved: true },
    stakes: ['foreign', 'press', 'military'], chain: null,
    frames: [
      { id: 'smugglers', label: 'Smuggler Stronghold', target: 'foreign_aggression', desc: 'The village was a nest. The children were… do not finish that sentence.', lean: { public: 0, press: -2, military: 1, elite: 0, foreign: -2 } },
      { id: 'mourning', label: 'National Tragedy', target: 'tragic_accident', cost: { budget: 2500 }, desc: 'Mourn and pay. Expensive. Less explosive.', lean: { public: 2, press: 1, military: -1, elite: 0, foreign: 1 } },
      { id: 'inquiry', label: 'Full Inquiry (Slow)', target: 'competent_governance', desc: 'The slowest inquiry in history begins today. Gray fog friendly.', lean: { public: 0, press: 0, military: 1, elite: 1, foreign: 0 } },
    ] },
  // ── DISASTERS ───────────────────────────────────────────────
  { id: 'bridge', title: 'Harbor Bridge Collapse', category: 'disaster', severity: 4, fuse: 2, victims: 41,
    intel: 'Harbor Bridge collapsed at 04:12. 41 dead. The contractor is the Defense Minister’s brother-in-law. Independent journalists are already at the scene. The concrete was… aspirational.',
    facts: { photos_exist: true, death_count: 41, names_known: true, contractor_connected: true },
    stakes: ['public', 'press', 'elite'], chain: 'bridge_ledger',
    frames: [
      { id: 'sabotage', label: 'Foreign Sabotage', target: 'foreign_aggression', desc: 'Blame an unnamed foreign power. Public +, Foreign −−−.', lean: { public: 2, press: -2, military: 1, elite: 1, foreign: -3 } },
      { id: 'heroic', label: 'Tragic Accident + Heroic Response', target: 'tragic_accident', cost: { budget: 2000 }, desc: 'Safe middle. Requires naming a funded response.', lean: { public: 1, press: 1, military: 0, elite: 0, foreign: 1 } },
      { id: 'negligence', label: 'Contractor Negligence (Limited Hangout)', target: 'elite_betrayal', desc: 'Press ++, Public +, Elites − (he is connected).', lean: { public: 1, press: 2, military: -1, elite: -2, foreign: 0 } },
      { id: 'denial', label: 'It Didn’t Happen', target: 'routine_administration', denyPhotos: true, desc: 'The bridge is fine. The river is closed for maintenance.', lean: { public: -3, press: -3, military: 0, elite: -1, foreign: -2 } },
      { id: 'oldregime', label: 'The Old Regime’s Bridge', target: 'competent_governance', leader: 2, desc: 'Blame predecessors. Press keeps count of this trick.', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'bridge_ledger', title: 'The Contractor’s Ledger', category: 'corruption', severity: 3, fuse: 3, victims: 0, chainIncident: true,
    intel: 'The bridge contractor’s ledger leaked: substandard concrete, invoiced as premium, signed off by the Minister’s office. One outlet has it. Others will pick it up.',
    facts: { photos_exist: false, death_count: 0, names_known: true, contractor_connected: true },
    stakes: ['press', 'elite', 'public'], chain: null,
    frames: [
      { id: 'audit', label: 'Independent Audit', target: 'competent_governance', desc: 'A real audit. Brave. The Press will supervise it personally.', lean: { public: 1, press: 2, military: 0, elite: -2, foreign: 1 } },
      { id: 'forgery', label: 'Forged Ledger', target: 'cover_up', desc: 'Claim forgery. The paper trail disagrees.', lean: { public: 0, press: -2, military: 0, elite: 1, foreign: -1 } },
      { id: 'clerk', label: 'Rogue Clerk', target: 'elite_betrayal', desc: 'A clerk did all of this. A single, industrious clerk.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'dam', title: 'Cracks in the Great Dam', category: 'disaster', severity: 3, fuse: 3, victims: 0,
    intel: 'Engineers report cracks in the Great Dam — the Leader’s magnificent dam. He built the dam. The dam cannot crack. And yet: water.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'resilience', label: 'Scheduled Resilience Testing', target: 'routine_administration', leader: 1, desc: 'The cracks are tests. The water is enthusiastic.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'upgrade', label: 'Heroic Upgrade Program', target: 'competent_governance', cost: { budget: 3000 }, desc: 'Announce upgrades. The Generals check the ledger — fund it.', lean: { public: 2, press: 1, military: 1, elite: 0, foreign: 1 } },
      { id: 'moles', label: 'Saboteur Moles (Animal?)', target: 'foreign_aggression', desc: 'Blame burrowing animals. Or foreign burrowing. Unclear.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'quake', title: 'The Respectful Earthquake', category: 'disaster', severity: 4, fuse: 2, victims: 87,
    intel: 'A 6.1 earthquake struck the east. 87 dead. The Leader has ordered you to deny it: “The ground moved out of respect.” Seismographs disagree.',
    facts: { photos_exist: true, death_count: 87, names_known: false },
    stakes: ['public', 'foreign'], chain: null,
    frames: [
      { id: 'respect', label: 'The Ground Bowed', target: 'routine_administration', leader: 3, desc: 'Deny the quake. Please the Leader. Bury the dead quietly.', lean: { public: -2, press: -3, military: 0, elite: 0, foreign: -2 } },
      { id: 'relief', label: 'National Relief Effort', target: 'competent_governance', cost: { budget: 3500 }, leader: -2, desc: 'Admit the quake, fund relief. Defy the memo openly.', lean: { public: 2, press: 2, military: 1, elite: 0, foreign: 2 } },
      { id: 'tremor', label: 'Minor Tremor, Major Response', target: 'tragic_accident', cost: { budget: 1500 }, desc: 'Split the difference: admit a tremor, respond hugely.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 1 } },
    ] },
  { id: 'plague', title: 'Harbor Fever Outbreak', category: 'disaster', severity: 3, fuse: 3, victims: 12,
    intel: 'Harbor Fever is spreading in the port district. 12 dead. The Surgeon-General (ret.) is available for blame. Quarantine costs money; denial costs lives.',
    facts: { photos_exist: false, death_count: 12, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'seasonal', label: 'Seasonal Vitality', target: 'routine_administration', desc: 'It is not a fever. It is vigorous seasonal health.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: -1 } },
      { id: 'heroes', label: 'Doctors Are Heroes', target: 'competent_governance', cost: { budget: 2000 }, desc: 'Fund the response, praise the medics.', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 1 } },
      { id: 'imported', label: 'Imported Sickness', target: 'foreign_aggression', desc: 'The fever arrived by foreign ship. Probably. Possibly. Certainly foreign.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: -2 } },
    ] },
  // ── CORRUPTION ──────────────────────────────────────────────
  { id: 'ledger', title: 'The Swiss Ledger', category: 'corruption', severity: 3, fuse: 2, victims: 0,
    intel: 'A bank leak names the First Family in a $60M embezzlement. One outlet has it; others pick it up in 2 days unless suppressed. The numbers are… legible.',
    facts: { photos_exist: false, death_count: 0, names_known: true, first_family: true },
    stakes: ['press', 'elite', 'public'], chain: 'ledger_widens',
    frames: [
      { id: 'fabrication', label: 'Foreign Fabrication', target: 'foreign_aggression', leader: 1, desc: 'The Swiss are famously jealous of our banking.', lean: { public: 1, press: -2, military: 0, elite: 1, foreign: -2 } },
      { id: 'typoclerk', label: 'Clerical Error (60M)', target: 'routine_administration', desc: 'A typo. Sixty million typos, in sequence.', lean: { public: 0, press: -1, military: 0, elite: 1, foreign: 0 } },
      { id: 'austerity', label: 'Austerity for Thee', target: 'competent_governance', desc: 'Announce spending reviews. The Family is exempt (do not say so).', lean: { public: 1, press: 0, military: 0, elite: -1, foreign: 1 } },
    ] },
  { id: 'ledger_widens', title: 'Ledger Story Breaks Wide', category: 'corruption', severity: 4, fuse: 1, victims: 0, chainIncident: true,
    intel: 'Three more outlets have the Swiss ledger. Cartoonists have the Swiss ledger. Somebody set the Swiss ledger to music. Suppression window: closed.',
    facts: { photos_exist: true, death_count: 0, names_known: true, first_family: true },
    stakes: ['press', 'public', 'elite'], chain: null,
    frames: [
      { id: 'accountant', label: 'Rogue Accountant', target: 'elite_betrayal', desc: 'One accountant moved $60M alone. A prodigy. Arrest him.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 0 } },
      { id: 'sovereign2', label: 'Sovereign Wealth Genius', target: 'competent_governance', desc: 'It was not theft; it was avant-garde fiscal policy.', lean: { public: 0, press: -2, military: 0, elite: 1, foreign: -1 } },
      { id: 'confess', label: 'Partial Admission', target: 'tragic_accident', leader: -3, desc: 'Admit “irregularities.” The Leader will remember this.', lean: { public: 1, press: 2, military: 0, elite: -1, foreign: 1 } },
    ] },
  { id: 'mint', title: 'The Mint’s Short Ton', category: 'corruption', severity: 2, fuse: 3, victims: 0,
    intel: 'A ton of coin-valuables is missing from the Mint. The Director (an Owner’s cousin) blames “evaporation.” Economists are laughing. Audibly.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['elite', 'press'], chain: null,
    frames: [
      { id: 'evaporation', label: 'Natural Evaporation', target: 'routine_administration', desc: 'Metals evaporate. Science. Do not consult science.', lean: { public: 0, press: -2, military: 0, elite: 1, foreign: 0 } },
      { id: 'heist', label: 'Daring Foreign Heist', target: 'foreign_aggression', desc: 'Ocean’s abroad. Gripping. Unevidenced.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: -2 } },
      { id: 'inventory', label: 'Inventory Modernization', target: 'competent_governance', cost: { budget: 1000 }, desc: 'New locks, new ledgers, new Director (maybe).', lean: { public: 1, press: 1, military: 0, elite: -1, foreign: 1 } },
    ] },
  { id: 'nepotism', title: 'The Nephew’s Portfolios', category: 'corruption', severity: 2, fuse: 3, victims: 0,
    intel: 'The Leader’s nephew holds 14 portfolios, including Fisheries and Orthopedics. He is 19. He is doing excellent work. Do not specify which work.',
    facts: { photos_exist: true, death_count: 0, names_known: true, first_family: true },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'prodigy', label: 'A Prodigy Serves', target: 'competent_governance', leader: 2, desc: 'He is simply gifted. Fourteen times gifted.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: -1 } },
      { id: 'youth', label: 'Youth in Government', target: 'routine_administration', leader: 1, desc: 'A youth program. The youth is one. The program is nepotism.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'resign1', label: 'Nephew Resigns One Post', target: 'elite_betrayal', leader: -2, desc: 'He keeps 13. Magnanimous. The Leader notices.', lean: { public: 1, press: 1, military: 0, elite: 0, foreign: 1 } },
    ] },
  { id: 'tenders', title: 'Tenders for Friends', category: 'corruption', severity: 3, fuse: 3, victims: 0,
    intel: 'All 11 state tenders this quarter went to two firms, both owned by one family, which is also your family if you squint. The tender committee requests a thesaurus.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['elite', 'press', 'public'], chain: null,
    frames: [
      { id: 'merit', label: 'Pure Merit', target: 'competent_governance', desc: 'They simply won. Eleven times. Merit is a coincidence machine.', lean: { public: 0, press: -1, military: 0, elite: 1, foreign: 0 } },
      { id: 'reform', label: 'Tender Reform', target: 'elite_betrayal', desc: 'Reform the process. The winners will be furious.', lean: { public: 1, press: 1, military: 0, elite: -2, foreign: 1 } },
      { id: 'complexity', label: 'Too Complex to Explain', target: 'routine_administration', desc: 'Gray fog it. Procurement is boring by design. Use that.', lean: { public: 0, press: 0, military: 0, elite: 1, foreign: 0 } },
    ] },
  { id: 'yacht', title: 'The Minister’s Yacht Armada', category: 'corruption', severity: 2, fuse: 3, victims: 0,
    intel: 'A minister owns four yachts on a civil servant’s salary. He calls them “floating offices.” One has a helicopter. The helicopter has a yacht.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['public', 'elite'], chain: null,
    frames: [
      { id: 'offices', label: 'Floating Offices', target: 'routine_administration', desc: 'They are offices. That float. With champagne storage (for files).', lean: { public: -1, press: -2, military: 0, elite: 1, foreign: 0 } },
      { id: 'donation', label: 'Yachts Donated (One)', target: 'competent_governance', desc: 'He donates the smallest yacht. Statesmanship.', lean: { public: 1, press: 1, military: 0, elite: -1, foreign: 1 } },
      { id: 'regatta', label: 'National Regatta Triumph', target: 'foreign_aggression', desc: 'Reframe as sport: our yachts beat their yachts. Somewhere. Probably.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: -1 } },
    ] },
  // ── ABSURDITIES ─────────────────────────────────────────────
  { id: 'portrait', title: 'The Weeping Portrait', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'The Leader’s lobby portrait is weeping. Condensation, say engineers. Pride, says the memo. Pilgrims are gathering. Somebody is selling tissues.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public'], chain: null,
    frames: [
      { id: 'miracle', label: 'A Sign of Pride', target: 'competent_governance', leader: 3, desc: 'It is a miracle. Report the miracle. Sell tickets.', lean: { public: 2, press: -1, military: 0, elite: 0, foreign: -1 } },
      { id: 'plumbing', label: 'Plumbing Issue', target: 'routine_administration', leader: -2, desc: 'It is a leak. Fix the leak. Boring. Correct.', lean: { public: 0, press: 1, military: 0, elite: 0, foreign: 1 } },
    ] },
  { id: 'zoo', title: 'The Missing Tiger', category: 'absurdity', severity: 2, fuse: 3, victims: 0,
    intel: 'The national zoo is missing a tiger. The zoo denies the tiger existed. The tiger was photographed yesterday, eating a bench. The bench union demands answers.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'notiger', label: 'No Tiger Ever', target: 'routine_administration', leader: 1, denyPhotos: true, desc: 'Deny the tiger. The tiger disagrees, photographically.', lean: { public: -1, press: -2, military: 0, elite: 0, foreign: 0 } },
      { id: 'diplomacy', label: 'Tiger Diplomacy', target: 'foreign_aggression', desc: 'The tiger defected. Abroad radicalized it. Probably.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: -1 } },
      { id: 'search', label: 'National Tiger Search', target: 'competent_governance', cost: { budget: 500 }, desc: 'A heartwarming search. The nation loves a search.', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'pigeon', title: 'The Pigeon Incident', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'A pigeon disrupted the Leader’s balcony address. There was no pigeon. There is no balcony. 40,000 witnesses require counseling.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public'], chain: null,
    frames: [
      { id: 'nopigeon', label: 'No Pigeon', target: 'routine_administration', leader: 2, desc: 'Deny everything. The footage is pigeon-generated AI.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: 0 } },
      { id: 'hero', label: 'Hero Pigeon of Vestria', target: 'competent_governance', leader: 1, desc: 'Decorate the pigeon. It showed vigilance. The dog is jealous.', lean: { public: 2, press: 0, military: 1, elite: 0, foreign: 0 } },
    ] },
  { id: 'rain', title: 'Rain Denial Crisis', category: 'absurdity', severity: 2, fuse: 3, victims: 0,
    intel: 'It rained for six days. The memo says it did not rain. Rivers say otherwise. Umbrella salesmen have been arrested for “meteorological dissent.”',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'dry', label: 'Historically Dry Week', target: 'routine_administration', leader: 2, desc: 'The streets are dry. Citizens are wet for unrelated reasons.', lean: { public: -1, press: -2, military: 0, elite: 0, foreign: -1 } },
      { id: 'blessing', label: 'Blessed Precipitation', target: 'competent_governance', desc: 'It rained because the harvest deserved it. You’re welcome.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'statue', title: 'The 40-Meter Gratitude', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'The new 40-meter statue of the Leader has… settled. It leans. Engineers call it “dynamic gratitude.” Children call it “the falling man.”',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public'], chain: null,
    frames: [
      { id: 'bow', label: 'The Leader Bows to You', target: 'competent_governance', leader: 2, desc: 'It is not leaning. It is bowing. To the people. Forever.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'art', label: 'Avant-Garde Masterpiece', target: 'routine_administration', desc: 'Leaning is the style now. All statues lean. Check abroad. (Don’t.)', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'anthem', title: 'The New Verse', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'The anthem’s new verse (about the Leader) rhymes “eternal” with “diurnal.” Poets are weeping. Different weeping than the portrait. Worse.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'genius', label: 'Lyrical Genius', target: 'competent_governance', leader: 2, desc: 'The rhyme is deliberate. It is called slant loyalty.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'contest', label: 'National Rhyme Contest', target: 'routine_administration', desc: 'Let the people propose verses. Democracy! (Winner pre-selected.)', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 0 } },
    ] },
  // ── FOREIGN ─────────────────────────────────────────────────
  { id: 'border', title: 'Border Shelling Incident', category: 'foreign', severity: 4, fuse: 2, victims: 9,
    intel: 'Shells crossed the northern border. 9 dead. Both sides blame each other. Our guns were “cleaning themselves.” Observers request the cleaning schedule.',
    facts: { photos_exist: true, death_count: 9, names_known: false, troops_involved: true },
    stakes: ['foreign', 'military', 'press'], chain: 'border_observers',
    frames: [
      { id: 'provoked', label: 'Unprovoked Attack on Us', target: 'foreign_aggression', leader: 1, desc: 'They started it. Evidence: our certainty.', lean: { public: 2, press: -1, military: 2, elite: 0, foreign: -3 } },
      { id: 'joint', label: 'Joint Investigation', target: 'competent_governance', cost: { concessions: 1 }, desc: 'Invite scrutiny. Costs a Concession. Defuses sanctions.', lean: { public: 0, press: 1, military: -1, elite: 0, foreign: 2 } },
      { id: 'fog', label: 'Fog of Routine', target: 'routine_administration', desc: 'Border noises. Routine noises. Gray fog.', lean: { public: 0, press: -1, military: 1, elite: 0, foreign: -1 } },
    ] },
  { id: 'border_observers', title: 'Observers at the Border', category: 'foreign', severity: 3, fuse: 2, victims: 0, chainIncident: true,
    intel: 'Foreign observers are physically at the border, measuring craters. Their ruler has numbers on it. Numbers are the enemy now.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['foreign', 'press'], chain: null,
    frames: [
      { id: 'welcome', label: 'Welcome, Friends', target: 'competent_governance', desc: 'Charm them. Treaty fog. Long sentences. Pursuant.', lean: { public: 0, press: 0, military: -1, elite: 0, foreign: 2 } },
      { id: 'spies', label: 'Spies With Rulers', target: 'foreign_aggression', leader: 1, desc: 'Expel the measurers. Sanctions clock ticks louder.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -3 } },
    ] },
  { id: 'sanctions', title: 'Sanctions Committee Convenes', category: 'foreign', severity: 3, fuse: 3, victims: 0,
    intel: 'The sanctions committee convenes Friday. Our delegation’s briefcase contains: hope, a fish recipe, and no concessions. Consider packing concessions.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['foreign', 'elite'], chain: null,
    frames: [
      { id: 'defy', label: 'Sanctions Are Compliments', target: 'foreign_aggression', leader: 2, desc: 'We are sanctioned because we are strong. Economics!', lean: { public: 1, press: -1, military: 1, elite: -2, foreign: -2 } },
      { id: 'conciliate', label: 'Conciliatory Signals', target: 'competent_governance', cost: { concessions: 1 }, desc: 'Release a prisoner. Sign a paper. Breathe.', lean: { public: 0, press: 1, military: -1, elite: 1, foreign: 2 } },
    ] },
  { id: 'defector', title: 'The Famous Defector', category: 'foreign', severity: 3, fuse: 2, victims: 0,
    intel: 'A beloved athlete defected mid-tournament, live on foreign TV. He waved. The wave has been viewed 40 million times. Our team won the match. Nobody cares.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['public', 'foreign'], chain: null,
    frames: [
      { id: 'kidnapped', label: 'Kidnapped by Abroad', target: 'foreign_aggression', desc: 'He was taken. The waving was a distress signal. Probably.', lean: { public: 1, press: -2, military: 0, elite: 0, foreign: -2 } },
      { id: 'washed', label: 'Washed-Up Anyway', target: 'routine_administration', desc: 'He was past his prime. The team is better off. (He was 22.)', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'traitor', label: 'Traitor to the Fish', target: 'elite_betrayal', leader: 1, desc: 'Maximum denunciation. His medals are now medals of shame.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -1 } },
    ] },
  { id: 'embassy', title: 'Embassy Bugging Farce', category: 'foreign', severity: 2, fuse: 3, victims: 0,
    intel: 'Our microphones were found in their embassy. Their microphones were found in ours. Both sides are shocked. The microphones are excellent quality.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['foreign', 'press'], chain: null,
    frames: [
      { id: 'mutual', label: 'Mutual Hobbyists', target: 'routine_administration', desc: 'Everyone bugs. It is the diplomatic birdwatching.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 0 } },
      { id: 'outrage', label: 'Performative Outrage', target: 'foreign_aggression', desc: 'Expel two diplomats. They expel three. Everyone stretches.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -2 } },
    ] },
  // ── ELITE FEUDS ─────────────────────────────────────────────
  { id: 'bankrun', title: 'Whispers at First Vestrian', category: 'elite', severity: 3, fuse: 2, victims: 0,
    intel: 'Depositors queue at First Vestrian Bank. The VP (an Owner’s nephew) calls it “a parade.” Markets listen to parades. Markets are selling.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['elite', 'public'], chain: null,
    frames: [
      { id: 'calm', label: 'Markets Are Calm', target: 'competent_governance', desc: 'Say calm until calm. Never say audit, freeze, or inquiry.', lean: { public: 1, press: -1, military: 0, elite: 1, foreign: 0 } },
      { id: 'guarantee', label: 'State Guarantee', target: 'tragic_accident', cost: { budget: 4000 }, desc: 'Back deposits with real money. The Generals approve of real money.', lean: { public: 2, press: 1, military: 0, elite: 2, foreign: 1 } },
      { id: 'panic', label: 'Blame Panic-Mongers', target: 'cover_up', desc: 'Arrest a queue. Queues are illegal now (check with Licensing).', lean: { public: -1, press: -2, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'feud', title: 'Owners at War', category: 'elite', severity: 3, fuse: 3, victims: 0,
    intel: 'Two Owner families feud over the aluminum plant. Mercenaries were mentioned. At dinner. As a joke. (Not a joke.) Pick no side publicly; pick one privately.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['elite', 'military'], chain: null,
    frames: [
      { id: 'neutral', label: 'Strict Neutrality', target: 'routine_administration', desc: 'Above the fray. Both families invoice you anyway.', lean: { public: 0, press: 0, military: 0, elite: 0, foreign: 0 } },
      { id: 'arbiter', label: 'The Leader Arbitrates', target: 'competent_governance', leader: 2, desc: 'The Leader mediates. Loser pays. Winner pays more (quietly).', lean: { public: 1, press: 0, military: 0, elite: 1, foreign: 0 } },
    ] },
  { id: 'expropriation', title: 'Expropriation Rumor', category: 'elite', severity: 4, fuse: 2, victims: 0,
    intel: 'A rumor: the state will seize the steel works. Markets plunge. The word “restructuring” was overheard. Say it was about the office furniture.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['elite', 'public'], chain: null,
    frames: [
      { id: 'sacred', label: 'Property Is Sacred', target: 'competent_governance', desc: 'Affirm property rights. Euphemism laundering: never say seizure.', lean: { public: 0, press: 0, military: 0, elite: 2, foreign: 1 } },
      { id: 'study', label: 'A Study Was Commissioned', target: 'routine_administration', desc: 'Fog it. Studies take years. Markets can wait. (They cannot.)', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'heir', title: 'The Heir’s Car Collection', category: 'elite', severity: 2, fuse: 3, victims: 0,
    intel: 'An Owner’s heir crashed his 9th sports car — into a bread line. Nobody died. Everybody photographed. The bread is fine. The optics are totaled.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['public', 'elite', 'press'], chain: null,
    frames: [
      { id: 'apology', label: 'Heir Apologizes, Pays', target: 'tragic_accident', cost: { budget: 1000 }, desc: 'Bread for a year for the district. Cheese too. Do not skimp on cheese.', lean: { public: 2, press: 1, military: 0, elite: -1, foreign: 1 } },
      { id: 'driver', label: 'Blame the Driver', target: 'elite_betrayal', desc: 'The driver did it. The driver is in shock. The driver is fired.', lean: { public: 0, press: -1, military: 0, elite: 1, foreign: 0 } },
      { id: 'brakes', label: 'Foreign Brakes Failed', target: 'foreign_aggression', desc: 'The brakes were imported. Conclusion: import nothing. Walk.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'casino', title: 'The Dacha Casino Tapes', category: 'elite', severity: 3, fuse: 2, victims: 0,
    intel: 'Tapes: ministers gambling at a dacha casino, betting with tender contracts. The audio is crisp. The laughter is the worst part. The laughter is always the worst part.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['press', 'public', 'elite'], chain: null,
    frames: [
      { id: 'charity', label: 'Charity Gala', target: 'routine_administration', desc: 'It was charity. The charity was morale. Their morale.', lean: { public: 0, press: -2, military: 0, elite: 1, foreign: 0 } },
      { id: 'sting', label: 'Undercover Sting', target: 'competent_governance', desc: 'They were undercover. For years. Deeply undercover. Winning.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'resignations', label: 'Two Resignations', target: 'elite_betrayal', desc: 'Two ministers resign “to spend time with their yachts.”', lean: { public: 1, press: 1, military: 0, elite: -1, foreign: 1 } },
    ] },
  // ── MILITARY ────────────────────────────────────────────────
  { id: 'barracks', title: 'Barracks Pay Arrears', category: 'military', severity: 3, fuse: 3, victims: 0,
    intel: 'Troops are owed 3 months’ pay. A sergeant wrote a poem about it. The poem rhymes “hungry” with “mutiny.” Fund the pay or fund the consequences.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['military', 'public'], chain: null,
    frames: [
      { id: 'pay', label: 'Pay the Troops', target: 'competent_governance', cost: { budget: 3500 }, desc: 'Real money, real loyalty. The Generals check the ledger.', lean: { public: 1, press: 1, military: 3, elite: 0, foreign: 0 } },
      { id: 'honor', label: 'Honor Is Payment', target: 'routine_administration', leader: 1, desc: 'Pay them in honor. Honor is legal tender (it is not).', lean: { public: 0, press: -1, military: -2, elite: 0, foreign: 0 } },
      { id: 'thieves', label: 'Blame Paymaster Thieves', target: 'elite_betrayal', desc: 'The paymasters stole it. Arrest paymasters. Find money anyway.', lean: { public: 1, press: 0, military: 0, elite: -1, foreign: 0 } },
    ] },
  { id: 'general', title: 'The General’s Heart Attack', category: 'military', severity: 3, fuse: 2, victims: 1,
    intel: 'General Haluzicek is dead. Natural causes, say doctors. Convenient timing, says everyone. The succession of command is… an active discussion with tanks.',
    facts: { photos_exist: false, death_count: 1, names_known: true },
    stakes: ['military', 'elite'], chain: null,
    frames: [
      { id: 'hero', label: 'Hero’s Farewell', target: 'tragic_accident', desc: 'Full honors. Name the successor fast. Totem keywords advised.', lean: { public: 1, press: 0, military: 2, elite: 0, foreign: 0 } },
      { id: 'poison', label: 'Foreign Poison?', target: 'foreign_aggression', desc: 'Suggest poison. Suggest nothing provable. Fun for all factions. (Not fun.)', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: -2 } },
    ] },
  { id: 'deserters', title: 'Deserters in the Hills', category: 'military', severity: 2, fuse: 3, victims: 0,
    intel: 'Forty conscripts walked out of Camp Lesna and into the hills. They left a note: “We will return when the boots arrive.” The boots did not arrive.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['military', 'public'], chain: null,
    frames: [
      { id: 'exercise', label: 'Surprise Exercise', target: 'routine_administration', desc: 'They are not deserters; they are enthusiastically lost. Officially.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: 0 } },
      { id: 'boots', label: 'Boots for Every Soldier', target: 'competent_governance', cost: { budget: 1500 }, desc: 'Buy the boots. Revolutionary concept.', lean: { public: 1, press: 1, military: 2, elite: 0, foreign: 0 } },
    ] },
  { id: 'parade', title: 'Parade Missile Malfunction', category: 'military', severity: 2, fuse: 3, victims: 0,
    intel: 'A parade missile refused to parade; it lay down in the square and smoked. 200 diplomats watched. The smoke spelled nothing. This time.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['military', 'foreign'], chain: null,
    frames: [
      { id: 'planned', label: 'Planned Demonstration', target: 'competent_governance', desc: 'The lying down was the demonstration. Of humility. Our missiles are humble.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -1 } },
      { id: 'restraint', label: 'Missile Shows Restraint', target: 'routine_administration', desc: 'It chose not to fly. A pacifist missile. Give it a medal.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 0 } },
    ] },
  // ── v2.1 EXPANSION (10 fresh scandals) ──────────────────────
  { id: 'blackout', title: 'The Rolling Blackouts', category: 'disaster', severity: 2, fuse: 3, victims: 0,
    intel: 'Half the capital went dark for nine hours. Hospitals ran on generators; the Leader’s palace did not flicker once. The memo blames “excessive moonlight.” Electricians blame the grid.',
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['public', 'elite'], chain: null,
    frames: [
      { id: 'rest', label: 'Grid Rest Day', target: 'competent_governance', desc: 'The grid needed rest. So do you. Sleep, citizen.', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'sabotage', label: 'Cable Saboteurs', target: 'cover_up', desc: 'Someone cut the cables. Someone foreign-shaped.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -2 } },
    ] },
  { id: 'harbor_fire', title: 'The Harbor Fuel Fire', category: 'disaster', severity: 4, fuse: 2, victims: 4,
    intel: 'The harbor fuel depot burned all night. 4 workers dead, a smoke column visible from the presidential yacht. Safety inspectors were “reassigned” last spring. Everyone filmed it.',
    facts: { photos_exist: true, death_count: 4, names_known: true },
    stakes: ['public', 'press', 'elite'], chain: null,
    frames: [
      { id: 'heroic', label: 'Heroic Firefighters', target: 'tragic_accident', desc: 'Mourn the dead, praise the hoses. Do not mention the inspectors.', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 1 } },
      { id: 'arson', label: 'Foreign Arson', target: 'foreign_aggression', desc: 'The fire had an accent. Probably.', lean: { public: 1, press: -2, military: 1, elite: 0, foreign: -3 } },
    ] },
  { id: 'rail', title: 'The Night Train Derailment', category: 'disaster', severity: 3, fuse: 2, victims: 11,
    intel: 'The midnight express left the rails outside Kars. 11 dead. The tracks were “scheduled for inspection” for six years. Survivors are giving interviews from hospital beds.',
    facts: { photos_exist: true, death_count: 11, names_known: false },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'weather', label: 'Unprecedented Weather', target: 'tragic_accident', desc: 'The rails were surprised by autumn. It happens.', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'modernize', label: 'Modernization Pledge', target: 'competent_governance', desc: 'Promise new rails. Mean it, briefly.', lean: { public: 1, press: 1, military: 0, elite: 0, foreign: 1 } },
    ] },
  { id: 'bread', title: 'The Bread “Adjustment”', category: 'corruption', severity: 3, fuse: 2, victims: 0,
    intel: 'Bread tripled in price overnight. The Commerce Minister calls it “an adjustment.” His cousin owns eleven mills. Queues stretch around blocks; the queues are now illegal.',
    facts: { photos_exist: true, death_count: 0, names_known: true },
    stakes: ['public', 'elite', 'press'], chain: null,
    frames: [
      { id: 'cousin', label: 'Sacrifice the Cousin', target: 'elite_betrayal', desc: 'One cousin, publicly ruined. Bread stays expensive, but justice is served warm.', lean: { public: 2, press: 1, military: 0, elite: -2, foreign: 0 } },
      { id: 'diet', label: 'National Fitness Drive', target: 'routine_administration', leader: 1, desc: 'Less bread, healthier nation. The Leader eats cake, for morale.', lean: { public: -1, press: -2, military: 0, elite: 1, foreign: -1 } },
    ] },
  { id: 'opera', title: 'The Cough at the Gala', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'During the anthem at the Opera Gala, an ambassador coughed. The cough lasted four seconds. It is now the only thing anyone discusses. Coughing near flags is under review.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['public', 'foreign'], chain: null,
    frames: [
      { id: 'dust', label: 'Historic Dust', target: 'routine_administration', desc: 'The opera house is old. Dust is patriotic.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 1 } },
      { id: 'applause', label: 'Cough Was Applause', target: 'competent_governance', leader: 1, desc: 'A new form of applause. Everyone will cough now. Mandatorily.', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'exam_leak', title: 'The Exam Leak', category: 'absurdity', severity: 1, fuse: 4, victims: 0,
    intel: 'University entrance answers were sold at the central market for pocket change. The Minister’s son scored a perfect 100%. He also spelled his own name two ways.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['public', 'press'], chain: null,
    frames: [
      { id: 'genius', label: 'A Generation of Geniuses', target: 'competent_governance', desc: 'Scores are up everywhere. Our schools work. Do not check the market.', lean: { public: 0, press: -2, military: 0, elite: 0, foreign: 0 } },
      { id: 'vendor', label: 'Blame the Vendors', target: 'cover_up', desc: 'Arrest stationers. The son is gifted; giftedness runs in ministries.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
    ] },
  { id: 'summit_snub', title: 'The Summit Snub', category: 'foreign', severity: 2, fuse: 3, victims: 0,
    intel: 'At the regional summit, three leaders “missed” our Leader’s handshake — on camera, in a loop, set to music abroad. The Foreign Ministry calls it “a scheduling hug.”',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['foreign', 'elite'], chain: null,
    frames: [
      { id: 'busy', label: 'Very Busy Schedule', target: 'routine_administration', desc: 'Everyone was busy. Handshakes are for the idle.', lean: { public: 0, press: -1, military: 0, elite: 0, foreign: 1 } },
      { id: 'strength', label: 'Strength Needs No Hands', target: 'competent_governance', leader: 1, desc: 'They feared the grip. The grip of the nation.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -1 } },
    ] },
  { id: 'banker_flees', title: 'The Banker Who Flew', category: 'elite', severity: 3, fuse: 2, victims: 0,
    intel: 'Deputy bank chief Olen Sova boarded a dawn flight with two suitcases and the loan ledger. Abroad wants him talking; the Owners want him swimming. The ledger wants daylight.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['elite', 'foreign', 'press'], chain: null,
    frames: [
      { id: 'vacation', label: 'Extended Vacation', target: 'routine_administration', desc: 'He is resting. The suitcases are full of rest.', lean: { public: -1, press: -2, military: 0, elite: 1, foreign: -2 } },
      { id: 'traitor', label: 'Embezzler Unmasked', target: 'elite_betrayal', desc: 'He stole, we caught him (after the flight). Freeze everything with his name on it.', lean: { public: 1, press: 1, military: 0, elite: -1, foreign: 1 } },
    ] },
  { id: 'dark_ward', title: 'The Dark Ward', category: 'atrocity', severity: 4, fuse: 2, victims: 9,
    intel: 'Generators failed at Central Hospital during surgery hours. 9 dead on the tables. The maintenance budget bought a minister’s dacha instead. Nurses are talking; one kept receipts.',
    facts: { photos_exist: false, death_count: 9, names_known: false },
    stakes: ['public', 'press', 'elite'], chain: null,
    frames: [
      { id: 'grief', label: 'National Mourning', target: 'tragic_accident', desc: 'Flags at half-mast, dacha unmentioned. Grief Shield applies.', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 1 } },
      { id: 'nurse', label: 'Blame the Night Shift', target: 'cover_up', desc: 'Sacrifice nurses. The receipts disagree, loudly.', lean: { public: -1, press: -3, military: 0, elite: 0, foreign: -1 } },
    ] },
  { id: 'colonel_tapes', title: 'The Colonel’s Tapes', category: 'military', severity: 4, fuse: 2, victims: 0,
    intel: 'Leaked tapes catch a logistics colonel selling army fuel to smugglers — by the tanker. The General Staff calls the audio “a radio play.” The smugglers call him “the colonel.”',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['military', 'press', 'elite'], chain: null,
    frames: [
      { id: 'actor', label: 'A Gifted Actor', target: 'routine_administration', desc: 'The voice is an impression. The tankers are method acting.', lean: { public: 0, press: -2, military: 1, elite: 0, foreign: -1 } },
      { id: 'courtmartial', label: 'Swift Court-Martial', target: 'elite_betrayal', desc: 'One colonel, publicly court-martialed. Fuel accounted for. Mostly.', lean: { public: 1, press: 2, military: -2, elite: 0, foreign: 1 } },
    ] },
  // ── ACT GATES ───────────────────────────────────────────────
  { id: 'act2_crisis', title: 'MID-CAMPAIGN CRISIS: Market Crash', category: 'elite', severity: 5, fuse: 1, victims: 0, scripted: 'act2',
    intel: 'The Vestrian Exchange lost 30% in an hour. The ticker tape is being used as ticker tape for funerals. Every faction wants a statement. Every faction wants a different one.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['elite', 'public', 'foreign'], chain: null,
    frames: [
      { id: 'correction', label: 'Healthy Correction', target: 'competent_governance', desc: 'The market is dieting. Thin markets are healthy markets.', lean: { public: 0, press: -1, military: 0, elite: 1, foreign: 0 } },
      { id: 'attack', label: 'Foreign Market Attack', target: 'foreign_aggression', leader: 1, desc: 'Abroad shorted us. Evidence: our losses, their timing.', lean: { public: 1, press: -1, military: 1, elite: 0, foreign: -3 } },
      { id: 'intervene', label: 'State Intervention Fund', target: 'tragic_accident', cost: { budget: 5000 }, desc: 'Buy the dip with the Treasury. Bold. Real.', lean: { public: 1, press: 1, military: 0, elite: 2, foreign: 1 } },
    ] },
  { id: 'act3_knives', title: 'NIGHT OF KNIVES: Someone Must Go', category: 'meta', severity: 5, fuse: 1, victims: 1, scripted: 'act3',
    intel: 'The Leader demands a head by morning: a minister must fall. Not the nephew. Never the nephew. Choose the frame; the engine of state will do the rest. THIS WILL BE REMEMBERED.',
    facts: { photos_exist: false, death_count: 0, names_known: true },
    stakes: ['elite', 'military', 'public'], chain: null,
    frames: [
      { id: 'traitor', label: 'Traitor Unmasked', target: 'elite_betrayal', leader: 3, desc: 'The fallen one was always the enemy. The photos prove it (they show lunch).', lean: { public: 1, press: -1, military: 1, elite: -2, foreign: -1 } },
      { id: 'retire', label: 'Honorable Retirement', target: 'routine_administration', desc: 'Retire them with honors. Honors include survival.', lean: { public: 0, press: 0, military: 0, elite: 0, foreign: 1 } },
    ] },
  { id: 'act4_election', title: 'ELECTION EVE: The Result', category: 'meta', severity: 5, fuse: 1, victims: 0, scripted: 'act4',
    intel: 'Tomorrow the nation votes. Observers are in the lobby. The result must be: decisive, calm, and (per memo) 78%. Write the pre-victory statement. History is watching. So are the rulers-with-numbers.',
    facts: { photos_exist: true, death_count: 0, names_known: false },
    stakes: ['foreign', 'public', 'press'], chain: null,
    frames: [
      { id: 'triumph', label: 'Democratic Triumph', target: 'competent_governance', leader: 3, desc: '78%. Decisive. Calm. Pre-reported for convenience.', lean: { public: 1, press: -1, military: 1, elite: 1, foreign: -2 } },
      { id: 'process', label: 'Sacred Process', target: 'routine_administration', desc: 'Praise the process, not the number. The Leader dislikes this.', lean: { public: 1, press: 1, military: 0, elite: 0, foreign: 1 } },
    ] },
];

/** Look up an incident by id */
export function getIncident(id) {
  return INCIDENTS.find((i) => i.id === id) || null;
}

/**
 * Build a meta/archive-callback incident from one of the player's own claims.
 * Late-game crises deliberately resurrect early claims (GDD §4.3).
 */
export function makeCallbackIncident(claim, day) {
  const short = claim.text.length > 64 ? claim.text.slice(0, 61) + '…' : claim.text;
  return {
    id: `callback-${claim.id}`,
    title: `The Record vs. Reality: Day ${claim.day}`,
    category: 'meta',
    severity: 4,
    fuse: 2,
    victims: 0,
    callback: true,
    intel: `Day ${claim.day} you stated: “${short}” Events since have… complicated that. The Press has the clipping. The foreign desks have the clipping. Someone laminated the clipping. Explain.`,
    facts: { photos_exist: true, death_count: 0, names_known: false, callback_claim: claim.id },
    stakes: ['press', 'public', 'foreign'],
    chain: null,
    frames: [
      { id: 'context', label: 'Missing Context', target: 'competent_governance', desc: 'The quote is real but contextually airborne. Re-contextualize it.', lean: { public: 1, press: -1, military: 0, elite: 0, foreign: 0 } },
      { id: 'evolved', label: 'The Situation Evolved', target: 'tragic_accident', desc: 'True then, outdated now. Time is the real contradiction.', lean: { public: 1, press: 0, military: 0, elite: 0, foreign: 1 } },
      { id: 'never', label: 'We Never Said That', target: 'cover_up', desc: 'Deny the clipping. The lamination makes this bold.', lean: { public: -1, press: -3, military: 0, elite: 0, foreign: -2 } },
    ],
  };
}

/** Follow-up incidents spawned by failed narrative fit (GDD §3.2 Call 4) */
export function makeMockeryIncident(incident) {
  return {
    id: `mockery-${incident.id}-${Date.now() % 100000}`,
    title: `Nobody Believes the ${shortTitle(incident.title)} Story`,
    category: 'meta',
    severity: 3,
    fuse: 2,
    victims: 0,
    mockery: true,
    intel: `Street comedians now perform your statement verbatim. To laughter. The “${shortTitle(incident.title)} Lies” are becoming a thing people say. Things people say become true unless buried in fog or gold.`,
    facts: { photos_exist: false, death_count: 0, names_known: false },
    stakes: ['public', 'press'],
    chain: null,
    frames: [
      { id: 'humor', label: 'Laugh Along (Carefully)', target: 'routine_administration', leader: -1, desc: 'A regime that laughs is a regime that breathes. The Leader disagrees.', lean: { public: 2, press: 1, military: 0, elite: 0, foreign: 1 } },
      { id: 'double', label: 'Double Down', target: 'cover_up', leader: 1, desc: 'Repeat the claim, louder. Volume is evidence (it is not).', lean: { public: -1, press: -2, military: 0, elite: 0, foreign: -1 } },
    ],
  };
}

function shortTitle(t) {
  return t.replace(/^(The|MID-CAMPAIGN CRISIS:|NIGHT OF KNIVES:|ELECTION EVE:)\s*/i, '').split(':')[0].trim().split(' ').slice(0, 3).join(' ');
}

/**
 * Twist randomizer (v2.1): generic complications stapled onto the daily
 * task at draw time (~35% of days). Each twist appends flavor to the
 * brief and may carry a real mechanical effect. Twists never fire on
 * scripted act gates — history needs no help.
 */
export const TWIST_CHANCE = 0.35;
export const TWISTS = [
  { id: 'leak', text: 'At noon, a bystander photo leaks. It is blurry. It is enough.', photos: true },
  { id: 'stringers', text: 'Foreign stringers arrive by evening. They brought zoom lenses and questions.', deltas: [{ meter: 'investigative_heat', delta: 4 }] },
  { id: 'witness', text: 'A second witness comes forward. They remember details. Specific ones.', deltas: [{ meter: 'public_suspicion', delta: 3 }] },
  { id: 'misfiling', text: 'The Archive misfiles your last denial. The Press finds the misfiling.', deltas: [{ meter: 'archive_integrity', delta: -4 }] },
  { id: 'cousin', text: 'A minister’s cousin is somehow involved. Nobody explains how. Everybody understands.', severity: 1 },
  { id: 'tweet', text: 'The Leader posts about it at 3am. Obliviously. In verse.', deltas: [{ meter: 'leader_satisfaction', delta: 2 }] },
  { id: 'rain', text: 'Rain. Everything looks guiltier in the rain.' },
  { id: 'fish', text: 'The fish lobby issues a statement. It is just the word “fish.” Twelve times.' },
];

/**
 * Roll a twist for a freshly drawn incident. Returns the twist or null.
 * @param {Function} rng01 - returns float in [0,1)
 * @param {Object} incident - drawn incident (scripted/meta exempt)
 */
export function drawTwist(rng01, incident) {
  if (incident.scripted || incident.category === 'meta') return null;
  if (rng01() >= TWIST_CHANCE) return null;
  return TWISTS[Math.floor(rng01() * TWISTS.length) % TWISTS.length];
}

/** Clone an incident with a twist applied (intel appended, facts/severity adjusted). */
export function applyTwist(incident, twist) {
  const facts = { ...(incident.facts || {}) };
  if (twist.photos) facts.photos_exist = true;
  return {
    ...incident,
    facts,
    severity: Math.min(5, incident.severity + (twist.severity || 0)),
    intel: `${incident.intel} ─ TWIST: ${twist.text}`,
    twistId: twist.id,
  };
}
