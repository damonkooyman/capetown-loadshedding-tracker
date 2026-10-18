/**
 * tests/helpers.js
 * Shared set-up for the automated tests.
 *
 *  - Points the app at a temporary in-memory database, so the real database
 *    (db/loadshedding.db) is never read or changed.
 *  - Starts the real Express app on a free port, so tests can call it with
 *    fetch() just like the front-end does.
 *  - Provides small helpers to reset and prepare data.
 *
 * Each test file runs in its own process, so every file gets its own fresh
 * database and its own server.
 */

// This must be set BEFORE the app (and so the database) is loaded
process.env.DB_PATH = ':memory:';

const db = require('../db/database');
const app = require('../server');

// Safety check: these tests delete and add data, so they must never run against
// the real database file. Stop straight away if the in-memory database is not in use.
if (!db.memory) {
  throw new Error('The tests must use the in-memory database (DB_PATH=:memory:)');
}

let server;
let baseUrl;

// --- Starting and stopping the server ---

/** Starts the app on a free port (port 0 means "any free port"). */
function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

/** Stops the app so the test run can finish. */
function stopServer() {
  return new Promise((resolve) => {
    server.close(resolve);
    // Do not wait for idle keep-alive connections left over from fetch()
    server.closeAllConnections();
  });
}

// --- Calling the API ---

/**
 * Sends a request to the app and returns the status code and parsed body.
 * @param {string} path - e.g. "/api/areas"
 * @param {object} [options] - fetch options (method, headers, body)
 * @returns {Promise<{status: number, body: any}>}
 */
async function api(path, options) {
  const response = await fetch(baseUrl + path, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text; // not JSON (for example an HTML error page)
  }
  return { status: response.status, body };
}

/** Sends a POST request with a JSON body. */
function postJson(path, data) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** Sends a POST request with a body exactly as given (used for broken JSON). */
function postRaw(path, rawBody) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody
  });
}

// --- Preparing and checking data ---

/** Sets the current load shedding stage. */
function setStage(stage) {
  db.prepare("UPDATE settings SET value = ? WHERE key = 'current_stage'").run(String(stage));
}

/** Puts the database back to a known state: no reports, Stage 2. */
function resetData() {
  db.exec('DELETE FROM reports');
  setStage(2);
}

/**
 * Adds a report directly to the database, made some minutes ago.
 * (The API always stamps reports with the current time, so this is the only
 * way to test old reports.)
 */
function addReport(areaId, type, minutesAgo = 0, description = 'test report') {
  db.prepare(
    `INSERT INTO reports (area_id, type, description, created_at)
     VALUES (?, ?, ?, datetime('now', ?))`
  ).run(areaId, type, description, `-${minutesAgo} minutes`);
}

/** Adds the same report several times. */
function addReports(count, areaId, type, minutesAgo) {
  for (let i = 0; i < count; i++) {
    addReport(areaId, type, minutesAgo);
  }
}

/** Counts the reports saved in the database. */
function countReports() {
  return db.prepare('SELECT COUNT(*) AS count FROM reports').get().count;
}

module.exports = {
  db,
  startServer,
  stopServer,
  api,
  postJson,
  postRaw,
  setStage,
  resetData,
  addReport,
  addReports,
  countReports
};