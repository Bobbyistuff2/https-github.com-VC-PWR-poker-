require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const {
  getDiscordAuthUrl,
  exchangeDiscordCode,
  getDiscordUser,
  findOrCreateDiscordUser,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUser,
  findOrCreateGoogleUser,
  updateDisplayName,
} = require('./auth');
const db = require('./db');
const { registerPokerHandlers } = require('./poker/sockets');
const achievements = require('./achievements');
const wheel = require('./wheel');
const ranks = require('./ranks');
const hilo = require('./hilo');
const shop = require('./shop');
const codes = require('./codes');
const SqliteSessionStore = require('./sessionStore');

const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

const sessionMiddleware = session({
  // Render's free tier stops the whole process after ~15 min of no traffic
  // and spins up a fresh one on the next request. Without an explicit store
  // here, express-session keeps sessions in that process's RAM (its default
  // MemoryStore) — so every spin-down silently logs everyone out, even
  // though their cookie is still valid. Storing sessions in the same SQLite
  // file as everything else survives that restart.
  store: new SqliteSessionStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax',
    secure: IS_PROD,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
});

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not signed in' });
  next();
}

app.get('/auth/discord', (req, res) => {
  res.redirect(getDiscordAuthUrl());
});

app.get('/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error('Missing code');
    const tokens = await exchangeDiscordCode(code);
    const discordUser = await getDiscordUser(tokens.access_token);
    const user = findOrCreateDiscordUser(discordUser);
    req.session.userId = user.id;
    res.redirect(`${process.env.CLIENT_URL}/${user.profile_complete ? 'lobby' : 'profile'}`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.CLIENT_URL}/?error=discord`);
  }
});

app.get('/auth/google', (req, res) => {
  res.redirect(getGoogleAuthUrl());
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error('Missing code');
    const tokens = await exchangeGoogleCode(code);
    const googleUser = await getGoogleUser(tokens.access_token);
    const user = findOrCreateGoogleUser(googleUser);
    req.session.userId = user.id;
    res.redirect(`${process.env.CLIENT_URL}/${user.profile_complete ? 'lobby' : 'profile'}`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.CLIENT_URL}/?error=google`);
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ user: toPublicUser(user) });
});

app.post('/api/profile', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim() || name.length > 24) {
    return res.status(400).json({ error: 'Name must be 1-24 characters' });
  }
  const user = updateDisplayName(req.session.userId, name.trim());
  res.json({ user: toPublicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/terms/accept', requireAuth, (req, res) => {
  db.prepare("UPDATE users SET terms_accepted_at = datetime('now') WHERE id = ?").run(req.session.userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: toPublicUser(user) });
});

app.get('/api/achievements', requireAuth, (req, res) => {
  res.json({ achievements: achievements.listForUser(req.session.userId) });
});

// Whole-calendar-day (UTC) difference between two dates — used for the
// daily wheel's "claimed today" / streak-continues-vs-resets logic, so it
// doesn't matter what time of day someone claims, only which UTC date.
function utcDaysBetween(a, b) {
  const ms =
    Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) -
    Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round(ms / 86400000);
}

// sqlite's datetime('now') gives 'YYYY-MM-DD HH:MM:SS' (UTC, no offset) —
// not directly Date-parseable, so it needs reshaping into real ISO first.
function parseSqliteDatetime(s) {
  return new Date(s.replace(' ', 'T') + 'Z');
}

function getDailyStatus(user) {
  if (!user.last_daily_at) {
    return { claimedToday: false, canClaim: true, streak: user.daily_streak, streakIfClaimedNow: 1 };
  }
  const daysSince = utcDaysBetween(new Date(), parseSqliteDatetime(user.last_daily_at));
  if (daysSince <= 0) {
    return { claimedToday: true, canClaim: false, streak: user.daily_streak, streakIfClaimedNow: user.daily_streak };
  }
  const streakIfClaimedNow = daysSince === 1 ? user.daily_streak + 1 : 1;
  return { claimedToday: false, canClaim: true, streak: user.daily_streak, streakIfClaimedNow };
}

app.get('/api/wheel', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ tiers: wheel.publicTiers(), daily: getDailyStatus(user) });
});

app.post('/api/wheel/spin', requireAuth, (req, res) => {
  const { tier } = req.body;
  const config = wheel.TIERS[tier];
  if (!config) return res.status(400).json({ error: 'Unknown wheel' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  if (tier === 'daily') {
    const status = getDailyStatus(user);
    if (!status.canClaim) {
      return res.status(400).json({ error: "You already claimed today's daily spin. Come back tomorrow!" });
    }
    const result = wheel.spin('daily');
    const newStreak = status.streakIfClaimedNow;
    const streakBonus = Math.min(newStreak * 5, 50);
    const winnings = result.prize + streakBonus;
    const chips = user.chips + winnings;
    // Wheel wins count toward XP same as poker wins — 1:1 with what was
    // actually won, never subtracted for the cost of playing.
    const xp = user.xp + winnings;
    db.prepare(
      "UPDATE users SET chips = ?, xp = ?, daily_streak = ?, last_daily_at = datetime('now') WHERE id = ?"
    ).run(chips, xp, newStreak, user.id);
    const unlockedAchievement = newStreak === 7 ? achievements.unlock(user.id, 'week_streak') : null;
    return res.json({
      index: result.index,
      prize: result.prize,
      streakBonus,
      streak: newStreak,
      chips,
      segments: config.segments,
      unlockedAchievement,
      rank: ranks.getRank({ xp }),
    });
  }

  if (user.chips < config.cost) return res.status(400).json({ error: 'Not enough chips for this wheel' });

  const result = wheel.spin(tier);
  const chips = user.chips - config.cost + result.prize;
  const xp = user.xp + result.prize;
  db.prepare('UPDATE users SET chips = ?, xp = ? WHERE id = ?').run(chips, xp, user.id);
  res.json({
    index: result.index,
    prize: result.prize,
    chips,
    segments: config.segments,
    rank: ranks.getRank({ xp }),
  });
});

app.get('/api/hilo/state', requireAuth, (req, res) => {
  const round = req.session.hilo;
  if (!round) return res.json({ round: null });
  const odds = hilo.multipliers(round.card.value);
  res.json({
    round: {
      card: round.card,
      wager: round.wager,
      cumulativeMultiplier: round.cumulativeMultiplier,
      potentialPayout: Math.floor(round.wager * round.cumulativeMultiplier),
      higherMultiplier: odds.higher,
      lowerMultiplier: odds.lower,
    },
  });
});

app.post('/api/hilo/start', requireAuth, (req, res) => {
  const { wager } = req.body;
  if (!Number.isInteger(wager) || wager <= 0) return res.status(400).json({ error: 'Invalid wager' });
  if (req.session.hilo) return res.status(400).json({ error: 'A round is already in progress' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (user.chips < wager) return res.status(400).json({ error: 'Not enough chips for that wager' });

  const chips = user.chips - wager;
  db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(chips, user.id);

  const card = hilo.drawCard();
  req.session.hilo = { wager, card, cumulativeMultiplier: 1 };
  const odds = hilo.multipliers(card.value);

  res.json({
    card,
    wager,
    cumulativeMultiplier: 1,
    potentialPayout: wager,
    higherMultiplier: odds.higher,
    lowerMultiplier: odds.lower,
    chips,
  });
});

app.post('/api/hilo/guess', requireAuth, (req, res) => {
  const { direction } = req.body;
  if (direction !== 'higher' && direction !== 'lower') {
    return res.status(400).json({ error: 'Invalid guess' });
  }
  const round = req.session.hilo;
  if (!round) return res.status(400).json({ error: 'No round in progress' });

  const odds = hilo.multipliers(round.card.value);
  const stepMultiplier = direction === 'higher' ? odds.higher : odds.lower;
  if (stepMultiplier == null) {
    return res.status(400).json({ error: `Can't guess ${direction} on that card` });
  }

  const nextCard = hilo.drawCard();
  // A tie counts as a loss either way — you called strictly higher or
  // strictly lower, and the next card was neither.
  const correct =
    nextCard.value !== round.card.value &&
    (direction === 'higher' ? nextCard.value > round.card.value : nextCard.value < round.card.value);

  if (!correct) {
    delete req.session.hilo;
    return res.json({ correct: false, busted: true, card: nextCard, wager: round.wager });
  }

  const cumulativeMultiplier = hilo.round2(round.cumulativeMultiplier * stepMultiplier);
  req.session.hilo = { wager: round.wager, card: nextCard, cumulativeMultiplier };
  const nextOdds = hilo.multipliers(nextCard.value);

  res.json({
    correct: true,
    card: nextCard,
    cumulativeMultiplier,
    potentialPayout: Math.floor(round.wager * cumulativeMultiplier),
    higherMultiplier: nextOdds.higher,
    lowerMultiplier: nextOdds.lower,
  });
});

app.post('/api/hilo/cashout', requireAuth, (req, res) => {
  const round = req.session.hilo;
  if (!round) return res.status(400).json({ error: 'No round in progress' });
  if (round.cumulativeMultiplier <= 1) {
    return res.status(400).json({ error: 'Make at least one correct guess before cashing out' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const payout = Math.floor(round.wager * round.cumulativeMultiplier);
  const chips = user.chips + payout;
  db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(chips, user.id);
  delete req.session.hilo;

  // Hi-Lo winnings are chips-only, no XP — only poker hands and wheel spins
  // count toward rank progress.
  res.json({ chips, payout, rank: ranks.getRank({ xp: user.xp }) });
});

app.get('/api/shop', requireAuth, (req, res) => {
  const owned = new Set(
    db.prepare('SELECT item_id FROM user_items WHERE user_id = ?').all(req.session.userId).map((r) => r.item_id)
  );
  const user = db.prepare('SELECT equipped_background, equipped_card_skin FROM users WHERE id = ?').get(
    req.session.userId
  );
  res.json({
    backgrounds: shop.BACKGROUNDS,
    cardSkins: shop.CARD_SKINS,
    owned: [...owned],
    equippedBackground: user.equipped_background || shop.DEFAULT_BACKGROUND,
    equippedCardSkin: user.equipped_card_skin || shop.DEFAULT_CARD_SKIN,
  });
});

app.post('/api/shop/buy', requireAuth, (req, res) => {
  const { itemId } = req.body;
  const item = shop.getItem(itemId);
  if (!item) return res.status(400).json({ error: 'Unknown item' });
  if (item.price === 0) return res.status(400).json({ error: 'Already own this one' });

  const already = db
    .prepare('SELECT 1 FROM user_items WHERE user_id = ? AND item_id = ?')
    .get(req.session.userId, itemId);
  if (already) return res.status(400).json({ error: 'Already own this item' });

  const user = db.prepare('SELECT chips FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (user.chips < item.price) return res.status(400).json({ error: "You can't afford that yet" });

  const chips = user.chips - item.price;
  db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(chips, req.session.userId);
  db.prepare('INSERT INTO user_items (user_id, item_id) VALUES (?, ?)').run(req.session.userId, itemId);

  res.json({ chips, itemId });
});

app.post('/api/shop/equip', requireAuth, (req, res) => {
  const { itemId } = req.body;
  const item = shop.getItem(itemId);
  if (!item) return res.status(400).json({ error: 'Unknown item' });

  if (item.price > 0) {
    const owns = db
      .prepare('SELECT 1 FROM user_items WHERE user_id = ? AND item_id = ?')
      .get(req.session.userId, itemId);
    if (!owns) return res.status(400).json({ error: "You don't own that item" });
  }

  const column = item.slot === 'background' ? 'equipped_background' : 'equipped_card_skin';
  db.prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).run(itemId, req.session.userId);
  res.json({ itemId, slot: item.slot });
});

app.post('/api/codes/redeem', requireAuth, (req, res) => {
  const raw = (req.body.code || '').trim();
  if (!raw) return res.status(400).json({ error: 'Enter a code' });

  const def = codes.getCode(raw);
  if (!def) return res.status(400).json({ error: "That code isn't valid" });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const normalized = raw.toUpperCase();
  if (!def.repeatable) {
    const already = db
      .prepare('SELECT 1 FROM redeemed_codes WHERE user_id = ? AND code = ?')
      .get(user.id, normalized);
    if (already) return res.status(400).json({ error: "You've already redeemed that code" });
  }

  const chips = user.chips + (def.money || 0);
  const xp = user.xp + (def.xp || 0);
  db.prepare('UPDATE users SET chips = ?, xp = ? WHERE id = ?').run(chips, xp, user.id);
  db.prepare('INSERT INTO redeemed_codes (user_id, code) VALUES (?, ?)').run(user.id, normalized);

  res.json({
    chips,
    moneyGained: def.money || 0,
    xpGained: def.xp || 0,
    rank: ranks.getRank({ xp }),
  });
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
  // Bots are never written to the users table in the first place (they only
  // ever exist as in-memory seats inside a live Room, with a synthetic
  // `bot-<uuid>` id) — this WHERE clause is just a second, explicit
  // guarantee that one can never appear here, not a fix for a real leak.
  const rows = db
    .prepare("SELECT id, name, picture, chips, hands_won, xp FROM users WHERE id NOT LIKE 'bot-%'")
    .all();
  const ranked = rows
    .map((u) => ({
      id: u.id,
      name: u.name,
      picture: u.picture,
      chips: u.chips,
      handsWon: u.hands_won,
      rank: ranks.getRank({ xp: u.xp }),
    }))
    .sort((a, b) => b.rank.score - a.rank.score)
    .map((entry, i) => ({ ...entry, position: i + 1 }));

  const top = ranked.slice(0, 50);
  const me = ranked.find((entry) => entry.id === req.session.userId) || null;
  res.json({ leaderboard: top, me });
});

app.get('/api/stats/:userId', requireAuth, (req, res) => {
  // Same bot-exclusion guarantee as /api/leaderboard — a bot id could never
  // actually reach this table, but a stats lookup should still 404 rather
  // than silently succeed if one is ever passed in.
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND id NOT LIKE 'bot-%'").get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Player not found' });

  const achievementsUnlocked = db
    .prepare('SELECT COUNT(*) as c FROM achievements WHERE user_id = ?')
    .get(user.id).c;

  res.json({
    id: user.id,
    name: user.name,
    picture: user.picture,
    chips: user.chips,
    rank: ranks.getRank({ xp: user.xp }),
    handsPlayed: user.hands_played,
    handsWon: user.hands_won,
    winPct: user.hands_played > 0 ? Math.round((user.hands_won / user.hands_played) * 1000) / 10 : 0,
    currentStreak: user.win_streak,
    bestStreak: user.best_streak,
    biggestWin: user.biggest_win,
    achievementsUnlocked,
    achievementsTotal: achievements.ACHIEVEMENTS.length,
  });
});

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    picture: user.picture,
    chips: user.chips,
    profileComplete: !!user.profile_complete,
    termsAccepted: !!user.terms_accepted_at,
    termsAcceptedAt: user.terms_accepted_at,
    rank: ranks.getRank({ xp: user.xp }),
    equippedBackground: user.equipped_background || shop.DEFAULT_BACKGROUND,
    equippedCardSkin: user.equipped_card_skin || shop.DEFAULT_CARD_SKIN,
  };
}

const wrapMiddleware = (middleware) => (socket, next) => middleware(socket.request, {}, next);
io.use(wrapMiddleware(sessionMiddleware));

io.on('connection', (socket) => {
  registerPokerHandlers(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
