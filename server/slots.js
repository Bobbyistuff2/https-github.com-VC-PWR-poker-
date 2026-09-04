// The 777 slot machine side game. Same spirit as wheel.js: odds/weights are
// server-only, the client only ever learns which symbols it landed on and
// what that paid — so results can't be gamed from the browser.
//
// Payout is always `bet * multiplier`, never a flat amount — betting more
// wins more, betting less risks less. Weights are tuned so cherries turn up
// often (frequent small wins), with three-of-a-kind on the rarer symbols
// paying much bigger, and 777 as the rare, flashy jackpot.
// Seven's weight is deliberately much higher relative to its old value than
// the other symbols — jackpot frequency was the one thing worth buffing on
// its own, so its payout multiplier came down some to compensate (still by
// far the biggest prize on the board) rather than letting the jackpot alone
// push the whole machine's payout ratio over 100%.
const SYMBOLS = [
  { key: 'cherry', emoji: '🍒', label: 'Cherry', weight: 32, tripleMultiplier: 5 },
  { key: 'lemon', emoji: '🍋', label: 'Lemon', weight: 24, tripleMultiplier: 10 },
  { key: 'bell', emoji: '🔔', label: 'Bell', weight: 17, tripleMultiplier: 25 },
  { key: 'star', emoji: '⭐', label: 'Star', weight: 12, tripleMultiplier: 50 },
  { key: 'diamond', emoji: '💎', label: 'Diamond', weight: 7, tripleMultiplier: 100 },
  { key: 'seven', emoji: '7️⃣', label: 'Seven', weight: 8, tripleMultiplier: 250 },
];
const BY_KEY = new Map(SYMBOLS.map((s) => [s.key, s]));

// Landing exactly two cherries (the third reel something else) pays a
// smaller, much more frequent prize — the classic slot-machine "almost"
// that still pays out.
const TWO_CHERRY_MULTIPLIER = 1.5;

function weightedSymbol() {
  const total = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// bet: positive integer chip amount. Returns the three symbols landed on,
// the multiplier that applied (0 for no win), and the resulting payout.
function spin(bet) {
  const reels = [weightedSymbol(), weightedSymbol(), weightedSymbol()];

  let multiplier = 0;
  let win = null;
  if (reels[0].key === reels[1].key && reels[1].key === reels[2].key) {
    multiplier = reels[0].tripleMultiplier;
    win = reels[0].key === 'seven' ? 'jackpot' : 'triple';
  } else {
    const cherries = reels.filter((s) => s.key === 'cherry').length;
    if (cherries === 2) {
      multiplier = TWO_CHERRY_MULTIPLIER;
      win = 'pair';
    }
  }

  const payout = Math.floor(bet * multiplier);
  return {
    reels: reels.map((s) => s.key),
    multiplier,
    win,
    payout,
  };
}

// Same shape as spin(), but always the jackpot — used for the secret "6767"
// code (see server.js's /api/codes/redeem) rather than any real RNG. Reuses
// the seven symbol's own tripleMultiplier so it always matches whatever the
// real jackpot currently pays, even if that multiplier changes later.
function forcedJackpot(bet) {
  const seven = BY_KEY.get('seven');
  return {
    reels: ['seven', 'seven', 'seven'],
    multiplier: seven.tripleMultiplier,
    win: 'jackpot',
    payout: Math.floor(bet * seven.tripleMultiplier),
  };
}

// What the client is allowed to see: the symbol set and what each pays,
// never the weights behind them.
function publicPaytable() {
  return {
    symbols: SYMBOLS.map(({ key, emoji, label, tripleMultiplier }) => ({ key, emoji, label, tripleMultiplier })),
    twoCherryMultiplier: TWO_CHERRY_MULTIPLIER,
  };
}

function symbolEmoji(key) {
  return BY_KEY.get(key)?.emoji || '❔';
}

module.exports = { spin, forcedJackpot, publicPaytable, symbolEmoji };
