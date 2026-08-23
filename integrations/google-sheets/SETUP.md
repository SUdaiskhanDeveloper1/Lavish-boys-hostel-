# Supabase → Google Sheets backup

One-way daily mirror of the six core tables into a Google Spreadsheet. Runs as a
Google Apps Script **inside the spreadsheet** — nothing in the React app changes,
and no credential ever reaches the browser bundle.

| | |
|---|---|
| **Direction** | Supabase → Sheets (one-way; Supabase stays the source of truth) |
| **Mode** | Full replace — every run clears each tab and rewrites it |
| **Schedule** | Once a day, ~02:00 in the spreadsheet's timezone |
| **Tabs created** | Rooms, Students, Fee Payments, Expenses, Employees, Employee Payments, Sync Log |

> **Anything you type into a synced tab gets overwritten.** Keep your own notes
> and formulas on a separate tab.

---

## Setup (about 5 minutes)

### 1. Open the spreadsheet you want to back up into

Use a real spreadsheet you own. The link you gave me earlier —
`https://docs.google.com/spreadsheets/d/1QmFQGeuIC-uBDpYr778D8/edit` — has a
22-character ID, but Google Sheets IDs are ~44 characters, so that one was
truncated. It doesn't matter for setup: because the script is *bound* to the
spreadsheet, it finds it automatically and no ID is ever entered anywhere.

### 2. Create the script

In that spreadsheet: **Extensions → Apps Script**.

Delete the placeholder `myFunction` stub, then paste in the entire contents of
[`Code.gs`](./Code.gs). Save (Ctrl+S).

### 3. Add your credentials

In the Apps Script editor: **Project Settings** (gear icon, left sidebar) →
scroll to **Script Properties** → **Add script property**, twice:

| Property | Value |
|---|---|
| `SUPABASE_URL` | `https://zphblmeotbkgckycunnf.supabase.co` |
| `SUPABASE_SERVICE_KEY` | your **service_role** key |

Get the service_role key from **Supabase Dashboard → Project Settings → API →
service_role**, under "Project API keys". Click to reveal, then copy.

> **Why service_role and not the anon key?** Your RLS policies grant access
> `to authenticated` only, so the anon key reads back an empty result for every
> table — the sheet would sync six empty tabs. service_role bypasses RLS, which
> is what a backup job needs.

### 4. Read this before you continue

The service_role key can read and write your entire database. Rules:

- Only ever paste it into **Script Properties** — never into a spreadsheet
  cell, never into `.env` or any `VITE_*` variable (those are compiled into the
  public JS bundle), never into the app source.
- Anyone you give **edit** access to the spreadsheet can open Apps Script and
  read that property. Share the sheet as **Viewer** for everyone except yourself.
- If it leaks, rotate it in the same dashboard screen you copied it from.

### 5. Authorize and test

Reload the spreadsheet. A **Supabase** menu appears next to Help.

Run **Supabase → Test connection**. The first run triggers Google's
authorization prompt:

1. **Review permissions** → pick your account
2. "Google hasn't verified this app" → **Advanced** → **Go to (project name)**
   — expected, since this is your own private script
3. **Allow**

Then run **Test connection** again. You should get `OK` for all six tables.
`empty` just means that table has no rows yet — the connection is fine.

### 6. First sync + schedule

- **Supabase → Sync now** — populates every tab. Check the results.
- **Supabase → Install daily trigger** — schedules it from then on.

Confirm the schedule stuck under **Triggers** (clock icon) in the Apps Script
editor: one time-based trigger on `syncAll`, Day timer.

To change the hour, edit `DAILY_HOUR` at the top of `Code.gs`, then re-run
**Install daily trigger** (it clears the old one first, so you won't end up with
two).

---

## Verifying it keeps working

The **Sync Log** tab appends a row per run — timestamp, duration, tables OK,
total rows, and any errors. If a scheduled run fails, Google emails you a
failure summary at the account that owns the script.

One table failing doesn't abort the others; the failure is recorded per-table in
the log and the run reports at the end.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Missing credentials` | Script Properties not saved, or the names are misspelled. They're case-sensitive: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. |
| `SUPABASE_URL must be the API URL` | You pasted the dashboard URL. Use `https://<ref>.supabase.co`. |
| `HTTP 401` | Wrong or truncated key. Re-copy the full service_role key. |
| All tabs sync but are empty | You used the anon key instead of service_role — RLS returns nothing to anon. |
| `Another sync is already running` | A manual run overlapped the scheduled one. Wait a minute. |
| Exceeded maximum execution time | Apps Script caps a run at 6 minutes. Only a concern at very large row counts; sync fewer tables or split the schedule. |

---

## Changing what gets synced

`TABLES` at the top of `Code.gs` drives everything — tabs, column order,
headers, and formats all come from it. To add a table, append an entry with its
`table`, `tab`, `select`, `order`, and `columns`.

Column `type` controls formatting: `money`, `int`, `date`, `month`, `datetime`,
`count` (length of a jsonb array), or omit for text. A `path` may use
dot-notation to read an embedded lookup, e.g. `rooms.room_number` paired with
`select: '*,rooms(room_number)'`.

Not currently synced: `student_timeline`, `audit_logs`, `notifications`,
`profiles`, `hostel_settings`, and the report views. `audit_logs` in particular
grows fast enough to threaten the 10M-cell spreadsheet limit over years.
