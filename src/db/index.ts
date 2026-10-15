import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(__dirname, "..", "..", "repairdesk.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

// Base schema — used when the table doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS repairs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
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

// Additive migrations for existing databases
// (safe to run every boot — errors mean "column already exists")
const migrations: string[] = [
  `ALTER TABLE repairs ADD COLUMN customer_phone   TEXT`,
  `ALTER TABLE repairs ADD COLUMN customer_address TEXT`,
  `ALTER TABLE repairs ADD COLUMN notes            TEXT`,
  `ALTER TABLE repairs ADD COLUMN cost_labour      REAL`,
  `ALTER TABLE repairs ADD COLUMN cost_parts       REAL`,
  `ALTER TABLE repairs ADD COLUMN updated_at       TEXT`
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists — ignore
  }
}

export default db;