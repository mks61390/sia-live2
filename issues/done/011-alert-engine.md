## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The event-driven alert engine. When the scraping pipeline ingests a new listing, it triggers an evaluation step that checks the new listing against every active tenant preference profile. Any tenant whose profile matches the new listing receives an in-app notification and an email via Resend.

The alert sign-up UI prompt (shown on first results load) is handled in issue 008. This issue covers the backend alert evaluation and dispatch, the `notifications` table, and the in-app notification indicator.

Alerts fire on new listing ingestion only — not on a schedule. This gives tenants the fastest possible notification after a listing is published on Yad2.

## Acceptance criteria

- [ ] `notifications` table exists with columns: `id`, `tenant_id`, `listing_id`, `channel` (email / in_app), `sent_at`, `read_at`
- [ ] Alert evaluation runs automatically when a new listing is inserted into the `listings` table (via Supabase trigger or n8n step)
- [ ] Evaluation correctly matches the new listing against all tenant profiles that have alerts enabled — matching on budget, bedrooms, and neighborhoods
- [ ] In-app notification is created in `notifications` for each matched tenant
- [ ] Email is dispatched via Resend to each matched tenant with the listing details and a direct link to the listing detail page in the app
- [ ] In-app notification indicator (e.g. badge or bell icon) is visible in the main navigation when unread notifications exist
- [ ] Tenant can view their notifications list and mark them as read
- [ ] Clicking a notification routes the tenant directly to the relevant listing detail page
- [ ] Tenants with no active alert preference are not evaluated — no false positives
- [ ] Duplicate alerts are prevented — a tenant does not receive more than one notification per listing

## Blocked by

- `issues/006-scraping-pipeline.md`
- `issues/008-matching-engine-browse.md`

## User stories addressed

- User story 35
- User story 36
- User story 37 (dispatch — UI prompt handled in issue 008)
- User story 38
