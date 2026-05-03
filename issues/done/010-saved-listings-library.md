## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The tenant's personal saved listings library. Tenants save listings from the browse cards or the detail page. The library displays the full geo-enriched card for each saved listing — not just a link. Stale listings remain in the library with a visible warning rather than disappearing silently.

This slice covers the save action, the `saved_listings` table migration, and the library view.

## Acceptance criteria

- [ ] `saved_listings` table exists with columns: `id`, `tenant_id`, `listing_id`, `saved_at`
- [ ] Save button on the listing card (browse results) adds the listing to `saved_listings`
- [ ] Save button on the listing detail page adds the listing to `saved_listings`
- [ ] Save button toggles to an unsave state if the listing is already saved — tapping again removes it from `saved_listings`
- [ ] Library view is accessible from the main navigation
- [ ] Library displays the full listing card for each saved listing: photo, price, bedrooms/size, neighborhood, AI match signal
- [ ] Saved listings with `is_stale = true` display a stale warning on their card — they are not removed from the library
- [ ] Library shows an empty state with a prompt to start searching if no listings have been saved yet
- [ ] Save state is consistent across browse and detail views — a listing saved from the detail page shows as saved on the browse card and vice versa

## Blocked by

- `issues/009-listing-detail-page.md`

## User stories addressed

- User story 31
- User story 32
- User story 33
- User story 34
