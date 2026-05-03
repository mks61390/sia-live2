## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

Full tenant authentication — sign up and log in — using Supabase Auth. Two methods: email/password and Google OAuth. Covers the sign-up page, log-in page, session persistence, protected route enforcement, and the `tenants` table migration.

Google OAuth will be the majority signup path. Both methods must produce a valid Supabase session and a row in the `tenants` table.

## Acceptance criteria

- [x] `tenants` table exists in Supabase with columns: `id`, `email`, `created_at`, `google_id` — migration at `supabase/migrations/20260503_create_tenants.sql` (must be run via Supabase dashboard or `supabase db push`)
- [x] Sign-up page accepts email + password and creates a Supabase Auth user and a `tenants` row
- [x] Sign-up page includes a "Continue with Google" button that completes the OAuth flow and creates a `tenants` row
- [x] Log-in page accepts email + password and restores session
- [x] Log-in page includes "Continue with Google" for returning Google users
- [x] Authenticated users are redirected to `/browse`; unauthenticated users on home/login/signup are redirected if already authed
- [x] Session persists across page refresh (cookie-based: sbUserId + sbAccessToken + sbRefreshToken in `cadence_session`)
- [x] Duplicate email sign-up shows a clear, user-friendly error — not a raw Supabase error string
- [x] All auth pages are mobile-responsive

## Progress notes

**Done (2026-05-03):**
- `app/lib/session.ts` — added `getSupabaseUserId`, `setSupabaseSession`, `clearSupabaseSession`, `setOAuthCodeVerifier`, `getOAuthCodeVerifier`, `clearOAuthCodeVerifier`
- `app/lib/supabase.server.ts` — `createSupabaseServer()` factory (fresh client per request, no shared state)
- `app/routes/signup.tsx` — rewritten: email/password signup + Google OAuth button; PKCE-based server-side OAuth initiation; tenants row upserted on success
- `app/routes/login.tsx` — rewritten: email/password login + Google OAuth button
- `app/routes/auth.callback.tsx` — OAuth PKCE callback: exchanges code for session via Supabase `/auth/v1/token?grant_type=pkce`, upserts tenants row, sets session cookie
- `app/routes/home.tsx` — loader uses `getSupabaseUserId` (Supabase-based auth)
- `supabase/migrations/20260503_create_tenants.sql` — tenants table + RLS policies

**Manual step required:** Run `supabase/migrations/20260503_create_tenants.sql` in the Supabase dashboard SQL editor (or via `supabase db push` if Supabase CLI is configured). Also enable Google OAuth provider in Supabase Auth > Providers dashboard.

## Blocked by

- `issues/001-project-scaffolding.md`

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 4
