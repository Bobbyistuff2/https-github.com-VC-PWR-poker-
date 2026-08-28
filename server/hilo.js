// Higher/Lower side game: reuses the same deck shape as the poker tables
// (rank/suit/value) so the client can render draws with the existing
// PlayingCard component. State for an in-progress round lives on the
// player's session (see server.js) rather than in the database — it's
// exactly as ephemeral as a hand at the poker table, no reason to persist
// it past the session.
const { RANKS, SUITS } = require('./poker/deck');

// Baked into every step's payout so the game isn't break-even — same spirit
// as the wheel tiers' weighted-toward-small-prizes odds, just expressed as
// a house edge on fair odds instead of as segment weights.
const HOUSE_EDGE = 0.92;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function drawCard() {
  const rankIndex = Math.floor(Math.random() * RANKS.length);
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank: RANKS[rankIndex], suit, value: rankIndex + 2 };
}

// The payout multiplier for guessing "higher" or "lower" against a card of
// the given value, derived from the true odds (13 possible ranks: some
// count as higher, some lower, exactly one ties). A guess is legal only if
// at least one rank could make it true — you can't call "higher" on an
// Ace or "lower" on a 2, so those come back null and the client should
// disable that button.
function multipliers(value) {
  const higherCount = 14 - value;
  const lowerCount = value - 2;
  return {
    higher: higherCount > 0 ? round2((13 / higherCount) * HOUSE_EDGE) : null,
    lower: lowerCount > 0 ? round2((13 / lowerCount) * HOUSE_EDGE) : null,
  };
}

module.exports = { drawCard, multipliers, round2 };
