const HAND_NAMES = [
  null,
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

function combinations(arr, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) {
      results.push(combo);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      helper(i + 1, [...combo, arr[i]]);
    }
  }
  helper(0, []);
  return results;
}

function evaluate5(cards) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const uniqueValues = [...new Set(values)];
  let straightHigh = null;
  if (uniqueValues.length === 5) {
    if (uniqueValues[0] - uniqueValues[4] === 4) {
      straightHigh = uniqueValues[0];
    } else if (uniqueValues.join(',') === '14,5,4,3,2') {
      straightHigh = 5;
    }
  }

  if (straightHigh && isFlush) return { rank: 9, tiebreak: [straightHigh] };
  if (groups[0].count === 4) {
    const kicker = groups.find((g) => g.count === 1).value;
    return { rank: 8, tiebreak: [groups[0].value, kicker] };
  }
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return { rank: 7, tiebreak: [groups[0].value, groups[1].value] };
  }
  if (isFlush) return { rank: 6, tiebreak: values };
  if (straightHigh) return { rank: 5, tiebreak: [straightHigh] };
  if (groups[0].count === 3) {
    const kickers = groups.filter((g) => g.count === 1).map((g) => g.value);
    return { rank: 4, tiebreak: [groups[0].value, ...kickers] };
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairValues = [groups[0].value, groups[1].value].sort((a, b) => b - a);
    const kicker = groups.find((g) => g.count === 1).value;
    return { rank: 3, tiebreak: [...pairValues, kicker] };
  }
  if (groups[0].count === 2) {
    const kickers = groups.filter((g) => g.count === 1).map((g) => g.value);
    return { rank: 2, tiebreak: [groups[0].value, ...kickers] };
  }
  return { rank: 1, tiebreak: values };
}

function compareScores(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function evaluateBest(cards) {
  const fiveCardHands = cards.length <= 5 ? [cards] : combinations(cards, 5);
  let best = null;
  for (const hand of fiveCardHands) {
    const score = evaluate5(hand);
    if (!best || compareScores(score, best) > 0) best = score;
  }
  return { ...best, name: HAND_NAMES[best.rank] };
}

module.exports = { evaluateBest, compareScores };
