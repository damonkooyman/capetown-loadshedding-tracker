# Manual Test Log

Tests run by hand in the browser. Automated tests are added in a later step.

## Step 4: Area status route

| ID | Test | Input | Expected result | Result |
|----|------|-------|-----------------|--------|
| T1 | Valid area at Stage 2 | GET /api/areas/1/status | 200, Sea Point, stage 2, 2 slots (Monday, Wednesday) | Pass |
| T2 | Area that does not exist | GET /api/areas/999/status | 404, "Area not found" | Pass |
| T3 | Non-numeric id | GET /api/areas/abc/status | 400, "Area id must be a positive whole number" | Pass |
| T4 | Slots sorted by weekday at Stage 4 | GET /api/areas/3/status with stage 4 | 4 slots in order Monday, Wednesday, Friday, Sunday | Pass |
| T5 | No load shedding at Stage 0 | GET /api/areas/1/status with stage 0 | 200, loadSheddingActive false, empty schedule | Pass |
| T6 | Zero and decimal ids | GET /api/areas/0/status and /api/areas/1.5/status | 400, "Area id must be a positive whole number" | Pass |