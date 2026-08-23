# Supabase Setup — Lavish Boys Hostel

## 1. Create the project
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Copy the **Project URL** and **anon public key** (Project Settings → API) into the app's `.env`.

## 2. Run the schema
1. Open **SQL Editor → New query**.
2. Paste the entire contents of [`schema.sql`](./schema.sql) and **Run**.
   - Creates all tables, enums, indexes, constraints, triggers, views.
   - Enables Row Level Security (authenticated-only) on every table.
   - Creates all six storage buckets.

## 3. Create the admin user (only admin logs in — no public signup)
Because there is no public sign-up UI, create the admin from the dashboard:

**Authentication → Users → Add user → Create new user**
- Email: your admin email
- Password: a strong password
- ✅ **Auto Confirm User**

A `profiles` row is created automatically by the `handle_new_user` trigger.

> To harden further, disable public sign-ups: **Authentication → Providers → Email → "Allow new users to sign up" → OFF**.

## 4. Storage buckets
The schema creates these **private** buckets automatically:
`student-documents`, `student-photos`, `receipts`, `expense-bills`, `employee-documents`, `hostel-files`.
Access is via authenticated policies + signed URLs (already wired in `storage.service.ts`).

## 5. Google Drive backup (optional)
1. Google Cloud Console → enable **Drive API**, create an **OAuth Client ID**.
2. Put the client ID in `.env` (`VITE_GOOGLE_CLIENT_ID`) and the target folder ID in
   Settings → Google Drive Backup (or `.env`).
3. Deploy the provided Edge Function pattern (`supabase functions deploy drive-backup`) that
   receives a receipt PDF and uploads it to Drive using a stored refresh token.
   Re-running the OAuth consent reconnects an expired token.

## Backup / restore
- Supabase provides automatic daily backups (Pro plan) — Database → Backups.
- For manual dumps: `supabase db dump -f backup.sql`.
