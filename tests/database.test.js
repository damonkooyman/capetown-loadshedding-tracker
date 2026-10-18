/**
 * tests/database.test.js
 * Unit tests for the database layer: the sample data created on first run and
 * the rules the tables enforce.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// Use a temporary in-memory database, never the real one
process.env.DB_PATH = ':memory:';
const db = require('../db/database');
const fx = require('./fixtures');

// Safety check: these tests add data, so they must never run against the real
// database file
if (!db.memory) {
  throw new Error('The tests must use the in-memory database (DB_PATH=:memory:)');
}

describe('sample data created on first run', () => {
  test('creates the 10 areas', () => {
    const names = db.prepare('SELECT name FROM areas ORDER BY name').all().map((row) => row.name);

    assert.deepEqual(names, fx.AREA_NAMES_A_TO_Z);
  });

  test('gives every area 4 schedule slots, for stages 1 to 4', () => {
    const areas = db.prepare('SELECT id FROM areas').all();

    for (const area of areas) {
      const stages = db
        .prepare('SELECT min_stage FROM schedule_slots WHERE area_id = ? ORDER BY min_stage')
        .all(area.id)
        .map((row) => row.min_stage);

      assert.deepEqual(stages, [1, 2, 3, 4]);
    }
  });

  test('starts at Stage 2', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'current_stage'").get();

    assert.equal(row.value, '2');
  });

  test('starts with no reports', () => {
    const row = db.prepare('SELECT COUNT(*) AS count FROM reports').get();

    assert.equal(row.count, 0);
  });
});

describe('rules enforced by the tables', () => {
  test('rejects a report type other than power or water', () => {
    assert.throws(() => {
      db.prepare("INSERT INTO reports (area_id, type) VALUES (1, 'fire')").run();
    });
  });

  test('rejects a report for an area that does not exist', () => {
    assert.throws(() => {
      db.prepare("INSERT INTO reports (area_id, type) VALUES (999, 'power')").run();
    });
  });

  test('rejects a second area with the same name', () => {
    assert.throws(() => {
      db.prepare("INSERT INTO areas (name) VALUES ('Sea Point')").run();
    });
  });

  test('fills in the time a report was made automatically', () => {
    db.prepare("INSERT INTO reports (area_id, type) VALUES (1, 'power')").run();
    const row = db.prepare('SELECT created_at FROM reports ORDER BY id DESC LIMIT 1').get();

    assert.match(row.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});