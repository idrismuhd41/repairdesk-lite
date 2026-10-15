import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(__dirname, "..", "..", "repairdesk.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

// ---------- Base schema ----------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    shop_name     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expires
    ON sessions(expires_at);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS repairs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER,
    customer_name    TEXT,
    customer_phone   TEXT,
    customer_address TEXT,
    device           TEXT NOT NULL,
    issue            TEXT NOT NULL,
    notes            TEXT,
    status           TEXT NOT NULL DEFAULT 'received',
    cost_labour      REAL,
    cost_parts       REAL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------- Additive migrations for existing DBs ----------

const migrations: string[] = [
  `ALTER TABLE repairs ADD COLUMN customer_phone   TEXT`,
  `ALTER TABLE repairs ADD COLUMN customer_address TEXT`,
  `ALTER TABLE repairs ADD COLUMN notes            TEXT`,
  `ALTER TABLE repairs ADD COLUMN cost_labour      REAL`,
  `ALTER TABLE repairs ADD COLUMN cost_parts       REAL`,
  `ALTER TABLE repairs ADD COLUMN updated_at       TEXT`,
  `ALTER TABLE repairs ADD COLUMN user_id          INTEGER`
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists — ignore
  }
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_repairs_user
    ON repairs(user_id);
`);

// ---------- Cleanup ----------

// Delete any orphaned repairs (no user_id) — this is the clean-slate decision
db.prepare(`DELETE FROM repairs WHERE user_id IS NULL`).run();

// Delete expired sessions occasionally
db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();

export default db;