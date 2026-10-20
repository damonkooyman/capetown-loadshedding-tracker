/**
 * scripts/set-stage.js
 * Changes the current load shedding stage stored in the database.
 *
 * The app has no screen for this, because in real life the stage would come
 * from an official source. This small script lets you (or a marker) try out
 * the different stages.
 *
 * Usage:  npm run set-stage -- 4
 *         (the stage must be a whole number from 0 to 8; 0 means no load shedding)
 *
 * The server reads the stage on every request, so it does not need restarting.
 */

const db = require('../db/database');

const stage = process.argv[2];

// Accept only a single digit from 0 to 8
if (!/^[0-8]$/.test(stage || '')) {
  console.error('Usage: npm run set-stage -- <stage>   (a whole number from 0 to 8)');
  process.exit(1);
}

db.prepare("UPDATE settings SET value = ? WHERE key = 'current_stage'").run(stage);
console.log(`Load shedding stage set to ${stage}.`);