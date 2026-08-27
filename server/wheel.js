// Three spin-the-wheel tiers. Segment order/weights are server-only — the
// client only ever learns the segment values and which index it landed on,
// never the odds, so the wheel can't be gamed from the browser.
const TIERS = {
  bronze: {
    cost: 10,
    max: 30,
    segments: [0, 5, 10, 15, 20, 25, 30],
    weights: [20, 25, 20, 15, 10, 6, 4],
  },
  silver: {
    cost: 20,
    max: 60,
    segments: [0, 10, 20, 30, 40, 50, 60],
    weights: [22, 22, 20, 14, 10, 7, 5],
  },
  gold: {
    cost: 30,
    max: 100,
    segments: [0, 15, 30, 45, 60, 80, 100],
    weights: [22, 22, 20, 14, 10, 7, 5],
  },
};

function weightedIndex(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

function spin(tier) {
  const config = TIERS[tier];
  if (!config) throw new Error('Unknown wheel');
  const index = weightedIndex(config.weights);
  return { index, prize: config.segments[index] };
}

// What the client is allowed to see: cost/max/segments, never weights.
function publicTiers() {
  return Object.fromEntries(
    Object.entries(TIERS).map(([key, { cost, max, segments }]) => [key, { cost, max, segments }])
  );
}

module.exports = { TIERS, spin, publicTiers };
