// A Fortnite/League-style competitive rank ladder. Rank is derived from XP,
// which only ever goes up — winning a poker hand or a wheel spin adds to it,
// but nothing (losing a hand, spending chips in the shop, a bad Hi-Lo bust)
// ever takes it away. XP itself isn't stored anywhere but the users.xp
// column; rank is always just "which rung is this XP total past."
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
  { key: 'elite', tier: 'Elite', division: null, label: 'Elite', minScore: 48000 },
  { key: 'master', tier: 'Master', division: null, label: 'Master', minScore: 62000 },
  { key: 'champion', tier: 'Champion', division: null, label: 'Champion', minScore: 80000 },
  { key: 'grandmaster', tier: 'Grandmaster', division: null, label: 'Grandmaster', minScore: 105000 },
  // The top of the ladder — no division, nothing above it, same idea as
  // Fortnite's Unreal rank.
  { key: 'unreal', tier: 'Unreal', division: null, label: 'Unreal', minScore: 150000 },
];

function getRank({ xp = 0 }) {
  const score = Math.max(0, xp);
  let current = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.minScore) current = r;
    else break;
  }
  const idx = RANKS.indexOf(current);
  const next = RANKS[idx + 1] || null;

  // How far into the current band the player's XP sits — drives the XP bar
  // client-side without it needing to know the ladder itself.
  const bandStart = current.minScore;
  const bandEnd = next ? next.minScore : null;
  const progressPct = next ? Math.min(100, Math.round(((score - bandStart) / (bandEnd - bandStart)) * 100)) : 100;

  return {
    key: current.key,
    tier: current.tier,
    division: current.division,
    label: current.label,
    score,
    xp: score,
    // Position in the ladder — lets the client tell a promotion from a
    // demotion by comparing two rank objects without knowing the ladder
    // itself.
    index: idx,
    next: next ? { label: next.label, xpNeeded: Math.max(0, bandEnd - score) } : null,
    progressPct,
  };
}

module.exports = { RANKS, getRank };
