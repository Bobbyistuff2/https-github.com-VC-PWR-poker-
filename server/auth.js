const crypto = require('crypto');
const db = require('./db');

const DISCORD_API = 'https://discord.com/api/v10';

function getDiscordAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function exchangeDiscordCode(code) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error('Discord token exchange failed');
  return res.json();
}

async function getDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Discord user');
  return res.json();
}

function avatarUrl(discordUser) {
  if (!discordUser.avatar) {
    const index = Number(BigInt(discordUser.id) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
}

function findOrCreateDiscordUser(discordUser) {
  const existing = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);
  if (existing) {
    db.prepare('UPDATE users SET picture = ? WHERE id = ?').run(avatarUrl(discordUser), existing.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, auth_type, discord_id, name, picture) VALUES (?, ?, ?, ?, ?)'
  ).run(id, 'discord', discordUser.id, discordUser.username, avatarUrl(discordUser));

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function findGuestByName(name) {
  return db.prepare("SELECT * FROM users WHERE auth_type = 'guest' AND name = ? COLLATE NOCASE").get(name);
}

function createGuestUser(name, password, phone) {
  if (findGuestByName(name)) {
    const err = new Error('That name is already taken');
    err.code = 'NAME_TAKEN';
    throw err;
  }
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, auth_type, name, phone, password_hash, profile_complete) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(id, 'guest', name, phone || null, hashPassword(password));
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function loginGuestUser(name, password) {
  const user = findGuestByName(name);
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    const err = new Error('Invalid name or password');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  return user;
}

function updateDisplayName(userId, name) {
  db.prepare('UPDATE users SET name = ?, profile_complete = 1 WHERE id = ?').run(name, userId);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

module.exports = {
  getDiscordAuthUrl,
  exchangeDiscordCode,
  getDiscordUser,
  findOrCreateDiscordUser,
  createGuestUser,
  loginGuestUser,
  updateDisplayName,
};
