## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The matching engine and the browse results page. Takes the tenant's completed (or partially completed) profile from `tenant_profiles` and returns a ranked list of matching listings from the database.

**Two-stage matching:**
1. Hard filter in-database: eliminate all listings outside budget, wrong bedroom count, or wrong area. Fast, free, done in SQL.
2. AI ranking: send the filtered candidates to GPT-4o mini with the tenant's lifestyle signals. GPT-4o mini ranks the listings by lifestyle fit and generates a one or two line match explanation for each.

**Browse card** shows exactly 5 elements: photo, price, bedrooms/size, neighborhood name, and the AI-generated match signal.

The alert sign-up prompt appears at the top of the results view immediately after results load — a single-line inline prompt, one-click enable. No extra form. (Full alert dispatch is in issue 011 — this issue only covers the UI prompt and the preference save.)

## Acceptance criteria

- [ ] Results page is accessible once `completed_blocks >= 1` in the tenant's profile
- [ ] Hard filter correctly excludes listings outside `budget_max`, wrong `bedrooms`, and outside preferred neighborhoods
- [ ] Filtered candidates are sent to GPT-4o mini for ranking and match explanation generation
- [ ] Each listing card displays: photo, price, bedrooms/size, neighborhood name, and the AI match explanation (one or two lines)
- [ ] Match explanation is specific to the tenant — it must reference at least one detail from their profile, not be generic
- [ ] Results page handles the case where 0 listings pass the hard filter — shows a clear empty state with a suggestion to broaden preferences
- [ ] Alert sign-up prompt appears at the top of results on first load — one-click enable saves the tenant's current profile as an active alert preference
- [ ] Clicking a listing card navigates to the listing detail page (issue 009)
- [ ] Results re-rank automatically if the tenant completes additional interview blocks after the initial results load

## Blocked by

- `issues/005-ai-lifestyle-interview.md`
- `issues/006-scraping-pipeline.md`

## User stories addressed

- User story 20
- User story 21
- User story 22
- User story 23
- User story 37 (alert prompt UI only — dispatch handled in issue 011)
