const crypto = require('crypto');
const db = require('./db');

const DISCORD_API = 'https://discord.com/api/v10';
// What a brand-new account starts with — passed explicitly on insert rather
// than relying on the users.chips column's schema default, since that
// default only ever applies to a fresh install's CREATE TABLE, not to an
// existing production database.
const STARTING_CHIPS = 12000;
// There is exactly one guest account, ever — everyone who clicks "Continue
// as Guest" lands on this same row (see getOrResetGuestUser below), not a
// fresh one each time. It starts smaller than a real account and resets
// back to this every time someone (re)enters as the guest, so it's always
// a known, predictable amount rather than whatever the last person who
// used it left behind.
const GUEST_NAME = 'Guest';
const GUEST_STARTING_CHIPS = 5000;

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

function discordAvatarUrl(discordUser) {
  if (!discordUser.avatar) {
    const index = Number(BigInt(discordUser.id) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
}

function findOrCreateDiscordUser(discordUser) {
  const existing = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);
  if (existing) {
    db.prepare('UPDATE users SET picture = ? WHERE id = ?').run(discordAvatarUrl(discordUser), existing.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, auth_type, discord_id, name, picture, chips) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, 'discord', discordUser.id, discordUser.username, discordAvatarUrl(discordUser), STARTING_CHIPS);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error('Google token exchange failed');
  return res.json();
}

async function getGoogleUser(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user');
  return res.json();
}

function findOrCreateGoogleUser(googleUser) {
  const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleUser.id);
  if (existing) {
    db.prepare('UPDATE users SET picture = ? WHERE id = ?').run(googleUser.picture || null, existing.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, auth_type, google_id, name, picture, chips) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    'google',
    googleUser.id,
    googleUser.name || googleUser.email || 'Player',
    googleUser.picture || null,
    STARTING_CHIPS
  );

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Finds the one shared guest account, resetting its chips/XP back to the
// starting point every time (so a previous guest's session never carries
// over into the next), or creates it the very first time anyone ever
// clicks "Continue as Guest". profile_complete is set up front — there's
// no name to pick, it's always "Guest" — so this goes straight to the
// lobby, same as a returning signed-in player.
function getOrResetGuestUser() {
  const existing = db.prepare("SELECT * FROM users WHERE auth_type = 'guest'").get();
  if (existing) {
    db.prepare('UPDATE users SET chips = ?, xp = 0 WHERE id = ?').run(GUEST_STARTING_CHIPS, existing.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, auth_type, name, chips, profile_complete) VALUES (?, ?, ?, ?, 1)'
  ).run(id, 'guest', GUEST_NAME, GUEST_STARTING_CHIPS);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
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
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUser,
  findOrCreateGoogleUser,
  getOrResetGuestUser,
  updateDisplayName,
};
