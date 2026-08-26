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
    chips INTEGER NOT NULL DEFAULT 1000,
    profile_complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const existingColumns = db.prepare("PRAGMA table_info(users)").all();
if (!existingColumns.some((c) => c.name === 'phone')) {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
}

module.exports = db;
