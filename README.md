# Cape Town Load Shedding & Water Alert Tracker

A web application where Cape Town residents can check load shedding information
for their area, see what their neighbours are reporting, and report power or
water problems themselves.

> **Please note:** the load shedding schedule in this project is **simulated
> sample data**, not the official City of Cape Town schedule. No external APIs
> are used, so **no API keys, accounts or credentials are needed** to run it.

## What it does

- **Pick an area** from 10 Cape Town suburbs.
- **See the load shedding stage and schedule** for that area. A schedule slot
  is shown when the current stage is high enough for it.
- **See community reports.** Power and water reports from the last 60 minutes
  are counted, and an area is flagged with an **active outage** when 3 or more
  reports of the same type arrive within that hour.
- **Report a problem** (power or water, with an optional description of up to
  200 characters). The report is saved and shown straight away.
- **Read recent reports** for the area, newest first. The page refreshes itself
  every minute.
- **Use it on any device.** The layout adapts to phones, tablets and desktops.

## Technology

| Part | Technology |
| --- | --- |
| Front-end | HTML, CSS and vanilla JavaScript (no framework), using `fetch()` to talk to the back-end |
| Back-end | Node.js with Express |
| Database | SQLite, through the `better-sqlite3` library |
| Tests | Node's built-in test runner (`node:test`) |

The reasons for these choices are explained in
[docs/design-choices.md](docs/design-choices.md).

## Requirements

- **Node.js 20 or newer**, which includes npm. The project was built and tested
  with Node.js 24 (LTS). Check your version with `node -v`.
- A modern web browser (Chrome, Safari, Firefox or Edge).
- **Git**, only if you want to clone the repository.

## Installation

1. Get the code. Either clone the repository:

```bash
   git clone https://github.com/damonkooyman/capetown-loadshedding-tracker.git
   cd capetown-loadshedding-tracker
```

   or unzip the submitted folder and open a terminal inside it.

2. Install the dependencies:

```bash
   npm install
```

3. Start the server:

```bash
   npm start
```

4. Open <http://localhost:3000> in your web browser.

The database file (`db/loadshedding.db`) is **created and filled with sample
data automatically** the first time the server starts, so there is nothing else
to set up. Stop the server with `Ctrl + C`.

To use a different port, set the `PORT` environment variable, for example
`PORT=4000 npm start` on macOS or Linux, or `$env:PORT=4000; npm start` in
Windows PowerShell.

## Running the automated tests

```bash
npm test
```

The tests (unit and integration) start the app with a temporary in-memory
database, so they never change your real data. The test cases are described in
[docs/manual-tests.md](docs/manual-tests.md), and the test data is in
`tests/fixtures.js`.

## Trying different load shedding stages

The app has no screen for changing the stage, because in real life it would come
from an official source. To try the other stages, use the helper script. It works
while the server is running. Stage 0 means no load shedding, and the highest
stage is 8.

```bash
npm run set-stage -- 4
```

Reload the page and choose an area to see the schedule change. The default stage
is 2.

To start again with fresh sample data, stop the server, delete
`db/loadshedding.db`, and start the server again.

## Project structure

```text
capetown-loadshedding-tracker/
├── server.js            Express server and API routes
├── package.json         Dependencies and npm scripts
├── package-lock.json    Exact dependency versions
├── CHANGES.md           Changes compared with the Phase 1 proposal
├── README.md            This file
├── db/
│   ├── database.js      Opens SQLite, creates the tables, adds sample data
│   ├── seed.js          The sample areas and schedule
│   └── loadshedding.db  Created automatically on first run (not in Git)
├── public/              The front-end, served by the server
│   ├── index.html       The page
│   ├── css/style.css    Responsive styles
│   └── js/app.js        Page logic, using fetch()
├── scripts/
│   └── set-stage.js     Helper to change the load shedding stage
├── tests/               Automated tests and test data
│   ├── fixtures.js      Test data
│   ├── helpers.js       Shared test set-up
│   └── *.test.js        Unit and integration tests
└── docs/
    ├── design-choices.md
    ├── api.md
    └── manual-tests.md
```

## API

The back-end offers a small JSON API. Full details are in
[docs/api.md](docs/api.md).

| Method and route | Purpose |
| --- | --- |
| `GET /api/health` | Check that the server is running |
| `GET /api/areas` | List all areas |
| `GET /api/areas/:id/status` | Stage, schedule and community report summary for an area |
| `GET /api/areas/:id/reports` | The 20 most recent reports for an area |
| `POST /api/areas/:id/reports` | Save a new report for an area |

## Documentation

- [docs/design-choices.md](docs/design-choices.md): the technology choices and
  the reasons for them
- [docs/api.md](docs/api.md): the API reference
- [docs/manual-tests.md](docs/manual-tests.md): the manual and automated test
  cases
- [CHANGES.md](CHANGES.md): what changed compared with the Phase 1 proposal
- Every source file starts with a comment explaining what it does, and the
  functions are commented too.

## Troubleshooting

- **`npm install` fails while building `better-sqlite3`.** It normally installs a
  ready-made binary. If your system has none, it compiles one, which needs build
  tools. On macOS run `xcode-select --install`. On Windows install the Visual
  Studio Build Tools (C++) and Python. On Linux install `build-essential` and
  `python3`. Then run `npm install` again.
- **"Port 3000 is already in use".** Another program, or an earlier copy of this
  server, is using the port. Stop it, or use a different port (see above).
- **The page looks out of date.** Do a hard refresh: `Cmd + Shift + R` on a Mac
  or `Ctrl + Shift + R` elsewhere.
- **The page says it could not reach the server.** Check that `npm start` is
  still running in a terminal.

## About

A student project: a web application built in phases (concept, development
and presentation).