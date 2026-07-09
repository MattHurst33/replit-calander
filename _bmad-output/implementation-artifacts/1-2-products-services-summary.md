---
baseline_commit: 30f7586325c1e1031b4f7128c005e326e67de4fb
---

# Story 1.2: Products & Services Summary

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a sales rep,
I want to see a company's top products/services in the company research,
So that I understand what they sell and can tailor my conversation.

## Acceptance Criteria

1. **Given** a company has completed the foundational overview lookup (Story 1.1), **when** I view the meeting's company snapshot, **then** it also displays a list of the company's top products/services (FR-2.3).
2. **Given** products/services data is unavailable or ambiguous for a company, **when** the snapshot is displayed, **then** the section shows an explicit "not available" state rather than a blank or broken UI.
3. **Given** products/services data is fetched for a company, **when** it is stored, **then** it is added as a field on the existing `companyCache` record for that company, preserving the parent record's 24h TTL rather than creating a duplicate cache entry.
4. **Given** any new code introduced by this story, **when** it is compiled, **then** it passes TypeScript strict mode with zero errors (NFR-4).

## Tasks / Subtasks

- [x] **Task 1: Add `productsServices` column to `companyCache` (AC: #3)**
  - [x] In `shared/schema.ts`, add `productsServices: jsonb("products_services").$type<string[]>()` to the `companyCache` table definition (currently lines 91-109) — nullable jsonb array, same pattern as `meetings.attendeeResponses` (line 79) and `meetings.formData` (line 71)
  - [x] No new table, no new `IStorage` methods, no new unique index — this is one additional column on the record `upsertCompanyCache` already writes (AD-9). Do not create a second cache lookup path.
  - [x] `insertCompanyCacheSchema` (schema.ts, derived via `createInsertSchema(companyCache)`) picks up the new column automatically — no manual zod change needed.
- [x] **Task 2: Fetch products/services in the existing OpenAI research call (AC: #1, #2)**
  - [x] In `server/services/company-intelligence.ts`, add `productsServices: string[]` to the `OpenAiCompanyResearch` interface (currently lines 19-26)
  - [x] Extend the system prompt in `researchViaOpenAi` (currently lines 108-116) to also request `productsServices` — an array of the company's top 3-5 product/service names as strings, or an empty array if not confidently known. Keep the existing "do not fabricate" instruction; it should cover this field too.
  - [x] In the response parsing (currently lines 126-134), read `parsed.productsServices`, defaulting to `[]` when missing/not an array — do not throw if the model omits it.
  - [x] Pass `productsServices: research.productsServices` into **both** `storage.upsertCompanyCache(...)` call sites: the cache-miss path in `enrich()` (currently lines 72-84) and `queueBackgroundRefresh()` (currently lines 157-169). Missing either one means stale-while-revalidate refreshes silently drop the field.
  - [x] Do **not** add a second external call for this — Story 1.1's `CompanyIntelligenceService.enrich()` is the single AD-8 boundary; products/services must ride the same one-call-per-company research request as the rest of the overview.
- [x] **Task 3: Display products/services on the company snapshot (AC: #1, #2)**
  - [x] In `server/routes.ts`, `GET /api/meetings` (currently lines 234-258) already joins `storage.getCompanyCacheByName(meeting.company)` and spreads `companyOverview`/`companyHeadquarters`/`companyFoundingYear` onto each meeting. Add `companyProductsServices: cache.productsServices` to that same spread — do not add a second query or round-trip.
  - [x] In `client/src/components/meeting-card.tsx`, add `companyProductsServices?: string[] | null` to the `MeetingWithCompany` type (currently lines 9-13).
  - [x] Render the section only when the company snapshot itself is present (i.e. `meeting.companyOverview` is set — meaning research actually completed for this meeting, mirroring the existing overview/HQ block at lines 222-231). Within that block:
    - If `companyProductsServices` has one or more entries, render them (e.g. comma-joined or a short list).
    - If it's missing, `null`, or an empty array, render an explicit "Products/services: Not available" line instead of omitting the section — this is what distinguishes AC #2 from Story 1.1's optional-field pattern (HQ/founding-year there are silently omitted when absent; this field must not be).
    - Do **not** show this "not available" state when the company itself is unresolved/timeout (`companyResearchStatus === 'unresolved' | 'timeout'`) — that's already covered by the existing amber indicators at lines 215-220; a redundant "products not available" line there would be confusing noise, not a fix for a broken UI.
- [x] **Task 4: Verify TypeScript strict mode (AC: #4)**
  - [x] Run `npm run check` — zero errors

## Dev Notes

### This story only touches the OpenAI research payload and display — no pipeline changes

Story 1.1 built the full pipeline: resolve → cache lookup → research → write-back → display join. This story does not change that pipeline's control flow, ordering (AD-8/AD-11), timeout (NFR-2), or cache-key normalization at all — it only adds one more field to the JSON the existing research call already returns, and one more field to the existing display join. If your implementation touches `resolveCompanyName`, `enrich()`'s control flow, `getCompanyCache`/`getCompanyCacheByName` lookup logic, or the scanner pipeline's enrich-before-qualify ordering, you are out of this story's scope — those are Story 1.1, already `done`.

### Do not write `productsServices` onto the `meetings` table

Story 1.1's Dev Notes documented exactly which fields must be written back to `meetings` (`company`, `industry`, `revenue`, `companySize`) because `qualification-engine.ts` and `pre-meeting-summary.ts` read those columns directly off the `meetings` row (see `applyCacheToMeeting`, company-intelligence.ts lines 138-146). Neither of those consumers reads products/services, and this story's AC #1 only requires it in "the company snapshot" (display). Keep it in `companyCache` only, delivered via the same `getCompanyCacheByName` join `routes.ts` already does for `overview`/`headquarters`/`foundingYear` — do not add it to `applyCacheToMeeting` or to the `meetings` schema.

### AC #3's "preserving the parent record's 24h TTL" — what this actually means

There's only one `companyCache` row per `(companyName, domain)` (Story 1.1's unique index). Because `productsServices` is fetched in the *same* OpenAI call and written in the *same* `upsertCompanyCache(...)` call as `overview`/`industry`/etc., it automatically shares that record's `researchedAt` and 24h TTL — there's nothing extra to implement for this AC beyond Task 2's "add the field to the existing call sites, don't add a new one." The risk this AC is guarding against is a developer adding a *second* cache table or a separate `getCompanyCache`-style lookup keyed differently for this one field — don't do that.

### Testing standards

Same as Story 1.1: no test framework covers the OpenAI-dependent research path (verify manually — trigger a scan, inspect the returned `productsServices` array and the "not available" UI state for a company where the model returns an empty array). `company-intelligence-utils.ts` / `company-intelligence.test.ts` (Vitest, added during Story 1.1) hold the pure, dependency-free logic (`resolveCompanyName`, `extractCompanyFromText`, `revenueRangeToEstimate`, `isCacheFresh|`); this story doesn't add new pure logic of that kind (parsing `parsed.productsServices` is a one-line default, not worth extracting), so no new test file is expected. If you do add any non-trivial pure logic, follow the established pattern: extract to `company-intelligence-utils.ts`, test with Vitest (`npm run test`).

### Project Structure Notes

- Modified (not new): `shared/schema.ts` (one new column), `server/services/company-intelligence.ts`, `server/routes.ts`, `client/src/components/meeting-card.tsx`
- No new files expected for this story.
- Consistency conventions apply: `{ message }` error JSON shape (unaffected by this story), no direct Drizzle calls outside `storage.ts` (AD-3 — this story adds no new storage methods, so this shouldn't come up, but don't add any), strict TypeScript.
- `npm run db:push` (Drizzle schema migration for the new column) is left for the user to run explicitly, same as Story 1.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Lead-Sweep-2026-07-08/ARCHITECTURE-SPINE.md#AD-8, AD-9] — single service boundary, cache TTL (unchanged by this story, but must not be violated)
- [Source: _bmad-output/implementation-artifacts/1-1-foundational-company-overview-lookup.md] — Story 1.1 (previous story), the pipeline and `companyCache` schema this story extends
- [Source: shared/schema.ts:91-109] — current `companyCache` table columns
- [Source: server/services/company-intelligence.ts:19-26, 103-146, 148-175] — `OpenAiCompanyResearch`, `researchViaOpenAi`, `applyCacheToMeeting`, `queueBackgroundRefresh`
- [Source: server/storage.ts:551-591] — `getCompanyCache`, `getCompanyCacheByName`, `upsertCompanyCache`, `updateCompanyCache`
- [Source: server/routes.ts:234-258] — current `GET /api/meetings` company-snapshot join
- [Source: client/src/components/meeting-card.tsx:8-18, 210-231] — `MeetingWithCompany` type and current snapshot rendering

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit` — after adding `productsServices: jsonb(...).$type<string[]>()` to `companyCache`, `server/storage.ts` failed to compile: drizzle-zod's `createInsertSchema` maps jsonb columns to a generic recursive `Json` zod type by default, not the column's `.$type<string[]>()` phantom type, so `InsertCompanyCache.productsServices` inferred as an incompatible `unknown[]`-shaped type against Drizzle's own stricter `string[]` expectation in `.values()`/`.set()`. Fixed by passing an explicit refine to `createInsertSchema(companyCache, { productsServices: z.array(z.string()).nullable().optional() })` in `shared/schema.ts`. This is a real toolchain gap the story's Task 1 didn't anticipate ("picks up the new column automatically — no manual zod change needed" turned out to be wrong for jsonb-array columns specifically); documenting here since a future story adding another jsonb-array field (e.g. Story 1.4's contacts, 1.5's tech stack) will hit the same issue.
- `npx tsc --noEmit` — final run: 0 errors.
- `npm run test` — 17/17 passing (no changes needed; this story added no new pure logic worth extracting per its own Testing Standards note).

### Completion Notes List

- Added `companyCache.productsServices` (nullable `jsonb` array of strings) — Story 1.1's `companyCache` record now carries products/services alongside overview/industry/etc., sharing the same row and 24h TTL (AC #3).
- Extended the existing single OpenAI research call (`researchViaOpenAi`) to also request `productsServices` in the same JSON response, rather than adding a second call — preserves AD-8 (single `CompanyIntelligenceService` external-call boundary). Parsing defaults to `[]` if the model omits the key or returns something that isn't an array.
- Wired `productsServices` into both `upsertCompanyCache` call sites (`enrich()`'s cache-miss path and `queueBackgroundRefresh()`) so both the initial research and the stale-while-revalidate background refresh persist it.
- Deliberately did **not** write `productsServices` onto the `meetings` table or into `applyCacheToMeeting` — no existing consumer (`qualification-engine.ts`, `pre-meeting-summary.ts`) reads it off the meeting row, only the `GET /api/meetings` → `meeting-card.tsx` display path needs it, consistent with the story's Dev Notes.
- `GET /api/meetings` now also spreads `companyProductsServices: cache.productsServices` from the same `getCompanyCacheByName` join already used for overview/headquarters/foundingYear — no second query added.
- `meeting-card.tsx` renders a "Products/services: …" line whenever `companyOverview` is present (i.e. research completed for that meeting): joins the list with commas if non-empty, otherwise shows "Products/services: Not available" per AC #2. This line does not render when the company itself is unresolved/timeout, since that's already surfaced by the existing amber indicators and a second "not available" message there would be redundant noise rather than useful signal.
- **Toolchain gap found and fixed (see Debug Log):** drizzle-zod does not honor `.$type<T>()` on jsonb columns when generating insert/update zod schemas for array types; required an explicit `refine` override on `createInsertSchema`. Worth flagging for whoever picks up Story 1.4/1.5 (also jsonb-array fields on `companyCache`).

### File List

- `shared/schema.ts` (modified) — added `companyCache.productsServices` jsonb column; added explicit zod refine for that column on `insertCompanyCacheSchema` (drizzle-zod jsonb-array workaround, see Debug Log)
- `server/services/company-intelligence.ts` (modified) — added `productsServices` to `OpenAiCompanyResearch`, extended the OpenAI system prompt and response parsing, passed `productsServices` into both `upsertCompanyCache` call sites
- `server/routes.ts` (modified) — `GET /api/meetings` now also embeds `companyProductsServices` in the company-snapshot join
- `client/src/components/meeting-card.tsx` (modified) — added `companyProductsServices` to `MeetingWithCompany`; renders products/services list or an explicit "Not available" state

## Change Log

- 2026-07-08 — Implemented Story 1.2: `companyCache.productsServices` column, extended the existing OpenAI research call to fetch it (no new external-call boundary), display join + UI with an explicit "not available" state. Found and fixed a drizzle-zod jsonb-array typing gap not anticipated by the story's Task 1 (documented in Debug Log for future jsonb-array stories).
- 2026-07-08 — Code review of the full session diff found 2 bugs, both in the shared pipeline code this story builds on rather than in this story's own added lines (a `upsertCompanyCache` race condition exposed by Story 1.1's concurrency fix, and an `extractCompanyFromText` regression on hyphen/colon-separated titles) — fixed and logged in Story 1.1's Change Log, since that's where the affected code lives. `npm run check` (0 errors) and `npm run test` (19/19) re-verified after the fixes; this story's own `productsServices` feature was unaffected.
