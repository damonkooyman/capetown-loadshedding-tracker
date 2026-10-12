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

const app = express();

// Use port 3000 unless the environment provides a different one
const PORT = process.env.PORT || 3000;

// --- Middleware ---

// Allows the server to read JSON sent from the front-end (used later for reports)
app.use(express.json());

// Serves everything inside /public (index.html, CSS, JS) as static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Simple health check route to confirm the back-end is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    time: new Date().toISOString()
  });
});

// --- Start the server ---

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});