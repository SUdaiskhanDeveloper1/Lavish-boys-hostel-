/**
 * Lavish Boys Hostel — Supabase → Google Sheets sync
 * ===================================================
 *
 * Google Apps Script, bound to the backup spreadsheet. Pulls the six core
 * tables out of Supabase's REST API once a day and mirrors each one into its
 * own tab. One-way: Supabase is the source of truth, the sheet is a replica.
 *
 * Nothing in the React app is involved, so the app bundle never carries a
 * credential. Setup lives in SETUP.md — read that first.
 *
 * Sync mode is full replace: every run clears each tab and rewrites it, so
 * edits and deletions in Supabase are reflected correctly and a failed run
 * never leaves half-written state. Anything you type into a synced tab by hand
 * WILL be overwritten — keep your own notes on a separate tab.
 */

// ── Config ──────────────────────────────────────────────────────────────────

/** Rows per REST request. Supabase caps responses at 1000 by default. */
const PAGE_SIZE = 1000;

/** Hour of day (0–23, spreadsheet timezone) for the daily run. */
const DAILY_HOUR = 2;

/** Tab that records what each run did. Set to null to disable logging. */
const LOG_TAB = 'Sync Log';

/**
 * One entry per synced table.
 *
 * `select` is a PostgREST select string; the embedded lookups (e.g.
 * `rooms(room_number)`) let a tab show "Room 101" instead of a raw uuid.
 * Column `path` is dot-notation into the returned row, so `rooms.room_number`
 * reads the embedded object.
 *
 * Ids are last in every tab: needed for tracing a row back to the app, but
 * not what you want to read first.
 */
const TABLES = [
  {
    table: 'rooms',
    tab: 'Rooms',
    select: '*',
    order: 'room_number.asc',
    columns: [
      { header: 'Room #',        path: 'room_number' },
      { header: 'Floor',         path: 'floor',          type: 'int' },
      { header: 'Type',          path: 'room_type' },
      { header: 'Capacity',      path: 'capacity',       type: 'int' },
      { header: 'Occupied',      path: 'occupied_seats', type: 'int' },
      { header: 'Rent / Month',  path: 'rent_per_month', type: 'money' },
      { header: 'Status',        path: 'status' },
      { header: 'Notes',         path: 'notes' },
      { header: 'Created',       path: 'created_at',     type: 'datetime' },
      { header: 'Updated',       path: 'updated_at',     type: 'datetime' },
      { header: 'ID',            path: 'id' },
    ],
  },
  {
    table: 'students',
    tab: 'Students',
    select: '*,rooms(room_number)',
    order: 'full_name.asc',
    columns: [
      { header: 'Name',              path: 'full_name' },
      { header: "Father's Name",     path: 'father_name' },
      { header: 'CNIC',              path: 'cnic' },
      { header: 'Phone',             path: 'phone' },
      { header: 'Emergency Contact', path: 'emergency_contact' },
      { header: 'Email',             path: 'email' },
      { header: 'Address',           path: 'address' },
      { header: 'Blood Group',       path: 'blood_group' },
      { header: 'Room',              path: 'rooms.room_number' },
      { header: 'Seat',              path: 'seat_number' },
      { header: 'Joining Date',      path: 'joining_date',     type: 'date' },
      { header: 'Leaving Date',      path: 'leaving_date',     type: 'date' },
      { header: 'Monthly Fee',       path: 'monthly_fee',      type: 'money' },
      { header: 'Security Deposit',  path: 'security_deposit', type: 'money' },
      { header: 'Admission Fee',     path: 'admission_fee',    type: 'money' },
      { header: 'Status',            path: 'status' },
      { header: 'Guardian Details',  path: 'guardian_details' },
      { header: 'Medical Notes',     path: 'medical_notes' },
      { header: 'Remarks',           path: 'remarks' },
      { header: 'Documents',         path: 'documents',        type: 'count' },
      { header: 'Created',           path: 'created_at',       type: 'datetime' },
      { header: 'Updated',           path: 'updated_at',       type: 'datetime' },
      { header: 'ID',                path: 'id' },
    ],
  },
  {
    table: 'fee_payments',
    tab: 'Fee Payments',
    select: '*,students(full_name),rooms(room_number)',
    order: 'paid_on.desc',
    columns: [
      { header: 'Receipt #',     path: 'receipt_no' },
      { header: 'Student',       path: 'students.full_name' },
      { header: 'Room',          path: 'rooms.room_number' },
      { header: 'Seat',          path: 'seat_number' },
      { header: 'Fee Month',     path: 'fee_month',     type: 'month' },
      { header: 'Amount',        path: 'amount',        type: 'money' },
      { header: 'Cash',          path: 'cash_amount',   type: 'money' },
      { header: 'Online',        path: 'online_amount', type: 'money' },
      { header: 'Method',        path: 'method' },
      { header: 'Paid On',       path: 'paid_on',       type: 'date' },
      { header: 'Collected By',  path: 'collected_by' },
      { header: 'Notes',         path: 'notes' },
      { header: 'Created',       path: 'created_at',    type: 'datetime' },
      { header: 'Student ID',    path: 'student_id' },
      { header: 'ID',            path: 'id' },
    ],
  },
  {
    table: 'expenses',
    tab: 'Expenses',
    select: '*',
    order: 'spent_on.desc',
    columns: [
      { header: 'Title',       path: 'title' },
      { header: 'Category',    path: 'category' },
      { header: 'Amount',      path: 'amount',   type: 'money' },
      { header: 'Spent On',    path: 'spent_on', type: 'date' },
      { header: 'Paid To',     path: 'paid_to' },
      { header: 'Description', path: 'description' },
      { header: 'Created',     path: 'created_at', type: 'datetime' },
      { header: 'Updated',     path: 'updated_at', type: 'datetime' },
      { header: 'ID',          path: 'id' },
    ],
  },
  {
    table: 'employees',
    tab: 'Employees',
    select: '*',
    order: 'full_name.asc',
    columns: [
      { header: 'Name',         path: 'full_name' },
      { header: 'CNIC',         path: 'cnic' },
      { header: 'Phone',        path: 'phone' },
      { header: 'Designation',  path: 'designation' },
      { header: 'Joining Date', path: 'joining_date', type: 'date' },
      { header: 'Salary',       path: 'salary',       type: 'money' },
      { header: 'Status',       path: 'status' },
      { header: 'Documents',    path: 'documents',    type: 'count' },
      { header: 'Created',      path: 'created_at',   type: 'datetime' },
      { header: 'Updated',      path: 'updated_at',   type: 'datetime' },
      { header: 'ID',           path: 'id' },
    ],
  },
  {
    table: 'employee_payments',
    tab: 'Employee Payments',
    select: '*,employees(full_name)',
    order: 'paid_on.desc',
    columns: [
      { header: 'Employee',    path: 'employees.full_name' },
      { header: 'Type',        path: 'txn_type' },
      { header: 'Amount',      path: 'amount',   type: 'money' },
      { header: 'For Month',   path: 'for_month', type: 'month' },
      { header: 'Paid On',     path: 'paid_on',   type: 'date' },
      { header: 'Notes',       path: 'notes' },
      { header: 'Created',     path: 'created_at', type: 'datetime' },
      { header: 'Employee ID', path: 'employee_id' },
      { header: 'ID',          path: 'id' },
    ],
  },
];

// ── Menu + trigger installation ─────────────────────────────────────────────

/** Adds the manual-run menu. Runs automatically when the sheet is opened. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase')
    .addItem('Sync now', 'syncAll')
    .addSeparator()
    .addItem('Install daily trigger', 'installDailyTrigger')
    .addItem('Remove daily trigger', 'removeDailyTrigger')
    .addItem('Test connection', 'testConnection')
    .addToUi();
}

/**
 * Installs the once-a-day trigger, replacing any previous one.
 *
 * Apps Script happily registers duplicate triggers for the same function, so
 * clearing first is what keeps repeated setup runs from syncing N times a day.
 */
function installDailyTrigger() {
  removeDailyTrigger();
  ScriptApp.newTrigger('syncAll').timeBased().everyDays(1).atHour(DAILY_HOUR).create();
  notify(`Daily sync installed — runs around ${DAILY_HOUR}:00 ${timezone()}.`);
}

function removeDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'syncAll')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

/** Fetches one row from each table so credential problems surface immediately. */
function testConnection() {
  const cfg = getConfig();
  const lines = TABLES.map((def) => {
    try {
      const rows = request(cfg, def.table, def.select, def.order, 1, 0);
      return `OK    ${def.table} (${rows.length ? 'has data' : 'empty'})`;
    } catch (err) {
      return `FAIL  ${def.table}: ${err.message}`;
    }
  });
  notify(`${cfg.url}\n\n${lines.join('\n')}`);
}

// ── Sync ────────────────────────────────────────────────────────────────────

/** Entry point for both the menu item and the daily trigger. */
function syncAll() {
  const started = new Date();
  const cfg = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // One run at a time: a manual "Sync now" landing on top of the scheduled run
  // would have both clearing and rewriting the same tabs.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    throw new Error('Another sync is already running. Try again in a minute.');
  }

  const results = [];
  try {
    TABLES.forEach((def) => {
      try {
        const rows = fetchAll(cfg, def);
        writeTab(ss, def, rows);
        results.push({ tab: def.tab, rows: rows.length, error: null });
      } catch (err) {
        // Keep going: one broken table shouldn't cost you the other five.
        results.push({ tab: def.tab, rows: 0, error: err.message });
      }
    });
  } finally {
    lock.releaseLock();
  }

  logRun(ss, started, results);

  const failed = results.filter((r) => r.error);
  if (failed.length) {
    throw new Error(
      `${failed.length} of ${results.length} tables failed:\n` +
        failed.map((r) => `• ${r.tab}: ${r.error}`).join('\n'),
    );
  }
  return results;
}

/** Pages through a table until a short page says we've reached the end. */
function fetchAll(cfg, def) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const batch = request(cfg, def.table, def.select, def.order, PAGE_SIZE, offset);
    Array.prototype.push.apply(rows, batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

function request(cfg, table, select, order, limit, offset) {
  const url =
    `${cfg.url}/rest/v1/${table}` +
    `?select=${encodeURIComponent(select)}` +
    `&order=${encodeURIComponent(order)}` +
    `&limit=${limit}&offset=${offset}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
    muteHttpExceptions: true,
  });

  const status = res.getResponseCode();
  const body = res.getContentText();
  if (status !== 200) {
    throw new Error(`HTTP ${status} — ${body.slice(0, 300)}`);
  }
  return JSON.parse(body);
}

/** Clears a tab and rewrites it from `rows`, then applies header + formats. */
function writeTab(ss, def, rows) {
  const sheet = ss.getSheetByName(def.tab) || ss.insertSheet(def.tab);
  const headers = def.columns.map((c) => c.header);

  const values = [headers];
  rows.forEach((row) => {
    values.push(def.columns.map((c) => coerce(pluck(row, c.path), c.type)));
  });

  // clear() drops stale rows from a previous, longer run along with formats,
  // which are reapplied below.
  sheet.clear();
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);

  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0E1B33')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  if (rows.length) {
    def.columns.forEach((c, i) => {
      const format = NUMBER_FORMATS[c.type];
      if (format) sheet.getRange(2, i + 1, rows.length, 1).setNumberFormat(format);
    });
    // autoResize walks every cell in the column, so skip it once a tab is big
    // enough for that to dominate the run.
    if (rows.length <= 5000) sheet.autoResizeColumns(1, headers.length);
  }
}

const NUMBER_FORMATS = {
  money: '#,##0.00',
  int: '0',
  date: 'dd/mm/yyyy',
  month: 'mmm yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
};

/**
 * Reads a dot-notation path out of a REST row.
 *
 * PostgREST returns a many-to-one embed as an object, but returns an array when
 * it can't prove the relationship is to-one, so unwrap a single-element array
 * before descending.
 */
function pluck(row, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return null;
    const value = Array.isArray(acc) ? acc[0] : acc;
    return value === null || value === undefined ? null : value[key];
  }, row);
}

function coerce(value, type) {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'money':
    case 'int': {
      const n = Number(value);
      return isNaN(n) ? '' : n;
    }
    case 'date':
    case 'month':
    case 'datetime': {
      const d = new Date(value);
      // Fall back to the raw string rather than writing an invalid date.
      return isNaN(d.getTime()) ? String(value) : d;
    }
    case 'count':
      return Array.isArray(value) ? value.length : value ? 1 : 0;
    default:
      // Objects only reach here from an unmapped jsonb column; JSON keeps them
      // readable instead of writing "[object Object]".
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}

// ── Config, logging, misc ───────────────────────────────────────────────────

/**
 * Reads credentials from Script Properties.
 *
 * They live there rather than in this file so the key is never in the sheet's
 * cells, never in the app bundle, and never in the repo.
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const url = (props.getProperty('SUPABASE_URL') || '').trim().replace(/\/+$/, '');
  const key = (props.getProperty('SUPABASE_SERVICE_KEY') || '').trim();

  if (!url || !key) {
    throw new Error(
      'Missing credentials. In the Apps Script editor: Project Settings → ' +
        'Script Properties → add SUPABASE_URL and SUPABASE_SERVICE_KEY. See SETUP.md.',
    );
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|red)$/i.test(url)) {
    throw new Error(
      `SUPABASE_URL must be the API URL (https://<ref>.supabase.co), not the ` +
        `dashboard URL. Got "${url}".`,
    );
  }
  return { url, key };
}

/** Appends one row per run to the log tab: when, how long, rows, failures. */
function logRun(ss, started, results) {
  if (!LOG_TAB) return;

  let sheet = ss.getSheetByName(LOG_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_TAB);
    sheet
      .appendRow(['Run At', 'Duration (s)', 'Tables OK', 'Rows Synced', 'Errors'])
      .getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#0E1B33')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  const ok = results.filter((r) => !r.error);
  const errors = results.filter((r) => r.error);

  sheet.appendRow([
    started,
    (new Date().getTime() - started.getTime()) / 1000,
    `${ok.length}/${results.length}`,
    ok.reduce((sum, r) => sum + r.rows, 0),
    errors.length ? errors.map((r) => `${r.tab}: ${r.error}`).join(' | ') : '',
  ]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
}

function timezone() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
}

/**
 * Shows a message when a human is watching, logs it when the trigger runs.
 * getUi() throws in trigger context, which is why this is wrapped.
 */
function notify(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (err) {
    console.log(message);
  }
}
