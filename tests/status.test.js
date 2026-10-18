/**
 * tests/status.test.js
 * Integration tests for the health, areas and area status routes.
 * (Repeats the manual tests T1 to T6, and adds more.)
 */

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, resetData, setStage, api } = require('./helpers');
const fx = require('./fixtures');

before(startServer);
after(stopServer);
beforeEach(resetData);

describe('GET /api/health', () => {
  test('reports that the server is running', async () => {
    const { status, body } = await api('/api/health');

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });
});

describe('GET /api/areas', () => {
  test('returns the 10 areas, sorted A-Z', async () => {
    const { status, body } = await api('/api/areas');

    assert.equal(status, 200);
    assert.deepEqual(body.map((area) => area.name), fx.AREA_NAMES_A_TO_Z);
  });

  test('gives every area a numeric id', async () => {
    const { body } = await api('/api/areas');

    for (const area of body) {
      assert.equal(typeof area.id, 'number');
    }
  });
});

describe('GET /api/areas/:id/status', () => {
  // Manual test T1
  test('returns the area, stage and schedule for Sea Point at Stage 2', async () => {
    const { status, body } = await api(`/api/areas/${fx.AREAS.SEA_POINT.id}/status`);

    assert.equal(status, 200);
    assert.deepEqual(body.area, fx.AREAS.SEA_POINT);
    assert.equal(body.stage, 2);
    assert.equal(body.loadSheddingActive, true);
    assert.deepEqual(body.schedule, [
      { day: 'Monday', startTime: '08:00', endTime: '10:30', minStage: 1 },
      { day: 'Wednesday', startTime: '16:00', endTime: '18:30', minStage: 2 }
    ]);
  });

  test('includes the community report summary', async () => {
    const { body } = await api(`/api/areas/${fx.AREAS.SEA_POINT.id}/status`);

    assert.equal(body.communityReports.windowMinutes, 60);
    assert.equal(body.communityReports.threshold, 3);
    assert.deepEqual(body.communityReports.power, { count: 0, activeOutage: false });
    assert.deepEqual(body.communityReports.water, { count: 0, activeOutage: false });
  });

  // Manual tests T4 and T5, for every stage in the fixtures table
  for (const { stage, slots } of fx.SEA_POINT_SLOTS_BY_STAGE) {
    test(`shows ${slots} slot(s) for Sea Point at Stage ${stage}`, async () => {
      setStage(stage);
      const { body } = await api(`/api/areas/${fx.AREAS.SEA_POINT.id}/status`);

      assert.equal(body.stage, stage);
      assert.equal(body.loadSheddingActive, stage > 0);
      assert.equal(body.schedule.length, slots);

      // Every slot shown must apply at this stage
      for (const slot of body.schedule) {
        assert.ok(slot.minStage <= stage);
      }
    });
  }

  // Manual test T4
  test('sorts the slots Monday to Sunday, not alphabetically', async () => {
    setStage(4);
    const { body } = await api(`/api/areas/${fx.AREAS.WOODSTOCK.id}/status`);

    assert.deepEqual(
      body.schedule.map((slot) => slot.day),
      ['Monday', 'Wednesday', 'Friday', 'Sunday']
    );
  });

  test('gives each area its own schedule', async () => {
    const seaPoint = await api(`/api/areas/${fx.AREAS.SEA_POINT.id}/status`);
    const gardens = await api(`/api/areas/${fx.AREAS.GARDENS.id}/status`);

    assert.equal(gardens.body.area.name, 'Gardens');
    assert.notDeepEqual(gardens.body.schedule, seaPoint.body.schedule);
  });

  // Manual tests T3 and T6, for every id in the fixtures table
  for (const id of fx.INVALID_AREA_IDS) {
    test(`rejects the invalid id "${id}" with 400`, async () => {
      const { status, body } = await api(`/api/areas/${id}/status`);

      assert.equal(status, 400);
      assert.equal(body.error, fx.ERRORS.INVALID_ID);
    });
  }

  // Manual test T2
  test('returns 404 for an area that does not exist', async () => {
    const { status, body } = await api(`/api/areas/${fx.MISSING_AREA_ID}/status`);

    assert.equal(status, 404);
    assert.equal(body.error, fx.ERRORS.AREA_NOT_FOUND);
  });

  test('reports a badly encoded URL as a 400 client error, not a server error', async () => {
    const { status, body } = await api('/api/areas/%/status');

    assert.equal(status, 400);
    assert.equal(body.error, fx.ERRORS.INVALID_REQUEST);
  });
});