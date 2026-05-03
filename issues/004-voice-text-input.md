## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The first screen a tenant sees after signing up. They can either record their preferences by voice or type them as free text. On submission, the input is transcribed (if voice) and sent to GPT-4o mini for preference extraction. The AI then displays a warm conversational confirmation of what it understood before handing off to the interview flow.

This slice covers the full path: UI → transcription → extraction → confirmation display → structured profile written to `tenant_profiles`.

The confirmation message is a critical trust moment — it must feel warm and competent, not robotic. Example: *"You're looking for a 2-bedroom under ₪7,000 in north Tel Aviv, moving in August — and you have a dog, so I'll filter for pet-friendly listings. Finding your best matches now."*

Fields successfully extracted from voice or text are flagged in `tenant_profiles` so the interview (issue 005) skips them automatically.

## Acceptance criteria

- [ ] `tenant_profiles` table exists with columns: `tenant_id`, `budget_max`, `bedrooms`, `move_in_date`, `neighborhoods` (array), `lifestyle_signals` (jsonb), `interview_state` (jsonb), `completed_blocks` (int), `extracted_fields` (array — tracks which fields were captured at this stage)
- [ ] Voice record button captures audio and sends it to Gemini 2.5 Flash for transcription
- [ ] Text input accepts free-form typed preferences
- [ ] Both paths send the resulting text to GPT-4o mini for structured preference extraction
- [ ] Extracted fields (budget, bedrooms, move-in date, neighborhood, lifestyle signals) are written to `tenant_profiles`
- [ ] `extracted_fields` array is populated with the names of all successfully extracted fields
- [ ] AI confirmation message is displayed before the interview begins — it must reference specific extracted details, not be a generic acknowledgement
- [ ] Confirmation message is shown while results are loading (it serves as a natural loading state)
- [ ] If extraction returns no usable fields, the confirmation still shows and the interview starts from block 1 with all questions active

## Blocked by

- `issues/003-tenant-auth.md`

## User stories addressed

- User story 6
- User story 7
- User story 8
- User story 9
