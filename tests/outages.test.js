/**
 * tests/outages.test.js
 * Integration tests for active outage detection: an area is flagged when it
 * has 3 or more reports of the same type in the last 60 minutes.
 * (Repeats the manual tests T15 to T20, and adds more.)
 */

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  db, startServer, stopServer, resetData, api, postJson, addReport, addReports
} = require('./helpers');
const fx = require('./fixtures');

before(startServer);
after(stopServer);
beforeEach(resetData);

const SEA_POINT = fx.AREAS.SEA_POINT.id;
const GARDENS = fx.AREAS.GARDENS.id;

/** Gets the community report summary for an area from the status route. */
async function getCommunityReports(areaId) {
  const { body } = await api(`/api/areas/${areaId}/status`);
  return body.communityReports;
}

describe('active outage detection', () => {
  // Manual test T15
  test('starts with no reports and no outage', async () => {
    const community = await getCommunityReports(SEA_POINT);

    assert.deepEqual(community.power, { count: 0, activeOutage: false });
    assert.deepEqual(community.water, { count: 0, activeOutage: false });
  });

  // Manual tests T16 and T17, for every row in the fixtures table
  for (const { reports, active } of fx.OUTAGE_THRESHOLD_CASES) {
    test(`${reports} power report(s) in the last 10 minutes: outage is ${active ? 'flagged' : 'not flagged'}`, async () => {
      addReports(reports, SEA_POINT, 'power', 10);

      const community = await getCommunityReports(SEA_POINT);

      assert.equal(community.power.count, reports);
      assert.equal(community.power.activeOutage, active);
    });
  }

  test('counts power and water separately', async () => {
    addReports(3, SEA_POINT, 'water', 5);
    addReports(2, SEA_POINT, 'power', 5);

    const community = await getCommunityReports(SEA_POINT);

    assert.deepEqual(community.water, { count: 3, activeOutage: true });
    assert.deepEqual(community.power, { count: 2, activeOutage: false });
  });

  // Manual test T18
  test('does not count reports from other areas', async () => {
    addReports(3, SEA_POINT, 'power', 5);

    const gardens = await getCommunityReports(GARDENS);

    assert.deepEqual(gardens.power, { count: 0, activeOutage: false });
  });

  // Manual test T19
  test('ignores reports that are 2 hours old', async () => {
    addReports(3, GARDENS, 'water', 120);

    const community = await getCommunityReports(GARDENS);

    assert.deepEqual(community.water, { count: 0, activeOutage: false });
  });

  // Manual test T20
  test('counts recent reports but not old ones in the same area', async () => {
    addReports(3, GARDENS, 'water', 120);
    addReports(3, GARDENS, 'water', 30);

    const community = await getCommunityReports(GARDENS);

    assert.deepEqual(community.water, { count: 3, activeOutage: true });
  });

  test('counts a report made 59 minutes ago but not one made 61 minutes ago', async () => {
    addReports(2, SEA_POINT, 'power', 59);
    addReports(5, SEA_POINT, 'power', 61);

    const community = await getCommunityReports(SEA_POINT);

    assert.equal(community.power.count, 2);
    assert.equal(community.power.activeOutage, false);
  });

  test('switches the flag off by itself when the reports get old', async () => {
    addReports(3, SEA_POINT, 'power', 10);
    assert.equal((await getCommunityReports(SEA_POINT)).power.activeOutage, true);

    // Pretend an hour and a half has passed
    db.exec("UPDATE reports SET created_at = datetime('now', '-90 minutes')");

    assert.equal((await getCommunityReports(SEA_POINT)).power.activeOutage, false);
  });

  test('flags an outage after 3 reports are submitted through the API', async () => {
    for (let i = 0; i < 3; i++) {
      const { status } = await postJson(`/api/areas/${SEA_POINT}/reports`, { type: 'power' });
      assert.equal(status, 201);
    }

    const community = await getCommunityReports(SEA_POINT);

    assert.deepEqual(community.power, { count: 3, activeOutage: true });
  });

  test('does not let one old report hide recent ones', async () => {
    addReport(SEA_POINT, 'power', 200);
    addReports(3, SEA_POINT, 'power', 1);

    const community = await getCommunityReports(SEA_POINT);

    assert.equal(community.power.count, 3);
    assert.equal(community.power.activeOutage, true);
  });
});