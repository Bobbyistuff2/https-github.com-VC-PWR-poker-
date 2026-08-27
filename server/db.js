const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'poker.db'));

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
