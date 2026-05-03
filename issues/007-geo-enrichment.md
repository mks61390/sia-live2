## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

Foursquare free tier geo enrichment for every listing in the database. When a new listing is ingested by the scraping pipeline, a geo enrichment step fires — it takes the listing's lat/lng and queries Foursquare for nearby amenities within a radius, then stores the result in the listing's `geo_enrichment` jsonb field.

Amenity categories to capture: parks, cafes, gyms, schools, supermarkets, pharmacies, bus stops.

Enrichment runs once per listing on first ingest. It does not re-run on subsequent scrape confirmations unless `geo_enrichment` is null. This keeps Foursquare API calls within the free tier.

## Acceptance criteria

- [ ] Geo enrichment step is triggered for every newly ingested listing where `geo_enrichment` is null
- [ ] Foursquare API call uses the listing's `lat` and `lng` with a sensible search radius (500m default)
- [ ] Returned amenities are categorised and stored in `geo_enrichment` as structured JSON: `{ parks: [...], cafes: [...], gyms: [...], schools: [...], supermarkets: [...], pharmacies: [...], bus_stops: [...] }`
- [ ] Each amenity entry includes at minimum: name and distance from the listing
- [ ] Listings with no nearby amenities store an empty `geo_enrichment` object `{}` — not null — so the enrichment step is not re-triggered
- [ ] Enrichment does not block the listing from being available in search — it runs asynchronously after ingest
- [ ] Foursquare API key is stored as an environment variable, not hardcoded

## Blocked by

- `issues/006-scraping-pipeline.md`

## User stories addressed

- User story 25
- User story 26
- User story 27 (partially — typical rental prices come from neighborhood data, not Foursquare)
