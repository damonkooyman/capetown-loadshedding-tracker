# API Reference

The back-end exposes a small JSON API. The front-end calls it using `fetch()`.
Base URL when running locally: `http://localhost:3000`

## GET /api/health
Confirms the server is running.

**Response (200):**
```json
{ "status": "ok", "message": "Server is running", "time": "2026-01-01T12:00:00.000Z" }
```

## GET /api/areas
Returns all Cape Town areas, sorted A-Z. Used to fill the area dropdown.

**Response (200):**
```json
[ { "id": 7, "name": "Bellville" }, { "id": 5, "name": "Claremont" } ]
```

## GET /api/areas/:id/status
Returns the current load shedding stage and the schedule slots that apply to
one area at that stage. A slot applies when the current stage is greater than
or equal to the slot's `minStage`. Slots are sorted Monday to Sunday.

**Example:** `GET /api/areas/1/status`

**Response (200):**
```json
{
  "area": { "id": 1, "name": "Sea Point" },
  "stage": 2,
  "loadSheddingActive": true,
  "schedule": [
    { "day": "Monday", "startTime": "08:00", "endTime": "10:30", "minStage": 1 },
    { "day": "Wednesday", "startTime": "16:00", "endTime": "18:30", "minStage": 2 }
  ]
}
```

**Errors:**
- `400` if `:id` is not a positive whole number made only of digits (for example
  `abc`, `0`, `-3` or `1.5`): `{ "error": "Area id must be a positive whole number" }`
- `404` if no area has that id: `{ "error": "Area not found" }`

*Note: the schedule is simulated sample data, not the official City of Cape Town schedule.*