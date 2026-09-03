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
  // Free once every 24h (gated server-side in server.js, not by cost — this
  // wheel's "cost" is always 0). Never lands on nothing: it's a gift, so it
  // should always feel like one. The login-streak bonus that stacks on top
  // of whatever this lands on is computed separately in server.js.
  //
  // Unlike the paid wheels, every segment here is one of three reward
  // types instead of a flat chip amount — see server.js's /api/wheel/spin
  // handler for how each is actually paid out:
  //   'chips' — straight chips (same as the paid wheels always were)
  //   'xp'    — a pure rank-progress bump, no chips attached
  //   'item'  — one of shop.js's EXOTIC_ITEMS, never buyable, only won here
  // Segment order is deliberately interleaved (item, chips, xp, item,
  // chips, xp, ...) rather than grouped by type — with all 4 items sitting
  // next to each other (as an earlier version had them), one glance at the
  // wheel reads as "chips over here, items over there" instead of genuine
  // variety at every stop. Every type is at least 2 wedges from its own
  // kind going either direction around the circle, wrap-around included.
  //
  // Chip/XP values are ~10x what they were before — bots now sit down
  // with 10k-20k instead of a flat 1,000, and new accounts start with
  // 12k instead of 1,000, so the old 15-75 range read as pocket change
  // next to that. The streak bonus (server.js) scaled the same way.
  daily: {
    cost: 0,
    segments: [
      { type: 'item', item: 'wheel-bg-aurora' },
      { type: 'chips', chips: 150 },
      { type: 'xp', xp: 300 },
      { type: 'item', item: 'wheel-bg-nebula' },
      { type: 'chips', chips: 250 },
      { type: 'xp', xp: 750 },
      { type: 'item', item: 'wheel-cards-holo' },
      { type: 'chips', chips: 400 },
      { type: 'item', item: 'wheel-cele-fireworks' },
      { type: 'chips', chips: 600 },
    ],
    weights: [5, 22, 16, 3, 20, 10, 1.2, 14, 0.8, 8],
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
