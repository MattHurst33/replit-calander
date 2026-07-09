---
baseline_commit: 02f4f2871676363918c8be9b61951fe647add111
---

# Story 1.1: Foundational Company Overview Lookup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a sales rep,
I want the system to automatically research and display a basic company overview for each of my meetings,
So that I know who I'm meeting with without doing manual research.

## Acceptance Criteria

1. **Given** a meeting has attendee email domains and/or a title/description mentioning a company name, **when** the calendar scanner pipeline processes the meeting, **then** the company name is resolved using the attendee email domain first, falling back to title/description parsing when the domain is generic (e.g. gmail.com, outlook.com) — and this resolution happens for every imported meeting, not just qualified ones.
2. **Given** a company name has been resolved for a meeting, **when** the scanner pipeline runs, **then** `CompanyIntelligenceService.enrich()` is called and fully resolves before `QualificationEngine.qualifyMeeting()` runs for that meeting, and no other service calls an LLM or external enrichment API directly (AD-8).
3. **Given** a company has never been researched before, **when** `enrich()` runs, **then** it calls the selected external data source(s) (decision made as part of this story) exactly once, and persists the result via `IStorage` into a new `companyCache` table keyed by normalized `(companyName, domain)`.
4. **Given** a company was researched within the last 24 hours, **when** the same company is looked up again, by any user or meeting, **then** the cached result is returned and no external API/LLM call is made (FR-2.8, AD-9).
5. **Given** a company's cached result is older than 24 hours, **when** it is looked up, **then** the stale data is served immediately and a background refresh is queued (stale-while-revalidate, AD-9).
6. **Given** enrichment completes successfully, **when** the rep views the meeting, **then** the company snapshot shows: company overview, industry, revenue range, employee count, headquarters, founding year (FR-2.2).
7. **Given** the company name cannot be confidently resolved, **when** enrichment runs, **then** the meeting is flagged with an "unresolved company" state instead of failing silently, and qualification does not run against incomplete data (AD-11).
8. **Given** enrichment for a company exceeds 30 seconds, **when** the timeout is hit, **then** the meeting is marked with a research-timeout state, and processing continues for other meetings in the pipeline (NFR-2).
9. **Given** any new code introduced by this story, **when** it is compiled, **then** it passes TypeScript strict mode with zero errors (NFR-4).

## Tasks / Subtasks

- [x] **Task 0: Resolve the company-intelligence data source decision (AC: #3)**
  - [x] Evaluate Clearbit / Apollo / Crunchbase API / LLM web-search against cost, data completeness for FR-2.2 fields, and rate limits
  - [x] Document the decision and rationale in this story's Dev Agent Record (Completion Notes) — this resolves the Architecture Spine's "Deferred: Company intelligence data sources" item; do not proceed to Task 3 with an undocumented assumption
  - [x] Confirm required API key env var(s) and add to `.env` handling (never hardcode — see Consistency Conventions)
- [x] **Task 1: Company name resolution (AC: #1, #7)**
  - [x] Add resolution logic: parse domain from `meetings.attendeeEmail` (already populated by `extractMeetingData` in both integration files); if domain is in a generic-provider list (gmail.com, outlook.com, hotmail.com, yahoo.com, icloud.com, etc.), fall back to parsing `meetings.title` / `meetings.description`
  - [x] On failed resolution, set an explicit "unresolved company" state (new field or reuse `qualificationReason`-style status marker — do not silently leave `company` null and proceed)
- [x] **Task 2: `companyCache` schema + IStorage methods (AC: #3, #4, #5)**
  - [x] Add `companyCache` table to `shared/schema.ts` (see Dev Notes schema proposal below)
  - [x] Add `getCompanyCache(companyName, domain)`, `upsertCompanyCache(...)` to `IStorage` interface and `DatabaseStorage` (server/storage.ts) — no direct Drizzle calls elsewhere (AD-3)
  - [x] Add unique index on normalized `(companyName, domain)`
- [x] **Task 3: `CompanyIntelligenceService` (AC: #2, #3, #4, #5, #6, #8)**
  - [x] Create `server/services/company-intelligence.ts`, singleton export pattern matching existing services (e.g. `qualification-engine.ts`)
  - [x] `enrich(meeting)`: check cache first (AD-8/AD-9) → if hit and <24h, return cached → if hit and >24h, return stale data immediately + queue background refresh → if miss, call external source once, persist via IStorage
  - [x] Enforce 30s timeout on the external call (NFR-2); on timeout, mark meeting with research-timeout state, do not throw uncaught
- [x] **Task 4: Wire `enrich()` into the scanner pipeline (AC: #2)**
  - [x] `server/services/google-calendar-integration.ts` — insert `companyIntelligenceService.enrich(meeting)` between `storage.createMeeting(meetingData)` (currently line 152) and `this.qualificationEngine.qualifyMeeting(meeting.id)` (currently line 157)
  - [x] `server/services/outlook-integration.ts` — same insertion, between `storage.createMeeting(meetingData)` (currently line 132) and `this.qualificationEngine.qualifyMeeting(meeting.id)` (currently line 137). This file duplicates the Google integration's structure; apply the same change in both.
  - [x] Do not call `qualifyMeeting` if the company is unresolved (AC #7) — skip qualification and leave the meeting in its unresolved/pending state instead
- [x] **Task 5: Sync company fields onto `meetings` row (AC: #6)**
  - [x] Per the Architecture Spine's sequence diagram (`Intel->>DB: updateMeeting (company fields)`), `enrich()` must write back to the `meetings` row — not only to `companyCache` — so existing consumers keep working (see Dev Notes: Regression Risk below)
  - [x] Resolve the revenue type mismatch (see Dev Notes) before writing `meetings.revenue`
- [x] **Task 6: Display company snapshot (AC: #6)**
  - [x] Extend `GET /api/meetings` (server/routes.ts:234) to join/embed the company snapshot (overview, headquarters, founding year — the fields not already columns on `meetings`) alongside each meeting
  - [x] Extend `client/src/components/meeting-card.tsx` to render the additional snapshot fields (it currently only renders `revenue` and `companySize` inline, lines 198-207)
- [x] **Task 7: Verify TypeScript strict mode (AC: #9)**
  - [x] Run `npm run check` — zero errors

## Dev Notes

### Critical: this is the point where F2 stops being a stub

`extractMeetingData()` in both `google-calendar-integration.ts` and `outlook-integration.ts` **does not currently set `company`, `industry`, `revenue`, or `companySize` at all** — it only sets `title`, `description`, `attendeeEmail`, `attendeeName`, `status`, `formData`. Confirmed by reading both files in full. This means, today, every calendar-imported meeting reaches `QualificationEngine.qualifyMeeting()` with those four fields empty, and `needsManualReview()` (qualification-engine.ts:136-142) flags a meeting as `needs_review` whenever 2+ of `[revenue, companySize, company]` are missing — i.e., almost always, today. This story is what makes that logic meaningful for the first time. Confirm this doesn't regress into a state where `needsManualReview` never fires because fields are now *always* populated with low-confidence guesses — an unresolved company (AC #7) should still be able to reach `needs_review`, not be forced into a false positive.

### Regression risk: existing consumers read `meetings.company/industry/revenue/companySize` directly, not from a cache join

Three call sites read these fields straight off the `meetings` row and must keep working:
- `qualification-engine.ts` — `getMeetingFieldValue()` (lines 108-123) reads `meeting.revenue`, `meeting.companySize`, `meeting.industry`, `meeting.company` directly for rule evaluation
- `pre-meeting-summary.ts` (Morning Briefing, F4 — already built, out of scope for this epic but must not break) — `generateProspectSummary()` reads `meeting.company`, `meeting.industry`, `meeting.revenue` directly
- `client/src/components/meeting-card.tsx` — renders `meeting.revenue` and `meeting.companySize` directly (lines 198-207)

Per Task 5, `enrich()` must continue writing these same columns on the `meetings` row (the Architecture Spine's sequence diagram shows `Intel->>DB: updateMeeting (company fields)` explicitly) — the new `companyCache` table is additive (for the fuller research payload + cross-meeting/cross-user reuse), not a replacement for these columns.

### Must resolve: revenue type mismatch

`meetings.revenue` is `decimal("revenue", { precision: 15, scale: 2 })` — a single precise number — and `qualification-engine.ts` does `Number(fieldValue) >= Number(ruleValue)` for `gte`/`lte` operators. Company intelligence research typically returns a **revenue range** (e.g. "$10M–$50M"), not a point figure, per FR-2.2's own wording ("revenue range"). Recommendation: write a representative point-estimate (e.g. the range midpoint, or low end — pick one and document the choice) into `meetings.revenue` to preserve existing qualification-rule compatibility, and store the human-readable range string separately (e.g. `companyCache.revenueRange` text field) for display. Do not skip this — writing a non-numeric value into `meetings.revenue` will break `evaluateRule()`.

### `companyCache` schema proposal (AD-9: keyed by normalized `(companyName, domain)`, 24h TTL, stale-while-revalidate)

This story defines the schema; Stories 1.2–1.6 each add a field to this same record rather than creating new tables (confirmed in epics.md — each subsequent story explicitly reuses this record). Suggested columns for Story 1.1's scope:

```
companyCache: {
  id: serial primary key,
  companyName: text (normalized, e.g. lowercased/trimmed),
  domain: text nullable (normalized; null when resolved via title/description, not email domain),
  overview: text,
  industry: text,
  revenueRange: text,        // human-readable, e.g. "$10M-$50M" — see revenue type mismatch above
  employeeCount: integer nullable,
  headquarters: text nullable,
  foundingYear: integer nullable,
  source: text,              // which data source produced this — records the Task 0 decision per-record
  researchedAt: timestamp,   // drives the 24h stale-while-revalidate check
  refreshQueuedAt: timestamp nullable,  // prevents duplicate concurrent background refreshes
  createdAt: timestamp default now
}
```

Unique index on `(companyName, domain)`. Stories 1.2–1.6 will later add `productsServices`, `newsSignals`, `contacts`, `techStack` (all naturally `jsonb`, consistent with the existing `attendeeResponses: jsonb(...)` pattern already used on `meetings`) and a `salesAngle` field — note for whoever picks up Story 1.6: sales angle is per-(company, rep-product-category), not purely per-company, which doesn't fit the `(companyName, domain)` cache key cleanly. Flag this tension when Story 1.6 starts; do not solve it in this story.

### API surface for display (Task 6)

`GET /api/meetings` (server/routes.ts:234-242) currently returns the raw `Meeting[]` from `storage.getUserMeetings()` with no join, and the dashboard (`client/src/pages/dashboard.tsx`) queries this endpoint directly (`queryKey: ['/api/meetings']`) to feed `MeetingCard`. Extend this endpoint's response to include the joined company snapshot fields not already present as `meetings` columns (`overview`, `headquarters`, `foundingYear`) rather than introducing a second round-trip per meeting card.

### Stack / library notes

- `openai` (^5.5.1) is already a dependency — matches Architecture Spine AD-2's `[ASSUMPTION: OpenAI is the LLM provider]`. No new LLM SDK dependency needed for whichever piece of enrichment uses an LLM.
- `axios` (^1.10.0) is already available for any HTTP-based data source API calls (used elsewhere in `outlook-integration.ts`).
- No Clearbit/Apollo/Crunchbase SDK is currently installed — whichever source Task 0 selects, add its dependency explicitly and record why in Completion Notes.

### Testing standards

**No test framework is currently installed** (no vitest/jest/mocha in `package.json` — only `tsc` via `npm run check` and an ad hoc `test-db.cjs` script). `tsconfig.json` already excludes `**/*.test.ts`, suggesting tests were anticipated but never wired up. For this story: verify behavior manually against each acceptance criterion (cache hit/miss/stale paths, timeout, unresolved-company path) and confirm `npm run check` passes with zero errors (AC #9). Do not introduce a new test framework as part of this story — that's a separate, larger decision outside this story's scope.

### Project Structure Notes

- New file: `server/services/company-intelligence.ts` — singleton export pattern (`export const companyIntelligenceService = new CompanyIntelligenceService();`), matching every other service in `server/services/`
- Modified (not new): `shared/schema.ts`, `server/storage.ts`, `server/services/google-calendar-integration.ts`, `server/services/outlook-integration.ts`, `server/routes.ts`, `client/src/components/meeting-card.tsx`
- Consistency conventions apply: kebab-case files, `{ message }` error JSON shape, UTC dates, all routes in `server/routes.ts` (AD-12), strict TypeScript, no direct Drizzle calls outside `storage.ts` (AD-3)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Lead-Sweep-2026-07-08/ARCHITECTURE-SPINE.md#AD-8, AD-9, AD-11] — service boundary, cache, ordering constraints
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Lead-Sweep-2026-07-08/ARCHITECTURE-SPINE.md#Core data flow — meeting lifecycle] — sequence diagram confirming `updateMeeting (company fields)` write-back
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Lead-Sweep-2026-07-08/ARCHITECTURE-SPINE.md#Deferred] — company intelligence data source decision, resolved by Task 0
- [Source: server/services/google-calendar-integration.ts:148-161] — existing create→qualify insertion point
- [Source: server/services/outlook-integration.ts:128-141] — existing create→qualify insertion point (mirrors Google)
- [Source: server/services/qualification-engine.ts:108-142] — `getMeetingFieldValue`, `needsManualReview` read `meetings` columns directly
- [Source: server/services/pre-meeting-summary.ts:82-117] — `generateProspectSummary` reads `meetings` columns directly (F4, already built — do not break)
- [Source: shared/schema.ts:54-86] — current `meetings` table columns
- [Source: server/routes.ts:234-242] — current `GET /api/meetings` shape

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npm run check` — initial failure: `tsconfig.json(17,27): error TS5103: Invalid value for '--ignoreDeprecations'` (confirmed pre-existing via `git stash` against baseline commit `02f4f28`)
- `npm run check` — second failure (own new code): `server/services/company-intelligence.ts(189,25): error TS2802` (`matchAll` spread needs ES2015+ iteration) — fixed with `Array.from`
- `npm run check` — final run: exit 0, zero errors

### Completion Notes List

- **Task 0 decision:** Selected **OpenAI (LLM knowledge-based enrichment)** as the company-intelligence data source, using the already-installed `openai` SDK (^5.5.1). Rationale: no Clearbit/Apollo/Crunchbase API key is configured anywhere in this environment (checked `.env.example`, no matches), each would be a new paid vendor dependency requiring user signup/approval, whereas OpenAI is already a project dependency per Architecture Spine AD-2's `[ASSUMPTION: OpenAI is the LLM provider]` and needs only an API key. Trade-off accepted: enrichment relies on the model's training-data knowledge of companies rather than live web/news lookups, so very recent news (FR-2.4, Story 1.3) or small/obscure companies may return thin results — acceptable for this story's scope (FR-2.1/FR-2.2 core overview fields) and revisit if data quality proves insufficient once real usage data exists.
- Added `OPENAI_API_KEY` to `.env.example` as a new required var (no code in the repo previously referenced the `openai` package at all — confirmed via search).
- **companyCache lookup design decision:** `domain` is nullable (companies resolved via title/description fallback have no domain), and Postgres unique indexes treat NULL as distinct from NULL — so an `ON CONFLICT` upsert would silently insert duplicate rows for every no-domain company. Implemented `getCompanyCache`/`upsertCompanyCache` as explicit select-then-insert-or-update in application code instead of relying on `onConflictDoUpdate`, using `isNull()` when domain is null.
- **Display join is by companyName only, not the full cache key:** `GET /api/meetings` and `meeting-card.tsx` needed the company snapshot (overview, headquarters, foundingYear) fields, but the `meetings` row only stores `company` (the resolved name), not `domain`. Added `getCompanyCacheByName()` as a best-effort display join (most-recently-researched match on name alone). Acceptable for this story's MVP scope; flagged as a design compromise, not a full re-verification against the original `(companyName, domain)` cache key.
- **Revenue type resolution:** `meetings.revenue` is a precise decimal; company research returns a range string (e.g. "$10M-$50M"). Implemented `revenueRangeToEstimate()` — parses K/M/B-suffixed figures out of the range string and writes the midpoint as the numeric point-estimate, preserving `QualificationEngine.evaluateRule()`'s `Number(fieldValue) >= Number(ruleValue)` behavior. The full range string is preserved separately on `companyCache.revenueRange` for display.
- **New meeting field:** Added `meetings.companyResearchStatus` (`'unresolved' | 'timeout' | 'completed'`, nullable) rather than overloading the existing `status` enum (which is locked to PRD FR-5.4's qualification statuses: pending/qualified/disqualified/needs_review/no_show/completed) — keeps company-research state and qualification state orthogonal.
- **Qualification skip on incomplete data (AD-11):** Both integration files now skip `qualifyMeeting()` entirely when `enrich()` returns `unresolved` or `timeout` status, per AD-11's "no qualifying against incomplete data." The meeting is still counted as `processed` so scan stats stay accurate; the rep sees an explicit indicator on the card instead of a silently-empty qualification.
- **Company name extraction heuristic (Task 1):** Implemented as a best-effort regex (`with <Company>` / `<Company> meeting|call|demo|...`) since the PRD does not specify an extraction algorithm — returns `null` (→ unresolved state) rather than guessing when no pattern matches. This is a reasonable starting heuristic, not NLP-grade parsing; worth revisiting if unresolved-rate proves too high in practice.
- **Pre-existing, unrelated bug fixed to unblock verification:** `tsconfig.json` had `"ignoreDeprecations": "6.0"`, which is not a valid value for the project's pinned TypeScript 5.6.3 (confirmed via `npx tsc --version`) and caused `npm run check` to fail immediately with `TS5103` on every file, including before any change in this story (verified via `git stash`). Removed the line entirely — TS 5.6.3 does not need it, and the `baseUrl` deprecation warning it was meant to silence only applies to newer TypeScript versions than what this project uses. This was necessary because AC #9 requires `npm run check` to pass, and it could not run at all beforehand.
- **`npm run check` passes with zero errors** after the above fix and one real fix in this story's own new code (see File List) — a `matchAll(...)` spread required ES2015+ iteration support the project's TS target doesn't have; changed to `Array.from(...)`.
- **Not run:** `npm run db:push` (Drizzle schema migration) — a schema-changing operation against a real database is left for the user to run explicitly rather than executed automatically as part of this story.
- **No automated tests added:** confirmed (again, at implementation time) that no test framework (vitest/jest/mocha) exists in this repo. Per this story's own Dev Notes, introducing one is out of scope. Verified behavior by tracing each acceptance criterion against the implementation logic and by the passing `npm run check`. This is a deviation from the general dev-story workflow's red-green-refactor expectation, made deliberately and documented here rather than silently skipped.

## Change Log

- 2026-07-08 — Implemented Story 1.1: `CompanyIntelligenceService` (cache-first, stale-while-revalidate, 30s timeout), `companyCache` schema + IStorage methods, company-name resolution, scanner-pipeline wiring in both calendar integrations, company snapshot API/UI display. Fixed a pre-existing invalid `tsconfig.json` compiler option that blocked `npm run check` entirely.

### File List

- `server/services/company-intelligence.ts` (new) — `CompanyIntelligenceService`: company resolution, cache-first enrichment, stale-while-revalidate, 30s timeout, OpenAI research call
- `shared/schema.ts` (modified) — added `companyCache` table, `meetings.companyResearchStatus` column, insert schema + types
- `server/storage.ts` (modified) — added `getCompanyCache`, `getCompanyCacheByName`, `upsertCompanyCache`, `updateCompanyCache` to `IStorage` + `DatabaseStorage`
- `server/services/google-calendar-integration.ts` (modified) — calls `companyIntelligenceService.enrich()` between meeting creation and qualification; skips qualification on unresolved/timeout
- `server/services/outlook-integration.ts` (modified) — same change as above (mirrors Google integration structure)
- `server/routes.ts` (modified) — `GET /api/meetings` now embeds `companyOverview`, `companyHeadquarters`, `companyFoundingYear` per meeting
- `client/src/components/meeting-card.tsx` (modified) — renders company overview/HQ/founding year, and unresolved/timeout indicators
- `.env.example` (modified) — added `OPENAI_API_KEY`
- `tsconfig.json` (modified) — removed invalid `ignoreDeprecations: "6.0"` (pre-existing bug, unrelated to this story's feature work, blocked AC #9 verification)
