# Manual Test Log

Tests run by hand in the browser and with curl. Automated tests are added in a later step.

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