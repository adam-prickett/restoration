import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'db')
const DB_PATH = path.join(DB_DIR, 'restoration.db')

fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    make                 TEXT NOT NULL,
    model                TEXT NOT NULL,
    year                 INTEGER NOT NULL,
    vin                  TEXT,
    purchase_price       REAL NOT NULL DEFAULT 0,
    estimated_sale_price REAL NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'active',
    notes                TEXT,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS parts_required (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    description    TEXT NOT NULL,
    part_number    TEXT,
    estimated_cost REAL NOT NULL DEFAULT 0,
    notes          TEXT,
    status         TEXT NOT NULL DEFAULT 'needed',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    description   TEXT NOT NULL,
    part_number   TEXT,
    actual_cost   REAL NOT NULL DEFAULT 0,
    vendor        TEXT,
    purchase_date TEXT,
    category      TEXT NOT NULL DEFAULT 'part',
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id  INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    stored_path  TEXT NOT NULL,
    mime_type    TEXT,
    file_size    INTEGER,
    uploaded_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicle_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title       TEXT,
    filename    TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type   TEXT,
    file_size   INTEGER,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Migrations — wrapped in try/catch so they are safe to run multiple times
// (Next.js may bundle db/index.ts into several chunks, each initialising the module)
const migrations = [
  `ALTER TABLE vehicle_documents ADD COLUMN title TEXT`,
  `ALTER TABLE vehicles ADD COLUMN budget REAL`,
  `ALTER TABLE vehicles ADD COLUMN registration TEXT`,
  `ALTER TABLE vehicles ADD COLUMN actual_sale_price REAL`,
  `ALTER TABLE vehicles ADD COLUMN sold_date TEXT`,
]
for (const sql of migrations) {
  try { db.exec(sql) } catch { /* column already exists */ }
}

export default db
