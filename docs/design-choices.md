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

## API design and validation
- Routes are grouped under `/api/areas/:id/...`, so everything about one area
  (status, reports) lives under that area's URL.
- Every route that takes an area id checks it first (400 if invalid, 404 if the
  area does not exist) before doing any work.
- Report input is validated on the server, whatever the front-end sends: the
  type must be `power` or `water`, and the optional description must be text of
  200 characters or fewer.
- All database queries use prepared statements with `?` placeholders, so user
  input is never placed directly into SQL.
- Errors raised inside the API are returned as JSON with a clear message and an
  appropriate status code. A final error handler reports client mistakes
  (invalid JSON, a body that is too large, a badly encoded URL) as 4xx errors,
  and logs unexpected failures and returns 500. (A URL that does not exist at
  all still gets Express's default "Cannot GET" page.)
- Timestamps are returned in ISO 8601 UTC so the browser can show them in the
  user's local time.

## Active outage detection
- The status route also summarises recent community reports for the area.
- Rule: 3 or more reports of the same type (power or water) within the last 60
  minutes flags an active outage for that type. Power and water are counted
  separately.
- The threshold and time window are constants at the top of `server.js`, so
  they are easy to find and change.
- The count is recalculated from the report timestamps on every request, so a
  flag switches itself off once reports are older than an hour. Nothing has to
  be reset or cleaned up.
- Report times are stored in UTC and compared against UTC in SQL, so time zones
  do not affect the count.
- Known limitation: the app has no user accounts, so one person could submit
  several reports to trigger a flag. User accounts and rate limiting are outside
  the scope of this project, and would be the next step for a real deployment.

## Front-end design
- The front-end is one page (`public/index.html`) and one JavaScript file
  (`public/js/app.js`), with no framework and no build step. Opening the
  server's address is all that is needed to use it.
- The page never reloads. JavaScript calls the API with `fetch()` and updates
  the page. The two main dynamic interactions are: (1) choosing an area loads its
  status and reports, and (2) submitting the form sends the report with a
  `POST` and then refreshes the page with the new data.
- Sections that depend on an area stay hidden until one is chosen.
- Text from the API is always added to the page with `textContent`, never
  `innerHTML`, so a report description cannot inject HTML or scripts.
- Error messages from the back-end are shown to the user, and a friendly
  message is shown if the server cannot be reached.
- While a report is being sent, the submit button and the area dropdown are
  disabled, so a report cannot be sent twice by accident or end up on screen
  under the wrong area.
- If the user switches area while data is still loading, the late response is
  ignored, so the page never shows data for the wrong area.
- The chosen area refreshes every 60 seconds, so reports from other people
  appear without reloading the page.
- Report times are shown as "5 min ago". The exact local time shows when hovering
  over it. The back-end sends UTC timestamps, and the browser converts them to
  local time.