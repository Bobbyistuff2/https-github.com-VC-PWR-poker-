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

app.get('/api/achievements', requireAuth, (req, res) => {
  res.json({ achievements: achievements.listForUser(req.session.userId) });
});

app.get('/api/wheel', requireAuth, (req, res) => {
  res.json({ tiers: wheel.publicTiers() });
});

app.post('/api/wheel/spin', requireAuth, (req, res) => {
  const { tier } = req.body;
  const config = wheel.TIERS[tier];
  if (!config) return res.status(400).json({ error: 'Unknown wheel' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (user.chips < config.cost) return res.status(400).json({ error: 'Not enough chips for this wheel' });

  const result = wheel.spin(tier);
  const chips = user.chips - config.cost + result.prize;
  db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(chips, user.id);
  res.json({ index: result.index, prize: result.prize, chips, segments: config.segments });
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, name, picture, chips, hands_won FROM users').all();
  const ranked = rows
    .map((u) => ({
      id: u.id,
      name: u.name,
      picture: u.picture,
      chips: u.chips,
      handsWon: u.hands_won,
      rank: ranks.getRank({ chips: u.chips, handsWon: u.hands_won }),
    }))
    .sort((a, b) => b.rank.score - a.rank.score)
    .map((entry, i) => ({ ...entry, position: i + 1 }));

  const top = ranked.slice(0, 50);
  const me = ranked.find((entry) => entry.id === req.session.userId) || null;
  res.json({ leaderboard: top, me });
});

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    picture: user.picture,
    chips: user.chips,
    profileComplete: !!user.profile_complete,
    rank: ranks.getRank({ chips: user.chips, handsWon: user.hands_won }),
  };
}

const wrapMiddleware = (middleware) => (socket, next) => middleware(socket.request, {}, next);
io.use(wrapMiddleware(sessionMiddleware));

io.on('connection', (socket) => {
  registerPokerHandlers(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
