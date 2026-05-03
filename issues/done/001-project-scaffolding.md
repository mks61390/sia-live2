## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

Bootstrap the full project stack end-to-end so every subsequent issue has a working foundation to build on. This covers the frontend framework, backend services, deployment pipeline, and analytics instrumentation — nothing user-facing, but every other slice depends on it being in place.

- React + Vite + TypeScript project initialised at the repo root
- Supabase project created, `.env` wired with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Vercel project connected to the GitHub repo, auto-deploys on push to `main`
- PostHog snippet installed for session recording and event tracking
- Environment variable structure documented in `.env.example`
- Tailwind CSS configured

## Acceptance criteria

- [x] `npm run dev` starts the app locally with no errors
- [x] `npm run build` produces a clean production build
- [ ] Pushing to `main` triggers a Vercel deployment that goes live without manual steps — **HITL**
- [x] Supabase client is initialised and importable from a shared `lib/supabase.ts` module
- [x] PostHog loads on every page (initialises when `VITE_POSTHOG_KEY` is set)
- [x] `.env.example` lists every required environment variable with a description
- [x] No secrets committed to the repo — `.env` is in `.gitignore`

## Progress notes

**Done (AFK — 2026-05-03):**
- `app/lib/supabase.ts` — Supabase client exported using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; falls back to safe placeholders in test env
- `app/lib/supabase.test.ts` — unit tests confirm the client is exported with `.from()` and `.auth`
- `app/root.tsx` — `PostHogProvider` component initialises PostHog on mount when `VITE_POSTHOG_KEY` is set
- `.env.example` — documents all env vars for Supabase, PostHog, Foursquare, Resend, and OpenAI

**HITL remaining:**
- Create Supabase project and add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to `.env`
- Connect Vercel to the GitHub repo and configure env vars there

## Blocked by

None — can start immediately.

## User stories addressed

None directly. This issue is the foundation for all other issues.
