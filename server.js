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

// --- Middleware ---

// Allows the server to read JSON sent from the front-end (used later for reports)
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
 * Returns the load shedding status for one area:
 *  - the area itself
 *  - the current stage
 *  - the scheduled slots that apply at the current stage
 *
 * A slot applies when the current stage is >= the slot's min_stage.
 * Responds with 400 for an invalid id and 404 if the area does not exist.
 */
app.get('/api/areas/:id/status', (req, res) => {
  // Validate the id from the URL. It arrives as text, and must be a whole
  // number made only of digits, starting at 1 or higher (so "abc", "0",
  // "-3" and "1.5" are all rejected).
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Area id must be a positive whole number' });
  }
  const areaId = Number(req.params.id);

  // Make sure the area exists
  const area = db.prepare('SELECT id, name FROM areas WHERE id = ?').get(areaId);
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
    schedule
  });
});

// --- Start the server ---

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});