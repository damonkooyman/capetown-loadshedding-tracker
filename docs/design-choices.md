# Design Choices

This document explains the technology decisions made for the Cape Town Load
Shedding & Water Alert Tracker and the reasons behind them.

## Architecture

A two-tier web application: a browser front-end communicates over HTTP with a
Node.js back-end, which stores and retrieves data from a database.

## Front-end: HTML, CSS and vanilla JavaScript
- Matches the project requirement for a JavaScript-driven front-end.
- No framework means fewer moving parts, easier setup and easier code reading.
- The front-end talks to the back-end using the browser's built-in `fetch()`.

## Back-end: Node.js with Express
- Lightweight and quick to set up, with minimal configuration.
- Express makes it simple to define API routes that return or store data.
- Install is just `npm install` followed by `npm start`.

## Database: SQLite (using the better-sqlite3 library)
- File-based, so no separate database server needs to be installed.
- Supports real SQL queries for filtering and counting reports.
- Keeps installation simple for anyone marking or running the project.
- `better-sqlite3` has a simple synchronous API (no callbacks or promises to
  manage), which keeps the back-end code short and easy to read.
- Its installer downloads a ready-made binary for common platforms, so no
  compiler is needed on a recent Node.js LTS release.
- The database file is created and filled with sample data automatically on
  first run, and is excluded from Git.

### Data model
- `areas`: the Cape Town suburbs a user can select.
- `schedule_slots`: sample load shedding times per area. Each slot has a
  `min_stage`, and applies when the current stage is greater than or equal to it.
- `reports`: community reports of power or water outages, with a timestamp.
- `settings`: stores the current load shedding stage.

## External APIs
None are used. Load shedding schedule data is simulated sample data stored in
the app's own database (it is not the official City of Cape Town schedule). This
avoids API keys, rate limits and outside failures, so the project runs reliably
for anyone who installs it.

## Why not Java EE / JSF?
Java EE needs an application server and heavier configuration, which adds setup
risk without adding value for this project's scope.