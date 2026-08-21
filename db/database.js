const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "g4.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'unused', -- unused | used
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    answers_json TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    suggestion TEXT NOT NULL DEFAULT 'waiting', -- waiting | qualified | rejected (auto suggestion)
    decision TEXT NOT NULL DEFAULT 'waiting',   -- waiting | qualified | rejected (final, set by admin)
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at TEXT,
    FOREIGN KEY (code) REFERENCES codes(code)
  );
`);

module.exports = db;
