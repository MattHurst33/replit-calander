# Story 1.1: Foundational Company Overview Lookup

Status: ready-for-dev

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

- [ ] **Task 0: Resolve the company-intelligence data source decision (AC: #3)**
  - [ ] Evaluate Clearbit / Apollo / Crunchbase API / LLM web-search against cost, data completeness for FR-2.2 fields, and rate limits
  - [ ] Document the decision and rationale in this story's Dev Agent Record (Completion Notes) — this resolves the Architecture Spine's "Deferred: Company intelligence data sources" item; do not proceed to Task 3 with an undocumented assumption
  - [ ] Confirm required API key env var(s) and add to `.env` handling (never hardcode — see Consistency Conventions)
- [ ] **Task 1: Company name resolution (AC: #1, #7)**
  - [ ] Add resolution logic: parse domain from `meetings.attendeeEmail` (already populated by `extractMeetingData` in both integration files); if domain is in a generic-provider list (gmail.com, outlook.com, hotmail.com, yahoo.com, icloud.com, etc.), fall back to parsing `meetings.title` / `meetings.description`
  - [ ] On failed resolution, set an explicit "unresolved company" state (new field or reuse `qualificationReason`-style status marker — do not silently leave `company` null and proceed)
- [ ] **Task 2: `companyCache` schema + IStorage methods (AC: #3, #4, #5)**
  - [ ] Add `companyCache` table to `shared/schema.ts` (see Dev Notes schema proposal below)
  - [ ] Add `getCompanyCache(companyName, domain)`, `upsertCompanyCache(...)` to `IStorage` interface and `DatabaseStorage` (server/storage.ts) — no direct Drizzle calls elsewhere (AD-3)
  - [ ] Add unique index on normalized `(companyName, domain)`
- [ ] **Task 3: `CompanyIntelligenceService` (AC: #2, #3, #4, #5, #6, #8)**
  - [ ] Create `server/services/company-intelligence.ts`, singleton export pattern matching existing services (e.g. `qualification-engine.ts`)
  - [ ] `enrich(meeting)`: check cache first (AD-8/AD-9) → if hit and <24h, return cached → if hit and >24h, return stale data immediately + queue background refresh → if miss, call external source once, persist via IStorage
  - [ ] Enforce 30s timeout on the external call (NFR-2); on timeout, mark meeting with research-timeout state, do not throw uncaught
- [ ] **Task 4: Wire `enrich()` into the scanner pipeline (AC: #2)**
  - [ ] `server/services/google-calendar-integration.ts` — insert `companyIntelligenceService.enrich(meeting)` between `storage.createMeeting(meetingData)` (currently line 152) and `this.qualificationEngine.qualifyMeeting(meeting.id)` (currently line 157)
  - [ ] `server/services/outlook-integration.ts` — same insertion, between `storage.createMeeting(meetingData)` (currently line 132) and `this.qualificationEngine.qualifyMeeting(meeting.id)` (currently line 137). This file duplicates the Google integration's structure; apply the same change in both.
  - [ ] Do not call `qualifyMeeting` if the company is unresolved (AC #7) — skip qualification and leave the meeting in its unresolved/pending state instead
- [ ] **Task 5: Sync company fields onto `meetings` row (AC: #6)**
  - [ ] Per the Architecture Spine's sequence diagram (`Intel->>DB: updateMeeting (company fields)`), `enrich()` must write back to the `meetings` row — not only to `companyCache` — so existing consumers keep working (see Dev Notes: Regression Risk below)
  - [ ] Resolve the revenue type mismatch (see Dev Notes) before writing `meetings.revenue`
- [ ] **Task 6: Display company snapshot (AC: #6)**
  - [ ] Extend `GET /api/meetings` (server/routes.ts:234) to join/embed the company snapshot (overview, headquarters, founding year — the fields not already columns on `meetings`) alongside each meeting
  - [ ] Extend `client/src/components/meeting-card.tsx` to render the additional snapshot fields (it currently only renders `revenue` and `companySize` inline, lines 198-207)
- [ ] **Task 7: Verify TypeScript strict mode (AC: #9)**
  - [ ] Run `npm run check` — zero errors

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

### Debug Log References

### Completion Notes List

### File List
