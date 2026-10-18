/**
 * tests/reports.test.js
 * Integration tests for submitting and listing reports.
 * (Repeats the manual tests T7 to T14, and adds more.)
 */

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, stopServer, resetData, api, postJson, postRaw, addReport, countReports
} = require('./helpers');
const fx = require('./fixtures');

before(startServer);
after(stopServer);
beforeEach(resetData);

const SEA_POINT = fx.AREAS.SEA_POINT.id;
const GARDENS = fx.AREAS.GARDENS.id;

describe('POST /api/areas/:id/reports (valid reports)', () => {
  // Manual tests T7 and T8, for every row in the fixtures table
  for (const { name, payload, expected } of fx.VALID_REPORTS) {
    test(`saves a valid report: ${name}`, async () => {
      const { status, body } = await postJson(`/api/areas/${SEA_POINT}/reports`, payload);

      assert.equal(status, 201);
      assert.equal(body.areaId, SEA_POINT);
      assert.equal(body.type, expected.type);
      assert.equal(body.description, expected.description);
      assert.equal(typeof body.id, 'number');
      assert.equal(countReports(), 1);
    });
  }

  test('stamps the report with an ISO 8601 UTC time', async () => {
    const { body } = await postJson(`/api/areas/${SEA_POINT}/reports`, { type: 'power' });

    assert.match(body.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('makes the saved report appear in the area list', async () => {
    await postJson(`/api/areas/${SEA_POINT}/reports`, { type: 'water', description: 'Low pressure' });
    const { body } = await api(`/api/areas/${SEA_POINT}/reports`);

    assert.equal(body.length, 1);
    assert.equal(body[0].description, 'Low pressure');
  });
});

describe('POST /api/areas/:id/reports (invalid reports)', () => {
  // Manual tests T10 and T11, for every row in the fixtures table
  for (const { name, payload, error } of fx.INVALID_REPORTS) {
    test(`rejects an invalid report with 400 and saves nothing: ${name}`, async () => {
      const { status, body } = await postJson(`/api/areas/${SEA_POINT}/reports`, payload);

      assert.equal(status, 400);
      assert.equal(body.error, error);
      assert.equal(countReports(), 0);
    });
  }

  // Manual test T13
  test('rejects malformed JSON with 400', async () => {
    const { status, body } = await postRaw(`/api/areas/${SEA_POINT}/reports`, fx.MALFORMED_JSON);

    assert.equal(status, 400);
    assert.equal(body.error, fx.ERRORS.BAD_JSON);
    assert.equal(countReports(), 0);
  });

  test('rejects a request with no body with 400', async () => {
    const { status, body } = await api(`/api/areas/${SEA_POINT}/reports`, { method: 'POST' });

    assert.equal(status, 400);
    assert.equal(body.error, fx.ERRORS.TYPE);
  });

  test('rejects a body over the 100 KB limit with 413', async () => {
    const huge = { type: 'power', description: 'x'.repeat(150000) };
    const { status, body } = await postJson(`/api/areas/${SEA_POINT}/reports`, huge);

    assert.equal(status, 413);
    assert.equal(body.error, fx.ERRORS.TOO_LARGE);
    assert.equal(countReports(), 0);
  });

  // Manual test T12
  test('returns 404 when the area does not exist', async () => {
    const { status, body } = await postJson(`/api/areas/${fx.MISSING_AREA_ID}/reports`, { type: 'power' });

    assert.equal(status, 404);
    assert.equal(body.error, fx.ERRORS.AREA_NOT_FOUND);
    assert.equal(countReports(), 0);
  });

  for (const id of fx.INVALID_AREA_IDS) {
    test(`rejects the invalid id "${id}" with 400`, async () => {
      const { status, body } = await postJson(`/api/areas/${id}/reports`, { type: 'power' });

      assert.equal(status, 400);
      assert.equal(body.error, fx.ERRORS.INVALID_ID);
    });
  }
});

describe('GET /api/areas/:id/reports', () => {
  test('returns an empty list when an area has no reports', async () => {
    const { status, body } = await api(`/api/areas/${SEA_POINT}/reports`);

    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  // Manual test T9
  test('lists the newest report first', async () => {
    addReport(SEA_POINT, 'power', 30, 'oldest');
    addReport(SEA_POINT, 'water', 20, 'middle');
    addReport(SEA_POINT, 'power', 10, 'newest');

    const { body } = await api(`/api/areas/${SEA_POINT}/reports`);

    assert.deepEqual(body.map((report) => report.description), ['newest', 'middle', 'oldest']);
  });

  test('returns only the 20 most recent reports', async () => {
    // report 1 is the oldest (29 minutes ago) and report 25 the newest (5 minutes ago)
    for (let n = 1; n <= 25; n++) {
      addReport(SEA_POINT, 'power', 30 - n, `report ${n}`);
    }

    const { body } = await api(`/api/areas/${SEA_POINT}/reports`);

    assert.equal(body.length, 20);
    assert.equal(body[0].description, 'report 25');
    assert.equal(body[19].description, 'report 6');
  });

  test('keeps reports for different areas separate', async () => {
    addReport(SEA_POINT, 'power', 5, 'sea point report');
    addReport(GARDENS, 'water', 5, 'gardens report');

    const seaPoint = await api(`/api/areas/${SEA_POINT}/reports`);
    const gardens = await api(`/api/areas/${GARDENS}/reports`);

    assert.deepEqual(seaPoint.body.map((report) => report.description), ['sea point report']);
    assert.deepEqual(gardens.body.map((report) => report.description), ['gardens report']);
  });

  // Manual test T14
  test('returns 404 when the area does not exist', async () => {
    const { status, body } = await api(`/api/areas/${fx.MISSING_AREA_ID}/reports`);

    assert.equal(status, 404);
    assert.equal(body.error, fx.ERRORS.AREA_NOT_FOUND);
  });

  for (const id of fx.INVALID_AREA_IDS) {
    test(`rejects the invalid id "${id}" with 400`, async () => {
      const { status, body } = await api(`/api/areas/${id}/reports`);

      assert.equal(status, 400);
      assert.equal(body.error, fx.ERRORS.INVALID_ID);
    });
  }
});