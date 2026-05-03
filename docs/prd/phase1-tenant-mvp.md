# PRD — Sia Phase 1: Tenant MVP

## Problem Statement

New Olim (Jewish immigrants to Israel) arriving in Tel Aviv face a disorienting, Hebrew-heavy rental market. They rely on strangers in Facebook groups and WhatsApp chats, struggle to filter for English-speaking landlords, and have no understanding of Israeli rental norms, tenant rights, or neighborhood character. Most are searching under extreme time pressure — sometimes before they've landed — with no trusted tool built for their situation. Existing platforms like Yad2 are in Hebrew, offer no lifestyle-based matching, and provide no Olim-specific context.

## Solution

Sia is an AI-powered rental discovery app for Olim searching for apartments in Tel Aviv and Greater Tel Aviv. Tenants describe what they want by voice or text, a conversational AI agent refines their preferences through a progressive interview, and the app surfaces geo-enriched, personally matched listings sourced from scraped Yad2 inventory.

Phase 1 is tenant-side only. There are no landlord sign-ups, no in-app transactions, and no paywalls. The exit point from a listing is a "View on Yad2" button. All access is free for the first 6 months. The goal is product-market fit through tenant traffic, alert sign-ups, and return visits.

## User Stories

### Authentication

1. As a new Olim tenant, I want to sign up with my email and password, so that I can create an account and access personalised listings.
2. As a new Olim tenant, I want to sign up with my Google account, so that I can get started quickly without creating a new password.
3. As a returning tenant, I want to log in with my email and password, so that I can resume my apartment search.
4. As a returning tenant, I want to log in with my Google account, so that I can access my saved listings and alerts without friction.
5. As a tenant, I want to land on a clean static landing page with a "Get Started" button, so that I understand the product before committing to sign up.

### Voice & Text Input

6. As a tenant, I want to record my apartment preferences by voice, so that I can describe what I'm looking for naturally without filling out forms.
7. As a tenant, I want to type my apartment preferences as free text, so that I can describe what I need in my own words if I prefer not to use voice.
8. As a tenant, I want the AI to confirm what it understood from my voice or text input before showing results, so that I know my preferences were interpreted correctly and I feel heard.
9. As a tenant, I want fields already captured in my voice or text input — budget, bedrooms, move-in date, etc. — to be automatically skipped in the follow-up interview, so that I am never asked to repeat information I already provided.

### AI Lifestyle Interview

10. As a tenant, I want the AI to ask follow-up questions in blocks of 3, so that the interview feels structured and not overwhelming.
11. As a tenant, I want to be able to skip all remaining questions at any point, so that I can see results without completing the full interview.
12. As a tenant, I want results to appear after the first block of 3 questions is complete, so that I can start browsing while optionally continuing the interview.
13. As a tenant, I want the interview to cover up to 15 questions across 5 blocks, so that the AI can build a detailed picture of my preferences if I choose to engage.
14. As a tenant, I want block 1 to cover budget, bedroom count, and move-in date, so that the most essential matching criteria are captured first.
15. As a tenant, I want block 2 to cover neighborhood preference and street character (quiet vs. lively), so that my location preferences are factored in early.
16. As a tenant, I want block 3 to cover proximity needs — public transport, schools, religious facilities, beach or park, so that my daily lifestyle requirements influence the results.
17. As a tenant, I want block 4 to cover lifestyle factors — pets, parking, working from home, roommate or solo, so that practical constraints are captured.
18. As a tenant, I want block 5 to cover deal-breakers — Hebrew-only landlord acceptable, furnished vs. unfurnished, minimum lease length, so that incompatible listings are filtered out.
19. As a tenant, I want any question whose answer was already captured from my voice or text input to be automatically skipped regardless of which block it belongs to, so that the interview only covers genuinely missing information.

### Listing Browse

20. As a tenant, I want to see listing cards showing photo, price, bedrooms and size, neighborhood name, and an AI match signal, so that I can quickly evaluate listings without opening each one.
21. As a tenant, I want each listing card to show a one or two line AI-generated explanation of why it matches my profile, so that I can immediately understand the relevance of each result.
22. As a tenant, I want listings to be filtered by hard constraints — budget, bedrooms, area — before any AI ranking is applied, so that results are fast and always within my stated requirements.
23. As a tenant, I want the filtered results to be ranked by lifestyle fit against my softer preferences, so that the best matches appear at the top.

### Listing Detail

24. As a tenant, I want to open a full listing detail page from any card, so that I can see all available information before deciding to act.
25. As a tenant, I want the listing detail page to show nearby amenities — parks, cafes, gyms, schools, supermarkets, pharmacies, bus stops — so that I can evaluate the location for my daily life.
26. As a tenant, I want to see the neighborhood name and character on the listing detail page, so that I understand the area I would be living in.
27. As a tenant, I want to see typical rental prices for the neighborhood on the listing detail page, so that I can assess whether the listing is competitively priced.
28. As a tenant, I want to see a "View on Yad2" button on the listing detail page, so that I can contact the landlord directly on the original platform.
29. As a tenant, I want to see a "Last seen on Yad2" timestamp on every listing, so that I know how recently the listing was confirmed active.
30. As a tenant, I want listings that have not been confirmed active within 48 hours to show a visible stale warning, so that I do not pursue unavailable apartments.

### Saved Listings

31. As a tenant, I want to save listings to a personal library, so that I can build a shortlist of apartments I am interested in.
32. As a tenant, I want to view all my saved listings in one place, so that I can compare options and manage my search over time.
33. As a tenant, I want saved listings to show the full geo-enriched card — not just a link — so that my library is useful for comparison, not just a list of URLs.
34. As a tenant, I want stale saved listings to remain in my library with a clear warning rather than silently disappearing, so that I have a complete record of what I considered.

### Alerts

35. As a tenant, I want to receive an in-app notification when a new listing matching my saved preferences is published on Yad2, so that I can act quickly on new inventory.
36. As a tenant, I want to receive an email notification when a new matching listing appears, so that I am alerted even when I am not using the app.
37. As a tenant, I want to be prompted to set up alerts immediately after my first results load, so that I do not miss new listings matching my search.
38. As a tenant, I want alerts to fire in real time when the scraper ingests a new matching listing, so that I am notified as close to publication time as possible.

## Implementation Decisions

### Modules

1. **Authentication** — Supabase Auth, email/password and Google OAuth. Handles session management and account creation.

2. **Voice transcription** — Gemini 2.5 Flash direct API. Converts recorded audio to text. Input to the preference extraction module.

3. **Preference extraction** — GPT-4o mini. Takes the raw transcript or text input and extracts a structured preference profile: budget, bedrooms, move-in date, neighborhoods, lifestyle signals, deal-breakers. Fields successfully extracted here are flagged so the interview skips them.

4. **AI lifestyle interview** — Conversation state machine. Manages 5 blocks of 3 questions. Tracks which fields are already filled from the preference extraction step. Presents only unfilled questions. Respects skip-at-any-point. Unlocks the results view after block 1 completes.

5. **Scraping pipeline** — n8n + Apify. Scrapes Yad2 for Tel Aviv and Greater Tel Aviv listings on a regular cadence. Writes new listings to Supabase. Updates `last_seen_at` on re-confirmed listings. Architecture is modular — Yad2 is source #1; Facebook and Madlan can be added later without rebuilding the core pipeline.

6. **Listing database** — Supabase. Stores all scraped listings with source attribution, geo enrichment, and freshness timestamps. Listings not re-confirmed within 48 hours are marked stale.

7. **Geo enrichment** — Foursquare free tier API. Enriches each listing by lat/lng with nearby amenity categories: parks, cafes, gyms, schools, supermarkets, pharmacies, bus stops. Runs on ingest and is stored alongside the listing record.

8. **Matching engine** — Two-stage. Stage 1: deterministic hard filters on budget, bedrooms, and area applied in-database. Stage 2: GPT-4o mini ranks the filtered candidates by lifestyle fit and generates a one or two line match explanation per listing.

9. **Alert engine** — Event-driven. Triggered on new listing ingestion. Evaluates the new listing against all active tenant preference profiles. Dispatches in-app notification and email via Resend for any matching tenant.

10. **Saved listings** — Supabase junction table. Tenant-to-listing associations. Stale flag inherited from the listing record and surfaced in the library UI.

### Architecture

- Frontend: React + Vite + TypeScript, deployed on Vercel
- Backend/DB/Auth: Supabase
- Scraping orchestration: n8n + Apify Starter
- Matching and preference extraction: GPT-4o mini
- Voice transcription: Gemini 2.5 Flash
- Geo enrichment: Foursquare free tier
- Email notifications: Resend
- Analytics: PostHog free tier

### Schema (logical)

- `tenants` — id, email, created_at, google_id
- `tenant_profiles` — tenant_id, budget_max, bedrooms, move_in_date, neighborhoods[], lifestyle_signals{}, interview_state, completed_blocks
- `listings` — id, source, source_id, source_url, title, description, price, bedrooms, area_sqm, lat, lng, neighborhood, published_at, last_seen_at, is_stale, geo_enrichment{}
- `saved_listings` — id, tenant_id, listing_id, saved_at
- `notifications` — id, tenant_id, listing_id, channel (email/in_app), sent_at, read_at

## Testing Decisions

Good tests verify external behaviour, not implementation details. Tests should remain valid if internal implementation changes, as long as outputs are the same.

**Modules to test:**

- **Preference extraction** — given a voice transcript or text input, assert that the correct structured fields are extracted and that already-filled fields are flagged for skip.
- **Interview state machine** — given a partially completed preference profile, assert that only unfilled questions are presented and that skip-at-any-point correctly terminates the interview.
- **Matching engine filter layer** — given a tenant profile and a set of listings, assert that only listings passing all hard filters are returned, and that no out-of-budget or wrong-bedroom listings appear.
- **Stale detection** — given a `last_seen_at` timestamp, assert that the correct stale flag is computed for both fresh and stale thresholds.
- **Alert engine** — given a new listing ingestion event and a set of tenant profiles, assert that notifications are dispatched only to tenants whose profiles match the new listing, and not to non-matching tenants.

Do not write unit tests for UI components. Do not test internal implementation details of the LLM calls — test the structured outputs they produce.

## Out of Scope

- Landlord sign-up, listing upload, or any landlord-side features
- In-app messaging between tenants and landlords
- Showing requests or visit scheduling
- Lease tracking
- WhatsApp or Telegram notifications (Phase 2)
- Monetisation, paywalls, or view caps
- School language filters and synagogue/religious facility geo data (v1.1)
- Agent marketplace
- Zoom scheduling integration
- Multi-language UI — English only for Phase 1
- Facebook group or Madlan scraping — Yad2 only for Phase 1
- Real estate agency or broker CRM features

## Further Notes

- The AI confirmation message after voice/text submit is a critical trust moment. Copy must feel warm and competent — e.g. *"You're looking for a 2-bedroom under ₪7,000 in north Tel Aviv, moving in August — and you have a dog, so I'll filter for pet-friendly listings. Finding your best matches now."* Invest disproportionate effort in this copy.
- The audience is often searching under extreme time pressure, sometimes from abroad before landing. Design mobile-first throughout.
- Transparency on scraped data is a brand principle — never hide stale listings, always surface the last confirmed timestamp.
- The scraping pipeline must be seeded with several hundred active Tel Aviv and Greater Tel Aviv listings before launch day. The app cannot launch to an empty database.
- Yad2 scraping violates Yad2 terms of service. Risk is accepted for Phase 1. Mitigation: modular data source architecture means the pipeline can switch to alternative sources without rebuilding the app.
- Phase 1 success is measured by tenant registrations, alert sign-ups, return visits, and Yad2 click-throughs — not by in-app transactions, which do not exist in Phase 1.
