import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(__dirname, "..", "..", "repairdesk.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS repairs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    device        TEXT NOT NULL,
    issue         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'received',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;