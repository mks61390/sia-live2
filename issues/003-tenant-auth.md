## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

Full tenant authentication — sign up and log in — using Supabase Auth. Two methods: email/password and Google OAuth. Covers the sign-up page, log-in page, session persistence, protected route enforcement, and the `tenants` table migration.

Google OAuth will be the majority signup path. Both methods must produce a valid Supabase session and a row in the `tenants` table.

## Acceptance criteria

- [ ] `tenants` table exists in Supabase with columns: `id`, `email`, `created_at`, `google_id`
- [ ] Sign-up page accepts email + password and creates a Supabase Auth user and a `tenants` row
- [ ] Sign-up page includes a "Continue with Google" button that completes the OAuth flow and creates a `tenants` row
- [ ] Log-in page accepts email + password and restores session
- [ ] Log-in page includes "Continue with Google" for returning Google users
- [ ] Authenticated users are redirected to the search page; unauthenticated users attempting to access protected routes are redirected to the landing page
- [ ] Session persists across page refresh
- [ ] Duplicate email sign-up shows a clear, user-friendly error — not a raw Supabase error string
- [ ] All auth pages are mobile-responsive

## Blocked by

- `issues/001-project-scaffolding.md`

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 4
