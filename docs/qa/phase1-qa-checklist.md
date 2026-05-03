# Phase 1 QA Checklist — Live Site

Test URL: https://sia-live2.vercel.app

---

## 1. Landing Page (Issue 002)

- [ ] Page loads without error
- [ ] Hero text and CTAs are visible and readable
- [ ] "Sign up" / "Get started" CTA navigates to signup
- [ ] Page is responsive on mobile

---

## 2. Auth — Email/Password (Issue 003)

- [ ] Sign up with a new email → redirected to preferences screen
- [ ] Sign up with an already-used email → error shown (not a crash)
- [ ] Log in with correct credentials → redirected correctly
- [ ] Log in with wrong password → error shown
- [ ] Log out → redirected to landing or login

---

## 3. Auth — Google OAuth (Issue 003)

- [ ] "Sign in with Google" button appears on login and signup
- [ ] Clicking it opens Google account chooser
- [ ] Completing Google sign-in redirects back to the app (not a 404 or error)
- [ ] Newly created Google user appears in Supabase `tenants` table

---

## 4. Preference Capture — Text Input (Issue 004)

- [ ] Preferences screen loads after signup
- [ ] Typing free text and submitting works without error
- [ ] AI confirmation card appears with specific extracted details (budget, bedrooms, neighbourhood, lifestyle signals)
- [ ] Confirmation message is warm and specific — not generic
- [ ] Submitting with no text still shows a confirmation and proceeds to interview

---

## 5. Preference Capture — Voice Input (Issue 004)

- [ ] Voice record button appears
- [ ] Browser requests microphone permission
- [ ] Recording and stopping works
- [ ] Transcription result is shown or used (no silent failure)
- [ ] Extracted fields from voice match what was said

---

## 6. Interview Flow (Issue 005)

- [ ] Interview screen loads after preference confirmation
- [ ] Fields already extracted in step 4 are skipped (correct blocks pre-filled)
- [ ] Questions progress block by block
- [ ] "Skip to browse" link appears from block 2 onwards
- [ ] Completing all blocks redirects to `/browse`
- [ ] `tenant_profiles` row updated correctly in Supabase

---

## 7. Browse & Matching (Issue 008)

- [ ] `/browse` loads without error
- [ ] Listings appear (at least the 5 seed listings)
- [ ] Each card shows: price, bedrooms, neighbourhood, AI match explanation
- [ ] Listings are filtered by budget and bedrooms from profile
- [ ] "Enable alerts" banner is visible
- [ ] Clicking "Enable alerts" dismisses the banner
- [ ] Unread notification count badge appears in nav (0 is fine)

---

## 8. Listing Detail (Issue 009)

- [ ] Clicking a listing card opens `/listings/:id`
- [ ] Title, price, bedrooms, area, neighbourhood all display
- [ ] Description displays
- [ ] Photo area renders (placeholder or image)
- [ ] Amenities section is hidden if geo_enrichment is null (expected for seed listings)
- [ ] "View on Yad2" button opens the source URL in a new tab
- [ ] Save button is visible
- [ ] Back navigation works

---

## 9. Saved Listings (Issue 010)

- [ ] Clicking Save on a listing detail page saves it (button state changes)
- [ ] Clicking Save on a browse card saves it (optimistic UI)
- [ ] `/saved` loads and shows saved listings
- [ ] Unsaving removes the listing from `/saved`
- [ ] `/saved` shows empty state when nothing is saved
- [ ] Saving the same listing twice does not cause an error

---

## 10. Notifications (Issue 011)

- [ ] `/notifications` loads without error
- [ ] Page shows empty state when no notifications exist
- [ ] "Mark all read" button visible (can test once a notification exists)
- [ ] Each notification links to the correct `/listings/:id`

---

## Known gaps (not bugs)

- Only 5 seed listings — browse will feel thin until 006 (Yad2 scraping) is live
- Amenities hidden on all listings — Foursquare enrichment only runs on new ingest, not on seeds
- Email alerts will not fire until real listings flow through the ingest endpoint
- Google OAuth consent screen shows Supabase URL instead of "Sia" (cosmetic, fixed via Google Cloud Console)
