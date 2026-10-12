/**
 * db/seed.js
 * Sample data for the Cape Town Load Shedding & Water Alert Tracker.
 *
 * NOTE: The schedule below is SIMULATED sample data for demonstration only.
 * It is not the official City of Cape Town load shedding schedule.
 *
 * How the schedule works:
 *  - Each area belongs to a schedule group (A, B, C or D).
 *  - Each group has four time slots, each with a "minStage".
 *  - A slot applies when the current load shedding stage is >= its minStage.
 *    Example: at Stage 2, slots with minStage 1 and 2 apply.
 */

// The areas users can choose from, and which sample group each belongs to
const areas = [
  { name: 'Sea Point',       group: 'A' },
  { name: 'Gardens',         group: 'B' },
  { name: 'Woodstock',       group: 'C' },
  { name: 'Observatory',     group: 'D' },
  { name: 'Claremont',       group: 'A' },
  { name: 'Constantia',      group: 'B' },
  { name: 'Bellville',       group: 'C' },
  { name: 'Table View',      group: 'D' },
  { name: 'Khayelitsha',     group: 'A' },
  { name: 'Mitchells Plain', group: 'B' }
];

// Sample time slots for each group
const slotTemplates = {
  A: [
    { day: 'Monday',    start: '08:00', end: '10:30', minStage: 1 },
    { day: 'Wednesday', start: '16:00', end: '18:30', minStage: 2 },
    { day: 'Friday',    start: '20:00', end: '22:30', minStage: 3 },
    { day: 'Saturday',  start: '12:00', end: '14:30', minStage: 4 }
  ],
  B: [
    { day: 'Tuesday',   start: '10:00', end: '12:30', minStage: 1 },
    { day: 'Thursday',  start: '18:00', end: '20:30', minStage: 2 },
    { day: 'Saturday',  start: '06:00', end: '08:30', minStage: 3 },
    { day: 'Sunday',    start: '14:00', end: '16:30', minStage: 4 }
  ],
  C: [
    { day: 'Wednesday', start: '12:00', end: '14:30', minStage: 1 },
    { day: 'Friday',    start: '08:00', end: '10:30', minStage: 2 },
    { day: 'Sunday',    start: '18:00', end: '20:30', minStage: 3 },
    { day: 'Monday',    start: '20:00', end: '22:30', minStage: 4 }
  ],
  D: [
    { day: 'Thursday',  start: '06:00', end: '08:30', minStage: 1 },
    { day: 'Saturday',  start: '16:00', end: '18:30', minStage: 2 },
    { day: 'Monday',    start: '14:00', end: '16:30', minStage: 3 },
    { day: 'Tuesday',   start: '18:00', end: '20:30', minStage: 4 }
  ]
};

/**
 * Fills the database with sample areas, schedule slots and the current stage.
 * @param {Database} db - an open better-sqlite3 database connection
 */
function seedDatabase(db) {
  const insertArea = db.prepare('INSERT INTO areas (name) VALUES (?)');
  const insertSlot = db.prepare(
    `INSERT INTO schedule_slots (area_id, day, start_time, end_time, min_stage)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  // A transaction makes this all-or-nothing: if anything fails, nothing is saved
  const seedAll = db.transaction(() => {
    for (const area of areas) {
      const result = insertArea.run(area.name);
      const areaId = result.lastInsertRowid;

      for (const slot of slotTemplates[area.group]) {
        insertSlot.run(areaId, slot.day, slot.start, slot.end, slot.minStage);
      }
    }

    // Sample current stage (0 = no load shedding)
    insertSetting.run('current_stage', '2');
  });

  seedAll();
}

module.exports = { seedDatabase };