## Parent PRD

`docs/prd/phase1-tenant-mvp.md`

## What to build

The AI lifestyle interview state machine. After the voice/text input and confirmation (issue 004), the tenant is presented with follow-up questions in blocks of 3. The interview has up to 5 blocks (15 questions total). Results are gated behind block 1 — after the first 3 questions are answered, listings become visible and the tenant can skip at any point.

Questions pre-filled by the voice/text extraction (tracked in `extracted_fields`) are skipped automatically — the tenant is never asked to repeat themselves.

**Block structure (see PRD for full question list):**
- Block 1: Budget, bedrooms, move-in date (mandatory — gates results)
- Block 2: Neighborhood preference, street character
- Block 3: Proximity needs — transport, schools, religious facilities
- Block 4: Lifestyle — pets, parking, WFH, roommate
- Block 5: Deal-breakers — landlord language, furnished, lease length

After each block completes, `completed_blocks` is incremented in `tenant_profiles` and the tenant profile is updated with any newly captured answers.

## Acceptance criteria

- [ ] Interview UI presents one block of 3 questions at a time
- [ ] Questions already present in `extracted_fields` are skipped — they do not appear in the UI at all
- [ ] Block 1 must be completed before the results view is accessible
- [ ] "Skip remaining questions" control is visible and functional from the moment block 1 is complete
- [ ] Skipping terminates the interview immediately and routes the tenant to results with whatever profile has been built so far
- [ ] `completed_blocks` in `tenant_profiles` is incremented after each block submission
- [ ] All interview answers are merged into the tenant's `tenant_profiles` record — never overwrite fields already captured at the extraction stage
- [ ] If all questions in a block are pre-filled by extraction, that block is skipped entirely and `completed_blocks` is incremented automatically
- [ ] Interview state persists — if the tenant closes the app mid-interview and returns, they resume from where they left off

## Blocked by

- `issues/004-voice-text-input.md`

## User stories addressed

- User story 10
- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
- User story 18
- User story 19
