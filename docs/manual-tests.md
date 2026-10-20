# Manual Test Log

Tests run by hand in the browser, with curl and with sqlite3. The API tests T1 to T20 are also repeated as automated tests (see the section near the end).

## Step 4: Area status route

| ID | Test | Input | Expected result | Result |
|----|------|-------|-----------------|--------|
| T1 | Valid area at Stage 2 | GET /api/areas/1/status | 200, Sea Point, stage 2, 2 slots (Monday, Wednesday) | Pass |
| T2 | Area that does not exist | GET /api/areas/999/status | 404, "Area not found" | Pass |
| T3 | Non-numeric id | GET /api/areas/abc/status | 400, "Area id must be a positive whole number" | Pass |
| T4 | Slots sorted by weekday at Stage 4 | GET /api/areas/3/status with stage 4 | 4 slots in order Monday, Wednesday, Friday, Sunday | Pass |
| T5 | No load shedding at Stage 0 | GET /api/areas/1/status with stage 0 | 200, loadSheddingActive false, empty schedule | Pass |
| T6 | Zero and decimal ids | GET /api/areas/0/status and /api/areas/1.5/status | 400, "Area id must be a positive whole number" | Pass |

## Step 5: Report routes

| ID | Test | Input | Expected result | Result |
|----|------|-------|-----------------|--------|
| T7 | Valid power report | POST /api/areas/1/reports with type "power" and a description | 201, saved report returned with id and createdAt | Pass |
| T8 | Water report without description | POST /api/areas/1/reports with type "water" only | 201, description is null | Pass |
| T9 | List reports newest first | GET /api/areas/1/reports after T7 and T8 | 2 reports, water report first | Pass |
| T10 | Invalid report type | POST with type "fire" | 400, type must be "power" or "water" | Pass |
| T11 | Description over 200 characters | POST with a 201-character description | 400, description must be 200 characters or fewer | Pass |
| T12 | Post to area that does not exist | POST /api/areas/999/reports | 404, "Area not found" | Pass |
| T13 | Malformed JSON | POST with body {"type":"power", | 400, "Request body must be valid JSON" | Pass |
| T14 | List reports for area that does not exist | GET /api/areas/999/reports | 404, "Area not found" | Pass |

## Step 6: Active outage detection

| ID | Test | Input | Expected result | Result |
|----|------|-------|-----------------|--------|
| T15 | No reports | GET /api/areas/1/status with no reports | power and water count 0, activeOutage false | Pass |
| T16 | Below threshold | 2 power reports in area 1, then GET status | power count 2, activeOutage false | Pass |
| T17 | Threshold reached | 3rd power report in area 1, then GET status | power count 3, activeOutage true, water false | Pass |
| T18 | Other areas unaffected | GET /api/areas/2/status | counts 0, no flags | Pass |
| T19 | Old reports ignored | 3 water reports 2 hours old in area 2, then GET status | water count 0, activeOutage false | Pass |
| T20 | Recent reports counted, old still ignored | Add 3 water reports 30 minutes old in area 2, then GET status | water count 3 (not 6), activeOutage true | Pass |

## Step 7: Front-end page (in the browser)

| ID | Test | Action | Expected result | Result |
|----|------|--------|-----------------|--------|
| T21 | Page loads and dropdown fills | Open http://localhost:3000 | Dropdown lists the 10 areas A-Z; status, form and reports sections not visible | Pass |
| T22 | Choose an area | Select Sea Point | Heading, Stage 2, schedule (Monday, Wednesday) and community lines shown without reloading | Pass |
| T23 | Area with no reports | Look at Recent reports for Sea Point | "No reports yet for this area." | Pass |
| T24 | Submit a report | Submit a power report with a description | Success message, report at top of list as "just now", power count 1, form cleared | Pass |
| T25 | Outage flag appears | Submit two more power reports | Power line shows ACTIVE OUTAGE with 3 reports; water not flagged | Pass |
| T26 | Switch areas | Select Gardens | Gardens schedule, 0 reports, no outage, no leftover message | Pass |
| T27 | HTML in a description | Submit the text `<b>bold</b> test` | Shown as plain text with visible angle brackets, not bold | Pass |
| T28 | Automatic refresh | Add a report with curl while the page stays open | New report appears within about a minute without reloading | Pass |
| T29 | Server unreachable | Stop the server, then choose a different area | "Could not reach the server" message; page recovers after restart | Pass |

## Step 8: Responsive design (in the browser)

| ID | Test | Action | Expected result | Result |
|----|------|--------|-----------------|--------|
| T30 | Phone width | View at 375px wide | One column of stacked cards, no sideways scrolling, full-width button | Pass |
| T31 | Narrowest phone | View at 320px wide with a long unbroken word in a report | No sideways scrolling; the long word wraps inside its card | Pass |
| T32 | Tablet width | View at 768px wide | One column with more padding, compact button, dropdown not full width | Pass |
| T33 | Desktop width | View at 1280px wide | Two columns: status on the left, form and recent reports on the right | Pass |
| T34 | Colour states | Active outage, successful report, server stopped | Outage line red, success message green, error message red | Pass |
| T35 | Keyboard focus | Press Tab repeatedly | A visible dark orange outline moves through the controls | Pass |

## Automated tests (Step 9)

Run with `npm test`. The tests use Node's built-in test runner, so no extra packages are needed. Integration tests start the real app on a free port with a temporary in-memory database and call it with `fetch()`, so the real database is never touched.

| File | Type | What it covers | Manual tests repeated |
|------|------|----------------|-----------------------|
| tests/database.test.js | Unit | Sample data created on first run; rules enforced by the tables (report type, area must exist, unique area name, automatic timestamp) | none |
| tests/status.test.js | Integration | Health and areas routes; status at every stage; Monday-to-Sunday sorting; invalid ids; unknown area; badly encoded URL | T1 to T6 |
| tests/reports.test.js | Integration | Saving valid reports; every invalid case; malformed JSON; oversized body; newest first; limit of 20; areas kept separate | T7 to T14 |
| tests/outages.test.js | Integration | The threshold of 3; power and water counted separately; areas kept separate; the 60-minute window and its edges; the flag switching itself off | T15 to T20 |

**Test data:** defined in `tests/fixtures.js` as tables (valid reports, invalid reports, invalid ids, stages, outage thresholds). Many tests loop over these tables, so each row is one test case.

**Latest run:** 85 tests, 85 passed, 0 failed.

**Not automated:** the browser behaviour (T21 to T35) and the stage script (T36 and T37) are checked by hand, because they depend on how the page looks and feels, or on typing commands.

## Step 10: Stage script and README

| ID | Test | Action | Expected result | Result |
|----|------|--------|-----------------|--------|
| T36 | Change the stage | Run `npm run set-stage -- 4`, then view Sea Point | "Load shedding stage set to 4." and Sea Point shows Stage 4 with 4 slots | Pass |
| T37 | Bad stage value rejected | Run `npm run set-stage -- 9` | Usage message; the stage does not change | Pass |
| T38 | README displays correctly | Open the README in the Markdown preview | Headings, tables, code blocks and the folder tree display correctly | Pass |