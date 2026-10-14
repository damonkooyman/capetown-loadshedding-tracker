/**
 * public/js/app.js
 * Front-end logic for the Cape Town Load Shedding & Water Alert Tracker.
 *
 * What this file does:
 *  1. Loads the list of areas from the back-end and fills the dropdown.
 *  2. When the user picks an area, fetches that area's status and recent
 *     reports and shows them on the page.             (dynamic interaction 1)
 *  3. When the user submits the report form, sends the report to the back-end
 *     and refreshes the page with the new data.        (dynamic interaction 2)
 *  4. Refreshes the selected area's data every minute.
 *
 * All data comes from the back-end API (see docs/api.md). Text that comes from
 * the API is always inserted with textContent, never innerHTML, so a report
 * description can never inject HTML or scripts into the page.
 */

// --- Settings ---

// How often (in milliseconds) the selected area is refreshed automatically
const REFRESH_INTERVAL_MS = 60 * 1000;

// Friendly names for the two report types used by the API
const TYPE_LABELS = { power: 'Power', water: 'Water' };

// --- Page elements (looked up once, then reused) ---

const areaSelect = document.getElementById('area-select');
const pageMessage = document.getElementById('page-message');

const statusSection = document.getElementById('status-section');
const areaName = document.getElementById('area-name');
const stageText = document.getElementById('stage-text');
const scheduleTable = document.getElementById('schedule-table');
const scheduleBody = document.getElementById('schedule-body');
const noSchedule = document.getElementById('no-schedule');
const communityList = document.getElementById('community-list');

const reportSection = document.getElementById('report-section');
const reportForm = document.getElementById('report-form');
const reportType = document.getElementById('report-type');
const reportDescription = document.getElementById('report-description');
const reportButton = document.getElementById('report-button');
const formMessage = document.getElementById('form-message');

const reportsSection = document.getElementById('reports-section');
const reportsList = document.getElementById('reports-list');
const noReports = document.getElementById('no-reports');

// --- Small helper functions ---

/**
 * Shows (or clears) a message in one of the message paragraphs.
 * @param {HTMLElement} element - the paragraph to use
 * @param {string} text - the message; an empty string hides the paragraph
 * @param {boolean} [isError=false] - marks the message as an error
 */
function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.hidden = text === '';
  element.classList.toggle('error', isError);
}

/**
 * Shows or hides the three sections that depend on a chosen area.
 * @param {boolean} visible
 */
function setAreaSectionsVisible(visible) {
  statusSection.hidden = !visible;
  reportSection.hidden = !visible;
  reportsSection.hidden = !visible;
}

/**
 * Returns "report" or "reports" depending on the count.
 * @param {number} count
 * @returns {string}
 */
function reportWord(count) {
  return count === 1 ? 'report' : 'reports';
}

/**
 * Turns an ISO timestamp from the API into friendly text such as "5 min ago".
 * Older than a day, it shows the full local date and time instead.
 * @param {string} isoString - e.g. "2026-01-01T12:00:00Z"
 * @returns {string}
 */
function timeAgo(isoString) {
  const minutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatFullTime(isoString);
}

/**
 * Formats an ISO timestamp as a full date and time in the user's local time.
 * @param {string} isoString
 * @returns {string}
 */
function formatFullTime(isoString) {
  return new Date(isoString).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// --- Talking to the back-end ---

/**
 * Sends a request to the back-end and returns the JSON it replies with.
 * Throws an Error with a readable message if the server cannot be reached or
 * replies with an error (the back-end sends { "error": "..." } for those).
 * @param {string} url - e.g. "/api/areas"
 * @param {object} [options] - fetch options (method, headers, body)
 * @returns {Promise<any>} the parsed JSON
 */
async function fetchJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error('Could not reach the server. Please check that it is running and try again.');
  }

  // Read the JSON body (it can be missing, so a failure here is not fatal)
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : `Request failed (status ${response.status})`;
    throw new Error(message);
  }
  return data;
}

// --- Showing data on the page ---

/**
 * Fills the status section: area name, stage, schedule and community reports.
 * @param {object} status - the response from GET /api/areas/:id/status
 */
function renderStatus(status) {
  areaName.textContent = status.area.name;

  // Current load shedding stage
  stageText.textContent = status.loadSheddingActive
    ? `Current stage: Stage ${status.stage}`
    : 'Stage 0: there is no load shedding at the moment.';

  // Schedule table: one row per slot
  scheduleBody.replaceChildren();
  for (const slot of status.schedule) {
    const row = document.createElement('tr');
    for (const text of [slot.day, slot.startTime, slot.endTime]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }
    scheduleBody.append(row);
  }
  const hasSchedule = status.schedule.length > 0;
  scheduleTable.hidden = !hasSchedule;
  noSchedule.hidden = hasSchedule;

  // Community reports: one line each for power and water
  const community = status.communityReports;
  communityList.replaceChildren();
  for (const type of ['power', 'water']) {
    const info = community[type];
    const item = document.createElement('li');
    const label = TYPE_LABELS[type];
    const counted = `${info.count} ${reportWord(info.count)} in the last ${community.windowMinutes} minutes`;

    if (info.activeOutage) {
      item.textContent = `${label}: ACTIVE OUTAGE - ${counted}`;
      item.classList.add('active');
    } else {
      item.textContent = `${label}: no active outage - ${counted} (${community.threshold} needed)`;
    }
    communityList.append(item);
  }
}

/**
 * Fills the "Recent reports" list.
 * @param {object[]} reports - the response from GET /api/areas/:id/reports
 */
function renderReports(reports) {
  reportsList.replaceChildren();

  for (const report of reports) {
    const item = document.createElement('li');

    const type = document.createElement('strong');
    type.textContent = report.type === 'power' ? 'Power outage' : 'Water disruption';

    const time = document.createElement('time');
    time.dateTime = report.createdAt;
    time.title = formatFullTime(report.createdAt);
    time.textContent = ` - ${timeAgo(report.createdAt)}`;

    item.append(type, time);

    // The description is optional (the API sends null when there is none)
    if (report.description) {
      const description = document.createElement('p');
      description.textContent = report.description;
      item.append(description);
    }
    reportsList.append(item);
  }

  noReports.hidden = reports.length > 0;
}

// --- Loading data (dynamic interaction 1) ---

/**
 * Loads the list of areas and fills the dropdown.
 */
async function loadAreas() {
  try {
    const areas = await fetchJson('/api/areas');
    areaSelect.replaceChildren(new Option('Choose an area...', ''));
    for (const area of areas) {
      areaSelect.add(new Option(area.name, area.id));
    }
    showMessage(pageMessage, '');
  } catch (error) {
    areaSelect.replaceChildren(new Option('Areas could not be loaded', ''));
    showMessage(pageMessage, error.message, true);
  }
}

/**
 * Fetches the status and recent reports for one area and shows them.
 * @param {string} areaId - the id of the chosen area
 * @param {boolean} showLoading - show a "Loading..." message while waiting
 */
async function loadAreaData(areaId, showLoading) {
  if (showLoading) {
    showMessage(pageMessage, 'Loading...');
  }

  try {
    // Ask the back-end for the status and the reports at the same time
    const [status, reports] = await Promise.all([
      fetchJson(`/api/areas/${areaId}/status`),
      fetchJson(`/api/areas/${areaId}/reports`)
    ]);

    // The user may have chosen a different area while we were waiting
    if (areaSelect.value !== String(areaId)) {
      return;
    }

    renderStatus(status);
    renderReports(reports);
    setAreaSectionsVisible(true);
    showMessage(pageMessage, '');
  } catch (error) {
    if (areaSelect.value === String(areaId)) {
      showMessage(pageMessage, error.message, true);
    }
  }
}

/**
 * Runs when the user picks an area from the dropdown.
 */
function handleAreaChange() {
  const areaId = areaSelect.value;

  // Clear anything left over from the previous area
  showMessage(formMessage, '');
  setAreaSectionsVisible(false);

  if (areaId === '') {
    showMessage(pageMessage, '');
    return;
  }
  loadAreaData(areaId, true);
}

// --- Sending a report (dynamic interaction 2) ---

/**
 * Runs when the user submits the report form. Sends the report to the back-end,
 * then reloads the area so the new report and counts appear straight away.
 * @param {SubmitEvent} event
 */
async function handleReportSubmit(event) {
  // Stop the browser from reloading the page when the form is submitted
  event.preventDefault();

  const areaId = areaSelect.value;
  if (areaId === '') {
    return;
  }

  // While the report is being sent, disable the button (so it cannot be sent
  // twice by accident) and the area dropdown (so the user cannot switch area
  // before the report has been saved)
  reportButton.disabled = true;
  areaSelect.disabled = true;
  showMessage(formMessage, '');

  try {
    await fetchJson(`/api/areas/${areaId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: reportType.value,
        description: reportDescription.value
      })
    });

    reportForm.reset();
    showMessage(formMessage, 'Thank you! Your report has been saved.');
    await loadAreaData(areaId, false);
  } catch (error) {
    showMessage(formMessage, error.message, true);
  } finally {
    reportButton.disabled = false;
    areaSelect.disabled = false;
  }
}

// --- Start the page ---

areaSelect.addEventListener('change', handleAreaChange);
reportForm.addEventListener('submit', handleReportSubmit);

loadAreas();

// Keep the chosen area up to date without the user reloading the page
setInterval(() => {
  if (areaSelect.value !== '') {
    loadAreaData(areaSelect.value, false);
  }
}, REFRESH_INTERVAL_MS);