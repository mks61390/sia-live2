## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

A static, public-facing landing page that is the first thing a new visitor sees. The page communicates the core value proposition for Olim, and the single primary action is a "Get Started" button in the top-right that routes the visitor to the sign-up flow.

No animations, no complex layout — clean, minimal, fast. Mobile-first.

## Acceptance criteria

- [x] Landing page renders at `/` (the app root)
- [x] "Get Started" button is visible in the top-right on both mobile and desktop
- [x] Clicking "Get Started" routes to the sign-up page (see `issues/003-tenant-auth.md`)
- [x] Page communicates the core value prop for Olim in English
- [x] Page is fully responsive — no horizontal scroll or broken layout on mobile
- [x] Page loads in under 2 seconds on a standard connection (no heavy assets)
- [x] Unauthenticated users always land here; authenticated users are redirected to the search page

## Progress notes

**Done (AFK — 2026-05-03):**
- `app/routes/home.tsx` replaced with Olim landing page — Cadence LMS content removed
- Loader redirects authenticated users (session `userId` present) to `/browse`
- "Get Started" button top-right links to `/signup`; duplicate CTA in hero section
- Three feature callouts: AI Matching, Voice Input, Real-time Alerts
- No heavy assets — Lucide icons only; fully responsive via Tailwind
- `app/routes/home.test.tsx` — 2 loader tests (redirect for auth, `{}` for anon)

**Note:** `/browse` redirects to a 404 until issue 008 (matching engine) is complete. That's expected.

## Blocked by

- `issues/001-project-scaffolding.md` ✅

## User stories addressed

- User story 5
