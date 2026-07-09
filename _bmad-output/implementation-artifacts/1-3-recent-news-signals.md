---
baseline_commit: e05019d2dd845c2308d0f5fb5345a128816c2be3
---

# Story 1.3: Recent News & Signals

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a sales rep,
I want to see recent news and signals about a company,
So that I can reference timely, relevant context in the meeting.

## Acceptance Criteria

1. **Given** a company's overview has been researched (Story 1.1), **when** I view the meeting's company snapshot, **then** it includes any funding rounds, layoffs, acquisitions, leadership changes, or earnings from the last 90 days (FR-2.4).
2. **Given** no notable news exists for a company in the last 90 days, **when** the snapshot is displayed, **then** it shows an explicit "no recent notable news" state rather than an empty or broken section.
3. **Given** news signals are found for a company, **when** stored, **then** they are cached on the same company record and refreshed on the same 24h stale-while-revalidate cycle as the overview (AD-9).
4. **Given** a cached news item is older than 90 days at the time of a cache refresh, **when** the record is refreshed, **then** that item is excluded from the returned signals.
5. **Given** any new code introduced by this story, **when** it is compiled, **then** it passes TypeScript strict mode with zero errors (NFR-4).

## Tasks / Subtasks

- [ ] **Task 1: Add `newsSignals` column to `companyCache` (AC: #3)**
  - [ ] In `shared/schema.ts`, add a `NewsSignal` shape and column: `newsSignals: jsonb("news_signals").$type<NewsSignal[]>()` on the `companyCache` table (currently lines 91-110), same pattern as Story 1.2's `productsServices` (line 103).
  - [ ] Define `NewsSignal` as `{ headline: string; date: string; category: string }` — `date` is an ISO date string (`YYYY-MM-DD`); it's what AC #4's 90-day filter reads. `category` is free text (e.g. "funding", "layoffs", "acquisition", "leadership_change", "earnings") — not a DB-level enum, consistent with how `industry`/`revenueRange` are already plain `text` elsewhere in this table.
  - [ ] **Repeat the exact drizzle-zod workaround from Story 1.2**: `createInsertSchema(companyCache, {...})` (currently lines 253-259) needs `newsSignals: z.array(z.object({ headline: z.string(), date: z.string(), category: z.string() })).nullable().optional()` added to its refine object alongside `productsServices`. Story 1.2's Dev Agent Record documented why this is required — drizzle-zod maps jsonb columns to a generic recursive `Json` schema by default, which doesn't match a `.$type<T[]>()` array column, and produces a TypeScript compile error in `storage.ts` if skipped. Do not assume "no manual zod change needed" — verify with `npx tsc --noEmit` before moving on.
- [ ] **Task 2: 90-day recency filter as pure, tested logic (AC: #4)**
  - [ ] In `server/services/company-intelligence-utils.ts`, add `export function filterRecentNewsSignals(signals: NewsSignal[], now: Date = new Date(), maxAgeDays = 90): NewsSignal[]` — drops any item whose `date` is unparseable (`isNaN(new Date(item.date).getTime())`) or older than `maxAgeDays` from `now`. Follow the `isCacheFresh` pattern already in this file (injectable `now` for testability, exported alongside the other pure helpers).
  - [ ] Add Vitest cases to `server/services/company-intelligence.test.ts`: an item just under 90 days old is kept, an item just over is dropped, an item with an unparseable date is dropped (defensive — don't display something we can't confirm is recent), and an empty input returns `[]`. This story, unlike Story 1.2, has non-trivial pure logic worth testing — do not skip this.
- [ ] **Task 3: Fetch news signals in the existing OpenAI research call (AC: #1)**
  - [ ] In `server/services/company-intelligence.ts`, add `newsSignals: NewsSignal[]` to the `OpenAiCompanyResearch` interface (currently lines 19-27; import `NewsSignal` from `@shared/schema` or re-export it from `company-intelligence-utils.ts` — pick one source of truth, don't redeclare the shape a third time).
  - [ ] Extend the system prompt in `researchViaOpenAi` (currently lines 111-119) to also request `newsSignals` — array of objects with `headline`, `date` (ISO `YYYY-MM-DD`, best estimate), `category`, covering funding rounds, layoffs, acquisitions, leadership changes, and earnings from roughly the last 90 days, or an empty array if none known. Keep the existing "do not fabricate" instruction covering this field.
  - [ ] In response parsing (currently lines 130-139), read `parsed.newsSignals`, defaulting to `[]` if missing/not an array — same defensive pattern as `productsServices`.
  - [ ] **Known limitation, already flagged in Story 1.1's Completion Notes**: this service does knowledge-based LLM research (no live web/news API), so recency and completeness of `newsSignals` depends entirely on the model's training-data knowledge — it cannot see genuinely breaking news. This was an accepted trade-off when Story 1.1 picked OpenAI as the data source; do not attempt to add a second web-search API call in this story to compensate (that would violate AD-8's single-service-boundary rule and is out of this story's scope). Document actual observed data quality in Completion Notes instead.
- [ ] **Task 4: Apply the 90-day filter at cache-write time, in both research paths (AC: #4)**
  - [ ] In `enrich()`'s cache-miss path (currently lines 71-89), call `filterRecentNewsSignals(research.newsSignals)` and pass the *filtered* result into `storage.upsertCompanyCache(...)` as `newsSignals`.
  - [ ] In `queueBackgroundRefresh()` (currently lines 153-181), same thing — filter before the `storage.upsertCompanyCache(...)` call at line ~162-176. This is the path that actually satisfies AC #4's literal wording ("at the time of a cache refresh") for a company whose cache already existed; the cache-miss path is the initial-research equivalent. **Do not filter only one of the two paths** — Story 1.2's Dev Notes already called out this exact "both call sites" trap for `productsServices`; the same trap applies here.
  - [ ] Do not filter on the cache-hit-and-fresh read path (`enrich()` lines 58-63) — AC #4 scopes filtering to refresh time, not every read. A signal that ages past 90 days while the record is still within its 24h freshness window is a rare, low-stakes edge case not worth adding read-path filtering complexity for.
- [ ] **Task 5: Display news signals on the company snapshot (AC: #1, #2)**
  - [ ] In `server/routes.ts`, `GET /api/meetings` (currently lines 234-258) — add `companyNewsSignals: cache.newsSignals` to the existing spread (alongside `companyOverview`/`companyProductsServices`/etc., currently lines 245-251). Same join, no new query.
  - [ ] In `client/src/components/meeting-card.tsx`, add `companyNewsSignals?: NewsSignal[] | null` to the `MeetingWithCompany` type (currently lines 9-14) — import `NewsSignal` from `@shared/schema`.
  - [ ] Render only when `meeting.companyOverview` is set (same gating as Story 1.2's products/services block, currently lines 233-239) — mirrors that story's reasoning: don't show a "no news" state on top of the existing unresolved/timeout indicators (lines 216-221).
    - If `companyNewsSignals` has one or more entries, render them (e.g. each item's `headline` on its own line, optionally with `date`).
    - If missing, `null`, or empty, render an explicit "No recent notable news" line — same pattern as Story 1.2's "Not available" state (AC #2).
- [ ] **Task 6: Verify TypeScript strict mode (AC: #5)**
  - [ ] Run `npm run check` — zero errors
  - [ ] Run `npm run test` — all existing tests plus this story's new ones passing

## Dev Notes

### This is the same shape of change as Story 1.2 — reuse its pattern exactly

Story 1.2 added `productsServices` to the same `companyCache` record via the same single OpenAI call, the same two upsert call sites, and the same `GET /api/meetings` → `meeting-card.tsx` display path. This story does the same thing for `newsSignals`. If you find yourself touching `resolveCompanyName`, the scanner pipeline's enrich-before-qualify ordering (AD-8/AD-11), the cache-key normalization/case-insensitive lookup in `storage.ts`, or the bounded-concurrency scan logic in the two calendar integration files — stop, you're out of scope. None of that changes for this story.

### The one genuinely new piece: per-item date filtering (AC #4)

Story 1.2 had no analog to this — `productsServices` items don't expire individually. `newsSignals` items do (90 days), independent of the parent record's 24h cache TTL. A company record can sit un-refreshed for months (stale-while-revalidate only re-researches on next access, not proactively) — when it finally does refresh, any news item the model returns that's now >90 days old must be dropped before it's persisted. This is why Task 2 is pure, tested logic rather than an inline one-liner like Story 1.2's array-type check.

### Known data-quality ceiling (already flagged before this story existed)

Story 1.1's Completion Notes, when justifying the OpenAI-knowledge-based approach (Task 0's data-source decision), explicitly said: *"very recent news (FR-2.4, Story 1.3) ... may return thin results — acceptable for this story's scope and revisit if data quality proves insufficient once real usage data exists."* That's this story. Expect the model to sometimes return `[]` for companies with no notable training-data-era news, or occasionally return news that reads as dated. That's a known, accepted trade-off — the fix if it proves inadequate later is a data-source change (a future story/spike), not something to solve by adding a second API call here (would violate AD-8).

### Do not write `newsSignals` onto the `meetings` table

Same reasoning as Story 1.2: `qualification-engine.ts` and `pre-meeting-summary.ts` only read `company`/`industry`/`revenue`/`companySize` off the `meetings` row directly (see Story 1.1's Dev Notes "Regression risk" section) — neither needs news signals. Keep it in `companyCache` only, delivered through the existing `getCompanyCacheByName` display join.

### Testing standards

Unlike Story 1.2, this story has real pure logic worth unit testing: `filterRecentNewsSignals`. Follow the established pattern in `company-intelligence-utils.ts` / `company-intelligence.test.ts` (Vitest, `now` injectable for deterministic date-boundary tests — see `isCacheFresh`'s existing tests for the exact style to match). The OpenAI-dependent research call itself still has no automated coverage (verify manually, same as Stories 1.1/1.2).

### Project Structure Notes

- Modified (not new): `shared/schema.ts`, `server/services/company-intelligence-utils.ts`, `server/services/company-intelligence.ts`, `server/services/company-intelligence.test.ts`, `server/routes.ts`, `client/src/components/meeting-card.tsx`
- No new files expected.
- `npm run db:push` left for the user to run explicitly (same as Stories 1.1/1.2).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — acceptance criteria origin
- [Source: _bmad-output/implementation-artifacts/1-2-products-services-summary.md] — Story 1.2 (previous story) — the exact pattern this story repeats, including its Debug Log entry on the drizzle-zod jsonb-array typing gap
- [Source: _bmad-output/implementation-artifacts/1-1-foundational-company-overview-lookup.md#Completion Notes List] — Task 0 data-source decision, and the explicit call-out that FR-2.4/Story 1.3 news quality is capped by the OpenAI-knowledge-based approach
- [Source: shared/schema.ts:91-110] — current `companyCache` table columns
- [Source: server/services/company-intelligence.ts] — full current file (`enrich`, `researchViaOpenAi`, `queueBackgroundRefresh` — all touched)
- [Source: server/services/company-intelligence-utils.ts] — pure helpers file; `isCacheFresh` (lines ~90-94) is the pattern to follow for `filterRecentNewsSignals`
- [Source: server/storage.ts:551-609] — `getCompanyCache`, `getCompanyCacheByName`, `upsertCompanyCache` (now includes a race-retry fix from a post-1.2 review — do not touch without reading it first), `updateCompanyCache`
- [Source: server/routes.ts:234-258] — current `GET /api/meetings` company-snapshot join
- [Source: client/src/components/meeting-card.tsx:9-14, 233-239] — `MeetingWithCompany` type and Story 1.2's products/services block (the pattern to mirror)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
