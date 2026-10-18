/**
 * server.js
 * Entry point for the Cape Town Load Shedding & Water Alert Tracker.
 *
 * Responsibilities:
 *  - Start an Express web server
 *  - Serve the front-end files (HTML/CSS/JS) from the /public folder
 *  - Provide API routes that the front-end calls using fetch()
 */

const express = require('express');
const path = require('path');

// Opens the SQLite database (creating and filling it on first run)
const db = require('./db/database');

const app = express();

// Use port 3000 unless the environment provides a different one
const PORT = process.env.PORT || 3000;

// --- Constants ---

const VALID_REPORT_TYPES = ['power', 'water'];
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_REPORTS_RETURNED = 20;
const INVALID_ID_ERROR = 'Area id must be a positive whole number';

// Active outage rule: an area is flagged when it has at least
// OUTAGE_REPORT_THRESHOLD reports of the same type (power or water)
// made within the last OUTAGE_WINDOW_MINUTES minutes.
const OUTAGE_REPORT_THRESHOLD = 3;
const OUTAGE_WINDOW_MINUTES = 60;

// The report columns we send to the front-end. The timestamp is converted to
// ISO 8601 UTC (e.g. 2026-01-01T12:00:00Z) so the browser can convert it to
// the user's local time. This is a fixed string, never built from user input.
const REPORT_COLUMNS = `
  id,
  area_id AS areaId,
  type,
  description,
  strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS createdAt
`;

// --- Middleware ---

// Allows the server to read JSON sent from the front-end (used for reports)
app.use(express.json());

// Serves everything inside /public (index.html, CSS, JS) as static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper functions ---

/**
 * Reads the current load shedding stage from the settings table.
 * @returns {number} the stage, from 0 (no load shedding) upwards
 */
function getCurrentStage() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'current_stage'").get();
  return Number(row.value);
}

/**
 * Converts an area id from the URL (text) into a number.
 * Only whole numbers of 1 or higher are valid, so "abc", "0", "-3" and "1.5"
 * are all rejected.
 * @param {string} text - the id as it appears in the URL
 * @returns {number|null} the id as a number, or null if it is not valid
 */
function parseAreaId(text) {
  return /^[1-9]\d*$/.test(text) ? Number(text) : null;
}

/**
 * Looks up one area by id.
 * @param {number} areaId
 * @returns {{id: number, name: string}|undefined} the area, or undefined if not found
 */
function findArea(areaId) {
  return db.prepare('SELECT id, name FROM areas WHERE id = ?').get(areaId);
}

/**
 * Summarises the recent community reports for one area.
 *
 * Counts the reports made in the last OUTAGE_WINDOW_MINUTES minutes, separately
 * for power and water. A type is flagged as an active outage when its count
 * reaches OUTAGE_REPORT_THRESHOLD. Because the count only looks at the last
 * hour, a flag switches itself off once the reports become old enough.
 *
 * @param {number} areaId
 * @returns {object} the window, the threshold and a count/flag for each type
 */
function getCommunityReports(areaId) {
  // created_at is stored in UTC, and datetime('now', ...) is also UTC, so the
  // two can be compared directly. The "-60 minutes" modifier is passed as a
  // parameter.
  const rows = db.prepare(`
    SELECT type, COUNT(*) AS count
    FROM reports
    WHERE area_id = ? AND created_at >= datetime('now', ?)
    GROUP BY type
  `).all(areaId, `-${OUTAGE_WINDOW_MINUTES} minutes`);

  // Start both types at 0, then fill in the counts the query found
  const counts = { power: 0, water: 0 };
  for (const row of rows) {
    counts[row.type] = row.count;
  }

  return {
    windowMinutes: OUTAGE_WINDOW_MINUTES,
    threshold: OUTAGE_REPORT_THRESHOLD,
    power: {
      count: counts.power,
      activeOutage: counts.power >= OUTAGE_REPORT_THRESHOLD
    },
    water: {
      count: counts.water,
      activeOutage: counts.water >= OUTAGE_REPORT_THRESHOLD
    }
  };
}

// --- Routes ---

// Simple health check route to confirm the back-end is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    time: new Date().toISOString()
  });
});

// Returns all Cape Town areas, sorted A-Z (used to fill the area dropdown)
app.get('/api/areas', (req, res) => {
  const areas = db.prepare('SELECT id, name FROM areas ORDER BY name').all();
  res.json(areas);
});

/**
 * Returns the status for one area:
 *  - the area itself
 *  - the current load shedding stage and the schedule slots that apply
 *  - a summary of recent community reports, including active outage flags
 *
 * A slot applies when the current stage is >= the slot's min_stage.
 * Responds with 400 for an invalid id and 404 if the area does not exist.
 */
app.get('/api/areas/:id/status', (req, res) => {
  const areaId = parseAreaId(req.params.id);
  if (areaId === null) {
    return res.status(400).json({ error: INVALID_ID_ERROR });
  }

  const area = findArea(areaId);
  if (!area) {
    return res.status(404).json({ error: 'Area not found' });
  }

  const stage = getCurrentStage();

  // Get the slots that apply at this stage. The CASE expression sorts days
  // Monday-Sunday (sorting the day names alphabetically would be wrong).
  const schedule = db.prepare(`
    SELECT day, start_time AS startTime, end_time AS endTime, min_stage AS minStage
    FROM schedule_slots
    WHERE area_id = ? AND min_stage <= ?
    ORDER BY
      CASE day
        WHEN 'Monday'    THEN 1
        WHEN 'Tuesday'   THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday'  THEN 4
        WHEN 'Friday'    THEN 5
        WHEN 'Saturday'  THEN 6
        WHEN 'Sunday'    THEN 7
      END,
      start_time
  `).all(areaId, stage);

  res.json({
    area,
    stage,
    loadSheddingActive: stage > 0,
    schedule,
    communityReports: getCommunityReports(areaId)
  });
});

/**
 * Returns the most recent reports for one area, newest first.
 * Responds with 400 for an invalid id and 404 if the area does not exist.
 */
app.get('/api/areas/:id/reports', (req, res) => {
  const areaId = parseAreaId(req.params.id);
  if (areaId === null) {
    return res.status(400).json({ error: INVALID_ID_ERROR });
  }

  if (!findArea(areaId)) {
    return res.status(404).json({ error: 'Area not found' });
  }

  // Newest first. id is a tie-breaker for reports made in the same second.
  const reports = db.prepare(`
    SELECT ${REPORT_COLUMNS}
    FROM reports
    WHERE area_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(areaId, MAX_REPORTS_RETURNED);

  res.json(reports);
});

/**
 * Saves a new outage/water report for one area.
 * Expects a JSON body: { "type": "power" | "water", "description": "optional text" }
 * Responds with 201 and the saved report, or 400/404 with an error message.
 */
app.post('/api/areas/:id/reports', (req, res) => {
  const areaId = parseAreaId(req.params.id);
  if (areaId === null) {
    return res.status(400).json({ error: INVALID_ID_ERROR });
  }

  if (!findArea(areaId)) {
    return res.status(404).json({ error: 'Area not found' });
  }

  // req.body is undefined when the request has no JSON body, so fall back to {}
  const body = req.body || {};

  // Validate the report type
  if (!VALID_REPORT_TYPES.includes(body.type)) {
    return res.status(400).json({ error: 'Type must be "power" or "water"' });
  }

  // Validate the optional description (stored as NULL when left empty)
  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      return res.status(400).json({ error: 'Description must be text' });
    }
    description = body.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
      });
    }
    if (description === '') {
      description = null;
    }
  }

  // Save the report, then read it back so the response matches the list format
  const result = db
    .prepare('INSERT INTO reports (area_id, type, description) VALUES (?, ?, ?)')
    .run(areaId, body.type, description);

  const report = db
    .prepare(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ?`)
    .get(result.lastInsertRowid);

  res.status(201).json(report);
});

// --- Error handling ---

// Express recognises an error handler by its four parameters, so "next" must
// stay in the list even though we do not use it.
app.use((err, req, res, next) => {
  // Thrown by express.json() when the request body is not valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  // Thrown by express.json() when the request body is over its size limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  // Any other mistake made by the client (for example a badly encoded URL)
  // is reported as a client error, not as a server failure
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'Invalid request' });
  }

  // Anything else is an unexpected server problem: log it and reply with 500
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// --- Start the server ---

// Only start listening when this file is run directly (npm start). When the
// automated tests load this file they start the server themselves, on a free port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;