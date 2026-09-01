const { evaluateBest } = require('./handEval');

function preflopStrength(holeCards) {
  const values = holeCards.map((c) => c.value).sort((a, b) => b - a);
  const [hi, lo] = values;
  let score = (hi + lo) / 28;

  if (hi === lo) {
    score += 0.22 + (hi / 14) * 0.18;
  } else {
    const gap = hi - lo;
    if (gap === 1) score += 0.07;
    else if (gap <= 3) score += 0.03;
  }
  if (holeCards[0].suit === holeCards[1].suit) score += 0.08;

  return Math.min(1, score);
}

function postflopStrength(holeCards, communityCards) {
  const { rank } = evaluateBest([...holeCards, ...communityCards]);
  return Math.min(1, (rank - 1) / 8 + 0.05);
}

function estimateStrength(holeCards, communityCards) {
  const base =
    communityCards.length === 0
      ? preflopStrength(holeCards)
      : postflopStrength(holeCards, communityCards);
  const noise = (Math.random() - 0.5) * 0.1;
  return Math.min(1, Math.max(0, base + noise));
}

// Picks a legal "raise to" total for the bot, sized as a fraction of the pot,
// falling back to an all-in when the stack can't cover a full-size raise.
function pickRaiseTarget(room, seat, potFraction) {
  const maxTotal = seat.betThisRound + seat.chips;
  const toCall = Math.max(0, room.currentBet - seat.betThisRound);
  const potAfterCall = room.pot + toCall;
  const desiredSize = Math.max(room.minRaise, 8, Math.round(potAfterCall * potFraction));
  const target = room.currentBet + desiredSize;
  if (target >= maxTotal) return maxTotal;
  return Math.max(target, room.currentBet + room.minRaise);
}

function decideBotAction(room, seat) {
  const strength = estimateStrength(seat.holeCards, room.communityCards);
  const toCall = Math.max(0, room.currentBet - seat.betThisRound);

  if (toCall === 0) {
    if (strength > 0.72) {
      return { action: 'raise', amount: pickRaiseTarget(room, seat, 0.5 + Math.random() * 0.35) };
    }
    if (strength > 0.45 && Math.random() < 0.35) {
      return { action: 'raise', amount: pickRaiseTarget(room, seat, 0.4) };
    }
    if (strength < 0.3 && Math.random() < 0.12) {
      return { action: 'raise', amount: pickRaiseTarget(room, seat, 0.35) };
    }
    return { action: 'check' };
  }

  const potOdds = toCall / (room.pot + toCall);
  // Bots stay in far more often than a "correct" pot-odds player would —
  // a much lower multiplier here, a bigger/likelier small-bet auto-call,
  // and a much bigger bluff-catch fallback all push the same direction:
  // fold is the last resort, not the default response to a weak hand.
  const callThreshold = potOdds * 0.45;

  if (strength >= callThreshold + 0.28 && strength > 0.55) {
    return { action: 'raise', amount: pickRaiseTarget(room, seat, 0.55 + Math.random() * 0.3) };
  }
  if (strength >= callThreshold) {
    return { action: 'call' };
  }
  if (toCall <= seat.chips * 0.15 && Math.random() < 0.85) {
    return { action: 'call' };
  }
  if (Math.random() < 0.35) {
    return { action: 'call' };
  }
  return { action: 'fold' };
}

module.exports = { decideBotAction };
