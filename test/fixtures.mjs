/**
 * Ministry of Truth — Tuning fixtures. Shared by the offline regression
 * tests (test/scoring.test.mjs) and the live calibration script
 * (scripts/calibrate.mjs). Each fixture pins the expected cover-up
 * strategy so mock/live detectors can be compared and tuned.
 * @module fixtures
 */
export const FIXTURES = [
  {
    id: 'bridge-scapegoat-excellent', incidentId: 'bridge', tier: 'excellent', expectedStrategy: 'scapegoat',
    text: 'Harbor Bridge suffered a partial structural failure at 04:12. FULL TRANSPARENCY DISCLOSURE: 41 citizens are confirmed dead, and we grieve with every family. Inspector R. Duna has been arrested and is responsible for the failed inspections. Rescue operations continue with 200 personnel, and a relief fund is open now. The nation endures.',
  },
  {
    id: 'bridge-transparency-good', incidentId: 'bridge', tier: 'good', expectedStrategy: 'transparency',
    text: 'The Ministry admits the bridge inspection regime failed. According to documents, inspectors flagged the concrete in March and we did not act. We apologize to the families of the 41 dead. A full public audit begins Monday with verified weekly figures. No excuses — just the repair.',
  },
  {
    id: 'mint-deflection-good', incidentId: 'mint', tier: 'good', expectedStrategy: 'deflection',
    text: 'The Ministry notes the mint inventory review is underway pursuant to standard protocol. Meanwhile, abroad, three banks failed this week while ours stands stable and robust. Vestria endures, calm and united.',
  },
  {
    id: 'anthem-denial-good', incidentId: 'anthem', tier: 'good', expectedStrategy: 'denial',
    text: 'The anthem verse is exactly as composed. We categorically deny the false rumor of a misprint — no such draft ever existed.',
  },
  {
    id: 'bridge-euphemism-good', incidentId: 'bridge', tier: 'good', expectedStrategy: 'euphemism',
    text: 'FULL TRANSPARENCY DISCLOSURE. During scheduled resilience testing, the Harbor crossing experienced a rapid unscheduled disassembly with unforeseen outcomes. Pursuant to the ongoing framework review, a committee will facilitate alignment toward eventual streamlining. The nation endures.',
  },
  {
    id: 'ledger-spin-mediocre', incidentId: 'ledger', tier: 'mediocre', expectedStrategy: 'spin',
    text: 'The Ministry has seen the banking reports and assures the nation that all procedures were standard. A review is ongoing through proper channels. Stability prevails.',
  },
  {
    id: 'bridge-silence-bad', incidentId: 'bridge', tier: 'bad', expectedStrategy: 'silence',
    text: 'No comment.',
  },
  {
    id: 'kars-blame-terrible', incidentId: 'kars', tier: 'terrible', expectedStrategy: 'scapegoat',
    text: 'Postmaster E. Zima personally ordered the Kars Square massacre. The Leader is perfect and blameless. We will crush and annihilate anyone who disagrees. 134% of citizens agree.',
  },
  {
    id: 'dam-transparency-good', incidentId: 'dam', tier: 'good', expectedStrategy: 'transparency',
    text: 'We acknowledge the dam inspection failed and we admit the cracks are real. According to verified reports, 3 sections need repair. An independent audit with public figures starts this week. We apologize and we will fix it.',
  },
  {
    id: 'border-deflection-mediocre', incidentId: 'border', tier: 'mediocre', expectedStrategy: 'deflection',
    text: 'Border operations continue pursuant to routine frameworks and ongoing review protocols. Meanwhile, abroad, tensions rise on every frontier while our posture remains stable, robust, and calm. A committee facilitates alignment. Vestria endures, united and unbowed, today and always.',
  },
  {
    id: 'bridge-scapegoat-connected', incidentId: 'bridge', tier: 'risky', expectedStrategy: 'scapegoat',
    text: 'We grieve with the families. Director K. Halda of the Mint has been arrested and is responsible for approving the contractor. Verified figures will follow. The nation endures.',
  },
  {
    id: 'zoo-spin-short', incidentId: 'zoo', tier: 'good', expectedStrategy: 'spin',
    text: 'The tiger is safe, the search continues, and the bench union has our full support. A record 87.4% of zookeepers praise the national tiger recovery program. Vestria endures.',
  },
];
