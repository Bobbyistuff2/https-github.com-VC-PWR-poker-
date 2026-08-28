// A Fortnite/League-style competitive rank ladder. Rank is derived, not
// stored — it's always computed fresh from a player's current chip balance
// and lifetime hands won, so it never needs its own migration or can drift
// out of sync with the numbers that actually earned it.
//
// Score formula: chips count directly (having a lot of chips matters), and
// every lifetime hand win is worth a flat bonus on top (so a grinder who
// wins a lot climbs faster than someone who got lucky on the wheel and is
// just sitting on chips).
const RANKS = [
  { key: 'bronze1', tier: 'Bronze', division: 1, label: 'Bronze I', minScore: 0 },
  { key: 'bronze2', tier: 'Bronze', division: 2, label: 'Bronze II', minScore: 800 },
  { key: 'bronze3', tier: 'Bronze', division: 3, label: 'Bronze III', minScore: 1600 },
  { key: 'silver1', tier: 'Silver', division: 1, label: 'Silver I', minScore: 2500 },
  { key: 'silver2', tier: 'Silver', division: 2, label: 'Silver II', minScore: 3500 },
  { key: 'silver3', tier: 'Silver', division: 3, label: 'Silver III', minScore: 4750 },
  { key: 'gold1', tier: 'Gold', division: 1, label: 'Gold I', minScore: 6000 },
  { key: 'gold2', tier: 'Gold', division: 2, label: 'Gold II', minScore: 7500 },
  { key: 'gold3', tier: 'Gold', division: 3, label: 'Gold III', minScore: 9500 },
  { key: 'platinum1', tier: 'Platinum', division: 1, label: 'Platinum I', minScore: 12000 },
  { key: 'platinum2', tier: 'Platinum', division: 2, label: 'Platinum II', minScore: 15000 },
  { key: 'platinum3', tier: 'Platinum', division: 3, label: 'Platinum III', minScore: 19000 },
  { key: 'diamond1', tier: 'Diamond', division: 1, label: 'Diamond I', minScore: 24000 },
  { key: 'diamond2', tier: 'Diamond', division: 2, label: 'Diamond II', minScore: 30000 },
  { key: 'diamond3', tier: 'Diamond', division: 3, label: 'Diamond III', minScore: 38000 },
  { key: 'master', tier: 'Master', division: null, label: 'Master', minScore: 50000 },
  { key: 'grandmaster', tier: 'Grandmaster', division: null, label: 'Grandmaster', minScore: 75000 },
];

const HANDS_WON_WEIGHT = 100;

function computeScore({ chips = 0, handsWon = 0 }) {
  return Math.max(0, chips) + Math.max(0, handsWon) * HANDS_WON_WEIGHT;
}

function getRank({ chips, handsWon }) {
  const score = computeScore({ chips, handsWon });
  let current = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.minScore) current = r;
    else break;
  }
  const idx = RANKS.indexOf(current);
  const next = RANKS[idx + 1] || null;
  return {
    key: current.key,
    tier: current.tier,
    division: current.division,
    label: current.label,
    score,
    next: next ? { label: next.label, scoreNeeded: Math.max(0, next.minScore - score) } : null,
  };
}

module.exports = { RANKS, computeScore, getRank };
