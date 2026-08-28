const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'poker.db'));

// WAL mode is required for Litestream (see server/litestream.yml) to
// replicate this database to off-disk storage — it works by shipping WAL
// frames as they're written, which only exist in this journal mode. It also
// happens to allow readers and writers to work concurrently instead of
// blocking each other, which is a nice side benefit for a busy small app.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('discord', 'guest')),
    discord_id TEXT UNIQUE,
    name TEXT NOT NULL,
    picture TEXT,
    phone TEXT,
    password_hash TEXT,
    chips INTEGER NOT NULL DEFAULT 1000,
    profile_complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const existingColumns = db.prepare("PRAGMA table_info(users)").all();
if (!existingColumns.some((c) => c.name === 'phone')) {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
}
if (!existingColumns.some((c) => c.name === 'password_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
}
if (!existingColumns.some((c) => c.name === 'win_streak')) {
  db.exec('ALTER TABLE users ADD COLUMN win_streak INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'hands_won')) {
  db.exec('ALTER TABLE users ADD COLUMN hands_won INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'hands_played')) {
  db.exec('ALTER TABLE users ADD COLUMN hands_played INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'best_streak')) {
  db.exec('ALTER TABLE users ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'biggest_win')) {
  db.exec('ALTER TABLE users ADD COLUMN biggest_win INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'terms_accepted_at')) {
  db.exec('ALTER TABLE users ADD COLUMN terms_accepted_at TEXT');
}
if (!existingColumns.some((c) => c.name === 'daily_streak')) {
  db.exec('ALTER TABLE users ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0');
}
if (!existingColumns.some((c) => c.name === 'last_daily_at')) {
  db.exec('ALTER TABLE users ADD COLUMN last_daily_at TEXT');
}

// Adding a new auth_type ('google') means loosening the CHECK constraint,
// which SQLite can't do with a plain ALTER — the table has to be rebuilt.
// Guarded on the constraint text itself so this only runs once, the first
// time the server boots against an older database.
const usersTableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
if (usersTableDef && !usersTableDef.sql.includes("'google'")) {
  db.exec('ALTER TABLE users RENAME TO users_old');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      auth_type TEXT NOT NULL CHECK (auth_type IN ('discord', 'google', 'guest')),
      discord_id TEXT UNIQUE,
      google_id TEXT UNIQUE,
      name TEXT NOT NULL,
      picture TEXT,
      phone TEXT,
      password_hash TEXT,
      chips INTEGER NOT NULL DEFAULT 1000,
      profile_complete INTEGER NOT NULL DEFAULT 0,
      win_streak INTEGER NOT NULL DEFAULT 0,
      hands_won INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    INSERT INTO users
      (id, auth_type, discord_id, name, picture, phone, password_hash, chips, profile_complete, win_streak, hands_won, created_at)
    SELECT id, auth_type, discord_id, name, picture, phone, password_hash, chips, profile_complete, win_streak, hands_won, created_at
    FROM users_old
  `);
  db.exec('DROP TABLE users_old');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, achievement_id)
  );
`);

// account names must be unique among password-protected (guest) accounts so
// they can be looked up again at login time. Wrapped because older
// databases may already contain duplicate guest names from before
// passwords existed, which would otherwise prevent the server from booting.
try {
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_name ON users(name COLLATE NOCASE) WHERE auth_type = 'guest'"
  );
} catch (err) {
  console.warn('Could not create unique guest-name index (likely pre-existing duplicate names):', err.message);
}

module.exports = db;
