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

## Responsive design
- The stylesheet (`public/css/style.css`) is written "mobile first": the base
  styles are for a phone screen (one column), and media queries add layout
  changes for tablets (600px and wider) and desktops (900px and wider).
- On desktop, CSS Grid places the status on the left and the report form and
  recent reports on the right. On smaller screens everything stacks in one
  column, so nothing needs to scroll sideways.
- The page uses `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  so phones show it at their real width instead of a zoomed-out desktop view.
- Buttons and dropdowns are at least 44px tall, which is comfortable to tap.
  Form fields use a 16px font so iPhones do not zoom in when a field is tapped.
- Long words in report descriptions wrap inside their card instead of
  stretching the page. The grid columns use `minmax(0, ...)` and the wrapping
  rule has a fallback, so this also holds in older browsers.
- Colours are chosen to meet the WCAG AA contrast ratio (4.5:1) for text. They
  are defined once as CSS variables at the top of the stylesheet, so they are
  easy to change.
- Errors are shown in red, success in green and active outages in a highlighted
  red row. Each is also written in words, so the page does not rely on colour
  alone.
- A visible dark orange outline, with enough contrast against the page
  backgrounds, shows keyboard focus. The `hidden` attribute is forced to always
  hide an element, even if another rule sets its display.
- No CSS framework is used, which keeps the project small and easy to read.

## Automated testing
- Tests use Node's built-in test runner (`node:test` and `node:assert`), run with
  `npm test`. No extra packages are needed, which keeps installation simple.
- Integration tests start the real Express app on a free port and call it with
  `fetch()`, the same way the front-end does. Unit tests check the database
  layer directly.
- Tests use a temporary in-memory database (set through the `DB_PATH` setting),
  so the real database is never read or changed. Each test file runs in its
  own process with its own database. Because the tests delete and add data, a
  safety check stops them immediately if the in-memory database is not in use.
- To make this possible, `server.js` exports the app and only starts listening
  when it is run directly (`npm start`).
- Test data ("fixtures") is kept in one file, `tests/fixtures.js`. Tests loop
  over its tables, so adding a case means adding a row.
- Tests also check what must not happen: invalid reports must be rejected and
  must not be saved.
- Old reports, which the API cannot create, are added directly to the test
  database to check the 60-minute outage window and its edges.
- The tests repeat the manual API tests (T1 to T20) and add extra cases. The
  browser behaviour (T21 to T35) is still tested by hand.
- Deliberately breaking the code (for example changing the outage threshold)
  makes the matching tests fail, which shows the tests really protect the logic.

## Changing the stage for demonstrations
- The current load shedding stage is stored in the `settings` table. In a real
  system it would come from an official source, so the app has no screen for
  changing it.
- `npm run set-stage -- <0 to 8>` (`scripts/set-stage.js`) updates the stored
  stage so the different stages can be demonstrated. It checks that the value is
  a whole number from 0 to 8. The server reads the stage on every request, so no
  restart is needed.
- A script was chosen instead of an admin screen to keep the app simple, and
  instead of the `sqlite3` command because that tool is not installed everywhere.

## Installation and documentation
- The README explains the requirements, installation, running, testing, the
  stage script, the project structure, the API and troubleshooting.
- `package.json` records the Node.js version the project needs (`engines`), and
  `package-lock.json` fixes the exact dependency versions, so `npm install`
  gives anyone the same result.
- The database is created and filled automatically on first run, so there is no
  separate set-up step. No external APIs are used, so no keys or credentials are
  needed.
- Every source file starts with a comment explaining its purpose, and functions
  are commented, so another developer can follow the intent and the execution.