/**
 * tests/fixtures.js
 * The test data ("fixtures") used by the automated tests.
 *
 * Keeping the data here, in one place, means each test file only has to say
 * what it checks. Several tests loop over these tables, so adding a new case
 * is just adding one more row.
 *
 * The areas and schedule come from the sample data in db/seed.js. Every test
 * file gets its own fresh in-memory database, so the real database is never
 * touched.
 */

// --- Areas (ids are the order the areas are added in db/seed.js) ---

const AREAS = {
  SEA_POINT: { id: 1, name: 'Sea Point' },
  GARDENS: { id: 2, name: 'Gardens' },
  WOODSTOCK: { id: 3, name: 'Woodstock' }
};

// All 10 area names, in the A-Z order the API should return them
const AREA_NAMES_A_TO_Z = [
  'Bellville', 'Claremont', 'Constantia', 'Gardens', 'Khayelitsha',
  'Mitchells Plain', 'Observatory', 'Sea Point', 'Table View', 'Woodstock'
];

// An id that is valid but belongs to no area
const MISSING_AREA_ID = 999;

// Ids in the URL that the API must reject with 400
const INVALID_AREA_IDS = ['abc', '0', '-3', '1.5', '1e2', '0x10', '01'];

// --- Load shedding schedule ---

// How many schedule slots Sea Point should show at each load shedding stage.
// A slot applies when the stage is >= its minStage, and Sea Point has 4 slots.
const SEA_POINT_SLOTS_BY_STAGE = [
  { stage: 0, slots: 0 },
  { stage: 1, slots: 1 },
  { stage: 2, slots: 2 },
  { stage: 3, slots: 3 },
  { stage: 4, slots: 4 },
  { stage: 8, slots: 4 }
];

// --- Error messages the API should return ---

const ERRORS = {
  INVALID_ID: 'Area id must be a positive whole number',
  AREA_NOT_FOUND: 'Area not found',
  TYPE: 'Type must be "power" or "water"',
  DESCRIPTION_NOT_TEXT: 'Description must be text',
  DESCRIPTION_TOO_LONG: 'Description must be 200 characters or fewer',
  BAD_JSON: 'Request body must be valid JSON',
  TOO_LARGE: 'Request body is too large',
  INVALID_REQUEST: 'Invalid request'
};

// --- Reports ---

// Reports the API should accept, and what it should save
const VALID_REPORTS = [
  {
    name: 'power report with a description',
    payload: { type: 'power', description: 'Power out since 18:00' },
    expected: { type: 'power', description: 'Power out since 18:00' }
  },
  {
    name: 'water report without a description',
    payload: { type: 'water' },
    expected: { type: 'water', description: null }
  },
  {
    name: 'description of null',
    payload: { type: 'power', description: null },
    expected: { type: 'power', description: null }
  },
  {
    name: 'description of only spaces (saved as null)',
    payload: { type: 'power', description: '   ' },
    expected: { type: 'power', description: null }
  },
  {
    name: 'description with spaces around it (trimmed)',
    payload: { type: 'water', description: '  low pressure  ' },
    expected: { type: 'water', description: 'low pressure' }
  },
  {
    name: 'description of exactly 200 characters',
    payload: { type: 'power', description: 'x'.repeat(200) },
    expected: { type: 'power', description: 'x'.repeat(200) }
  },
  {
    name: 'HTML in the description (saved as plain text)',
    payload: { type: 'power', description: '<b>bold</b> test' },
    expected: { type: 'power', description: '<b>bold</b> test' }
  }
];

// Reports the API must reject with 400, and the error it should give
const INVALID_REPORTS = [
  { name: 'unknown type', payload: { type: 'fire' }, error: ERRORS.TYPE },
  { name: 'missing type', payload: { description: 'no type given' }, error: ERRORS.TYPE },
  { name: 'type in the wrong case', payload: { type: 'Power' }, error: ERRORS.TYPE },
  { name: 'type that is a number', payload: { type: 1 }, error: ERRORS.TYPE },
  { name: 'empty object', payload: {}, error: ERRORS.TYPE },
  { name: 'JSON array instead of an object', payload: [], error: ERRORS.TYPE },
  {
    name: 'description that is a number',
    payload: { type: 'power', description: 123 },
    error: ERRORS.DESCRIPTION_NOT_TEXT
  },
  {
    name: 'description of 201 characters',
    payload: { type: 'power', description: 'x'.repeat(201) },
    error: ERRORS.DESCRIPTION_TOO_LONG
  }
];

// A request body that is not valid JSON (it stops after the comma)
const MALFORMED_JSON = '{"type":"power",';

// --- Active outage detection ---

// How many power reports in the last 10 minutes it takes to flag an outage
// (the threshold is 3)
const OUTAGE_THRESHOLD_CASES = [
  { reports: 0, active: false },
  { reports: 1, active: false },
  { reports: 2, active: false },
  { reports: 3, active: true },
  { reports: 4, active: true },
  { reports: 10, active: true }
];

module.exports = {
  AREAS,
  AREA_NAMES_A_TO_Z,
  MISSING_AREA_ID,
  INVALID_AREA_IDS,
  SEA_POINT_SLOTS_BY_STAGE,
  ERRORS,
  VALID_REPORTS,
  INVALID_REPORTS,
  MALFORMED_JSON,
  OUTAGE_THRESHOLD_CASES
};