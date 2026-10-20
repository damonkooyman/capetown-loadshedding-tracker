/**
 * db/database.js
 * Opens the SQLite database, creates the tables if they don't exist yet,
 * and fills them with sample data the first time the app runs.
 *
 * Other files use the database with: const db = require('./db/database');
 */

const Database = require('better-sqlite3');
const path = require('path');
const { seedDatabase } = require('./seed');

// The database lives in a single file. Tests can override the location
// (e.g. DB_PATH=:memory:) so they never touch the real data.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'loadshedding.db');
const db = new Database(dbPath);

// Make sure foreign keys are enforced (better-sqlite3 enables this by default;
// setting it explicitly makes the behaviour clear to anyone reading the code)
db.pragma('foreign_keys = ON');

// Create the tables. "IF NOT EXISTS" means this is safe to run on every start.
db.exec(`
  -- The Cape Town areas a user can choose from
  CREATE TABLE IF NOT EXISTS areas (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  -- Sample load shedding times for each area. A slot applies when the current
  -- stage is greater than or equal to its min_stage.
  CREATE TABLE IF NOT EXISTS schedule_slots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id    INTEGER NOT NULL,
    day        TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    min_stage  INTEGER NOT NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id)
  );

  -- Community reports of power or water problems. created_at is set
  -- automatically and is stored in UTC.
  CREATE TABLE IF NOT EXISTS reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id     INTEGER NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('power', 'water')),
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id)
  );

  -- Simple settings. At the moment this only holds 'current_stage'
  -- (0 means no load shedding).
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Only add sample data if the database is brand new (no areas yet)
const areaCount = db.prepare('SELECT COUNT(*) AS count FROM areas').get().count;
if (areaCount === 0) {
  seedDatabase(db);
}

module.exports = db;