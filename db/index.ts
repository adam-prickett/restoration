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

// Migrations
const docCols = (db.prepare(`PRAGMA table_info(vehicle_documents)`).all() as { name: string }[]).map(c => c.name)
if (docCols.length && !docCols.includes('title')) {
  db.exec(`ALTER TABLE vehicle_documents ADD COLUMN title TEXT`)
}

const vehicleCols = (db.prepare(`PRAGMA table_info(vehicles)`).all() as { name: string }[]).map(c => c.name)
if (vehicleCols.length && !vehicleCols.includes('budget')) {
  db.exec(`ALTER TABLE vehicles ADD COLUMN budget REAL`)
}
if (vehicleCols.length && !vehicleCols.includes('registration')) {
  db.exec(`ALTER TABLE vehicles ADD COLUMN registration TEXT`)
}
if (vehicleCols.length && !vehicleCols.includes('actual_sale_price')) {
  db.exec(`ALTER TABLE vehicles ADD COLUMN actual_sale_price REAL`)
}
if (vehicleCols.length && !vehicleCols.includes('sold_date')) {
  db.exec(`ALTER TABLE vehicles ADD COLUMN sold_date TEXT`)
}

export default db
