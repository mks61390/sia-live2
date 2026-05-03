## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The listing ingestion pipeline that feeds the app's entire inventory. Yad2 listings for Tel Aviv and Greater Tel Aviv are scraped via Apify, orchestrated by n8n, and written to the Supabase `listings` table. Every scrape cycle updates `last_seen_at` on re-confirmed listings; listings not seen within 48 hours are flagged `is_stale = true`.

This issue delivers:
1. Supabase `listings` table migration
2. A Supabase upsert endpoint (edge function or API route) that n8n calls after each scrape
3. An importable n8n workflow JSON — paste in credentials and run
4. An Apify actor configuration reference sheet
5. A setup checklist for the manual credential wiring

The pipeline architecture is modular — Yad2 is source #1, but the schema and upsert endpoint are source-agnostic so Facebook and Madlan can be added later without schema changes.

## Acceptance criteria

- [ ] `listings` table exists in Supabase with columns: `id`, `source`, `source_id`, `source_url`, `title`, `description`, `price`, `bedrooms`, `area_sqm`, `lat`, `lng`, `neighborhood`, `published_at`, `last_seen_at`, `is_stale`, `geo_enrichment` (jsonb, nullable)
- [ ] Upsert endpoint accepts a listing payload, inserts new listings, and updates `last_seen_at` on existing ones (matched by `source` + `source_id`)
- [ ] A cron job or n8n schedule runs the scraper on a regular cadence and calls the upsert endpoint
- [ ] Listings not re-confirmed within 48 hours have `is_stale` set to `true` — either via a scheduled Supabase function or an n8n step
- [ ] n8n workflow JSON file is importable with no errors
- [ ] Setup checklist covers: Apify account creation, actor config, API key, n8n credential wiring, Supabase service key, and test run verification
- [ ] At least 200 active Tel Aviv and Greater Tel Aviv listings are present in the database before this issue is closed (initial seed run)
- [ ] No Supabase credentials or API keys are committed to the repo

## Blocked by

- `issues/001-project-scaffolding.md`

## Manual steps required (HITL)

1. Create Apify account and obtain API key
2. Configure the Yad2 scraper actor in the Apify dashboard using the reference sheet
3. Create n8n instance (cloud or self-hosted)
4. Import the n8n workflow JSON
5. Add Apify API key and Supabase service key as n8n credentials
6. Run a test scrape and verify listings appear in Supabase
7. Confirm the initial seed run has populated at least 200 listings

## User stories addressed

None directly. This issue is the inventory foundation for issues 007, 008, and 011.
