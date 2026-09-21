# InvoicePro

A mobile-first, offline-capable PWA for Indian distributors (vendors) and their field
salesmen to create and track GST invoices.

## Stack

React + Vite + TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Storage), IndexedDB
(`idb`) for offline storage, React Query for server state, Zustand for local sync state,
`react-hook-form` + `zod` for forms, `@react-pdf/renderer` for invoice PDFs.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL/anon key
   (see [Swapping in real credentials](#swapping-in-real-credentials) below). `.env.local`
   is gitignored and never committed.
3. Apply the database schema: run the SQL files in `supabase/migrations/` in order
   (`0001_init_schema.sql` → `0004_storage.sql`) against your Supabase project, either
   via the SQL editor in the dashboard or `supabase db push` with the Supabase CLI.
4. In the Supabase dashboard, enable **Authentication → Providers → Phone**, and
   configure a **Test phone number + fixed OTP** for local development so you can log
   in without a real SMS provider. See `CREDENTIALS.md` for details.
5. `npm run dev` and open the printed local URL.

## Swapping in real credentials

The Supabase client (`src/lib/supabase.ts`) reads exclusively from `import.meta.env`, so
moving from a dev/test Supabase project to production never requires a code change —
only new values in `.env.local` (local dev) or your hosting provider's environment
variable settings (production). `CREDENTIALS.md` documents where each credential comes
from in the Supabase/MSG91 dashboards; no real secrets are ever stored in this repo.

## How offline sync works

Salesmen create invoices with zero network dependency:

1. On login (and whenever connectivity returns), the vendor's item catalog and retailer
   list are cached into IndexedDB (`src/lib/db.ts`).
2. Creating an invoice reads only from that local cache, computes GST client-side
   (`src/lib/gst.ts`), and saves the invoice into IndexedDB with a locally generated
   `client_generated_id`, status `draft`, and no `invoice_number` yet — the UI shows a
   "Pending sync" badge for these.
3. A sync manager (`src/lib/syncManager.ts`) runs on app start, whenever the browser
   regains connectivity, and on a periodic timer. It pushes queued draft invoices to
   Supabase via the `sync_invoice` Postgres RPC (`supabase/migrations/0003_functions.sql`),
   which atomically assigns the real `invoice_number` (locking the vendor's counter row)
   and inserts the invoice + line items in one transaction.
   `sync_invoice` is idempotent on `client_generated_id`: if a sync is retried (flaky
   connection, app restart mid-sync), it detects the row already exists and returns it
   instead of inserting a duplicate.
4. `src/components/common/SyncStatusBar.tsx` shows a persistent "N invoices pending
   sync" indicator with a manual "Retry sync" action whenever there's a queue or a
   sync error.
5. `vite-plugin-pwa` precaches the app shell itself (JS/CSS/HTML), so the app loads
   and is usable even with zero connectivity — not just cached data within it.

**Known limitation:** quick-added retailers created while offline are cached locally so
they're usable for the invoice being built, but the retailer record itself is not queued
for sync the way invoices are — it syncs to the server the next time the salesman is
online and creates/edits something that touches that endpoint.

## Project structure

```
src/
  components/   shared UI (common/), layout shells, auth widgets
  pages/        route-level screens, split by persona (vendor/, salesman/, auth/)
  hooks/        React Query hooks (vendor/salesman data) + auth/online-status hooks
  lib/          supabase client, offline db, sync manager, GST + invoice-number math, PDF
  store/        Zustand store for local sync UI state
  types/        shared TypeScript types mirroring the database schema
supabase/
  migrations/   schema, RLS policies, RPC functions, storage bucket setup, in order
```
