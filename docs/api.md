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

## GET /api/areas/:id/reports
Returns the 20 most recent community reports for one area, newest first.
Timestamps are ISO 8601 in UTC.

**Example:** `GET /api/areas/1/reports`

**Response (200):**
```json
[
  { "id": 2, "areaId": 1, "type": "water", "description": null, "createdAt": "2026-01-01T12:05:00Z" },
  { "id": 1, "areaId": 1, "type": "power", "description": "Power out since 18:00", "createdAt": "2026-01-01T12:00:00Z" }
]
```
An area with no reports returns an empty list: `[]`

**Errors:** `400` for an invalid id and `404` if the area does not exist (same messages as above).

## POST /api/areas/:id/reports
Saves a new report for one area.

**Request body (JSON):**
```json
{ "type": "power", "description": "Power out since 18:00" }
```
- `type` (required): `"power"` or `"water"`
- `description` (optional): text of 200 characters or fewer. Leading and trailing
  spaces are removed, and an empty description is stored as `null`.

**Response (201):** the saved report, in the same format as the list above.

**Errors:**
- `400` invalid area id: `{ "error": "Area id must be a positive whole number" }`
- `404` area not found: `{ "error": "Area not found" }`
- `400` invalid type: `{ "error": "Type must be \"power\" or \"water\"" }`
- `400` description not text: `{ "error": "Description must be text" }`
- `400` description too long: `{ "error": "Description must be 200 characters or fewer" }`
- `400` body is not valid JSON: `{ "error": "Request body must be valid JSON" }`
- `413` body larger than the 100 KB limit: `{ "error": "Request body is too large" }`

## Other errors
- Other client mistakes, such as a badly encoded URL, return their `4xx` status
  with `{ "error": "Invalid request" }`.
- Unexpected server problems return `500` with
  `{ "error": "Something went wrong on the server" }` and are logged by the server.

*Note: the schedule is simulated sample data, not the official City of Cape Town schedule.*