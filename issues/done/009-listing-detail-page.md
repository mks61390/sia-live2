## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The full listing detail page. A tenant arrives here by tapping a listing card from the browse results. This is the richest page in the app — geo-enriched, with neighborhood context, amenity data, and a clear exit to Yad2. It is also the page where the tenant saves a listing.

The "View on Yad2" button is the only exit from the app to the original listing. It must be prominent but not the first thing the tenant sees — the detail page earns the click by showing value first.

Stale listings are displayed with a visible warning banner — they are never hidden or silently removed.

## Acceptance criteria

- [ ] Detail page is accessible from any listing card in the browse results
- [ ] Page displays: all listing photos, price, bedrooms, area (sqm), full description, neighborhood name
- [ ] Nearby amenities are displayed from `geo_enrichment`: parks, cafes, gyms, schools, supermarkets, pharmacies, bus stops — each with name and distance
- [ ] Neighborhood character description is shown (derived from neighborhood name + typical listing data)
- [ ] Typical rental price range for the neighborhood is shown
- [ ] "Last seen on Yad2" timestamp is displayed on every listing
- [ ] Listings with `is_stale = true` show a clearly visible warning banner: "This listing may no longer be available — verify on Yad2 before reaching out"
- [ ] "View on Yad2" button is present and opens the original `source_url` in a new tab
- [ ] Save button is present — tapping it adds the listing to the tenant's saved library (issue 010)
- [ ] Page is fully mobile-responsive
- [ ] Page does not crash or show broken UI if `geo_enrichment` is null or empty

## Blocked by

- `issues/007-geo-enrichment.md`
- `issues/008-matching-engine-browse.md`

## User stories addressed

- User story 24
- User story 25
- User story 26
- User story 27
- User story 28
- User story 29
- User story 30
