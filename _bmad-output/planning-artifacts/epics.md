---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Lead-Sweep-2026-06-24/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-Lead-Sweep-2026-07-08/ARCHITECTURE-SPINE.md
scopeDecision: unbuilt-features-only
---

# Lead-Sweep - Epic Breakdown

## Overview

This document provides the epic and story breakdown for Lead-Sweep, decomposing requirements from the PRD and Architecture Spine into implementable stories.

**Scope decision (confirmed with user):** F1, F3, F4, F5, F6, F7, F8 already have working services in `server/services/` per the Architecture Spine's Capability → Architecture Map and are treated as already built. This run produces epics and stories only for:

- **F2 — Company Intelligence Engine** (`services/company-intelligence.ts` — marked TO BUILD)
- **F9 — SaaS Website & Subscriptions** (Stripe integration — marked TO BUILD)
- **Architecture gaps** called out in the Spine's Deferred table that block F2/F9: `companyCache` schema, Stripe subscription tier enforcement, company intelligence data source selection

The full FR/NFR inventory below is retained for traceability even though only a subset is in scope for epic design in this run.

## Requirements Inventory

### Functional Requirements

**In scope for this run:**

```
FR-2.1: Extract company name from meeting title, description, and attendee email domains
FR-2.2: Research and return: company overview, industry, revenue range, employee count, headquarters, founding year
FR-2.3: Research and return: top products/services offered
FR-2.4: Surface recent news and signals: funding rounds, layoffs, acquisitions, leadership changes, earnings (last 90 days)
FR-2.5: Identify key contacts: name, title, LinkedIn profile, tenure at company
FR-2.6: Identify likely tech stack (for SaaS sellers)
FR-2.7: Generate a suggested sales angle based on company profile and rep's product category
FR-2.8: Cache company research results to avoid redundant API calls within 24 hours

FR-9.1: Public marketing/landing page: hero, features, pricing, testimonials, CTA
FR-9.2: Subscription tiers (e.g. Solo, Team, Enterprise)
FR-9.3: Payment integration (Stripe)
FR-9.4: User account management: billing, plan upgrade/downgrade, cancel
FR-9.5: Usage limits enforced by subscription tier (e.g. max meetings/month)
```

**Out of scope for this run (already built — F1, F3–F8):**

```
FR-1.1 – FR-1.5   Calendar Integration
FR-3.1 – FR-3.5   Pre-Meeting Brief
FR-4.1 – FR-4.3   Morning Briefing
FR-5.1 – FR-5.5   Lead Qualification
FR-6.1 – FR-6.3   Post-Meeting Tracking
FR-7.1 – FR-7.4   Email Automation
FR-8.1 – FR-8.4   Analytics
```

### NonFunctional Requirements

**Applicable to in-scope epics:**

```
NFR-2: Company research completed within 30 seconds per company (F2 — CompanyIntelligenceService)
NFR-4: TypeScript strict mode — zero compilation errors (all new code)
NFR-5: Mobile-responsive web app (F9 — marketing site, billing pages)
NFR-6: OAuth tokens encrypted at rest (not directly touched by F2/F9, retained for context)
```

**Not directly applicable to in-scope epics (retained for traceability):**

```
NFR-1: Pre-meeting briefs delivered within 2 minutes of trigger time (F3 — already built)
NFR-3: Calendar sync latency under 30 seconds for manual trigger (F1 — already built)
```

### Additional Requirements

From the Architecture Spine, technical requirements that govern F2 and F9 implementation:

- **AD-8 — Single service boundary for company intelligence:** A single `CompanyIntelligenceService` owns all external research (web search, LLM enrichment, news APIs). No other service may call an LLM or external enrichment API directly. Cache check must happen inside this service before any external call. [ASSUMPTION: OpenAI is the LLM provider — data source selection is deferred, see below.]
- **AD-9 — 24-hour company research cache:** Research results stored in a `companyCache` table keyed by normalized `(companyName, domain)`. TTL 24 hours. Stale-while-revalidate: serve cached data immediately, queue background refresh if stale. Cache writes go through `IStorage` (AD-3).
- **AD-11 — Qualification ordering dependency:** `QualificationEngine.qualifyMeeting()` must not run until `CompanyIntelligenceService.enrich()` has resolved for that meeting. F2 must preserve the existing scanner pipeline order: import → enrich → qualify.
- **AD-3 — IStorage boundary:** New tables (`companyCache`, Stripe/subscription tables) require a corresponding method on `IStorage` before any service may use them. No direct Drizzle calls outside `storage.ts`.
- **AD-13 (deferred) — Subscription tier enforcement:** Auth middleware point for enforcing subscription tiers/usage limits (FR-9.5) is not yet decided; F9 stories must include this decision, not assume it.
- **Deferred: Company intelligence data sources** — Choice among Clearbit, Apollo, Crunchbase API, or web search is unresolved; blocks F2 implementation and must be an early story/spike.
- **Deferred: `companyCache` schema** — Exact columns are not yet defined; must be designed as part of F2 stories, following the AD-9 pattern.
- **Deferred: Stripe subscription tier enforcement** — No paying users yet; where/how tier limits are enforced must be decided as part of F9 stories.
- Stack constraints apply to all new code: Node.js 22 + Express + TypeScript ESM (server), React 18 + Vite + TanStack Query + Radix UI + Tailwind (client), Drizzle ORM + PostgreSQL (Neon), Stripe SDK for F9 (per AD-2 stack table extension), zod for validation.
- Consistency conventions apply: kebab-case files, singleton service export pattern, REST noun-first plural routes, `{ message }` error shape, UTC dates, all routes registered in `server/routes.ts` (AD-12).

### UX Design Requirements

No UX design contract exists for this project. F9's public marketing/landing page and billing UI, and any new F2 UI surfaces (e.g. displaying tech stack or sales angle on the brief), will need visual/interaction decisions made inline within story acceptance criteria, or the user may want to run `bmad-ux` separately before implementation.

### FR Coverage Map

```
FR-2.1: Epic 1 - Extract company name from meeting title/description/attendee domains
FR-2.2: Epic 1 - Company overview, industry, revenue range, employee count, HQ, founding year
FR-2.3: Epic 1 - Top products/services offered
FR-2.4: Epic 1 - Recent news and signals (last 90 days)
FR-2.5: Epic 1 - Key contacts (name, title, LinkedIn, tenure)
FR-2.6: Epic 1 - Likely tech stack
FR-2.7: Epic 1 - Suggested sales angle
FR-2.8: Epic 1 - 24-hour company research cache

FR-9.1: Epic 2 - Public marketing/landing page
FR-9.2: Epic 2 - Subscription tiers
FR-9.3: Epic 2 - Stripe payment integration
FR-9.4: Epic 2 - Billing/plan account management
FR-9.5: Epic 2 - Usage limits enforced by tier
```

## Epic List

### Epic 1: Company Intelligence Engine
Reps automatically get accurate, cached company research (overview, news, contacts, tech stack, sales angle) attached to every meeting, sourced through a single service boundary that owns all external research calls.
**FRs covered:** FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5, FR-2.6, FR-2.7, FR-2.8
**Priority:** Build first — unblocks the core product value before Epic 2 monetizes it.

### Epic 2: SaaS Website & Subscriptions
A visitor can learn about Lead-Sweep on a public marketing page, sign up, subscribe to a paid tier via Stripe, and manage or change their plan, with usage limits enforced per tier.
**FRs covered:** FR-9.1, FR-9.2, FR-9.3, FR-9.4, FR-9.5
**Priority:** Build after Epic 1.

**Approved epic structure — build order: Epic 1 first, then Epic 2.**

---

## Epic 1: Company Intelligence Engine

Reps automatically get accurate, cached company research (overview, news, contacts, tech stack, sales angle) attached to every meeting, sourced through a single service boundary that owns all external research calls.

**FRs covered:** FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5, FR-2.6, FR-2.7, FR-2.8
**Governing constraints:** AD-3 (IStorage only), AD-8 (single `CompanyIntelligenceService` boundary), AD-9 (24h `companyCache`, stale-while-revalidate), AD-11 (enrich before qualify), NFR-2 (30s per company), NFR-4 (TS strict)

### Story 1.1: Foundational Company Overview Lookup

As a sales rep,
I want the system to automatically research and display a basic company overview for each of my meetings,
So that I know who I'm meeting with without doing manual research.

**Acceptance Criteria:**

**Given** a meeting has attendee email domains and/or a title/description mentioning a company name
**When** the calendar scanner pipeline processes the meeting
**Then** the company name is resolved using the attendee email domain first, falling back to title/description parsing when the domain is generic (e.g. gmail.com, outlook.com)
**And** this resolution happens for every imported meeting, not just qualified ones

**Given** a company name has been resolved for a meeting
**When** the scanner pipeline runs
**Then** `CompanyIntelligenceService.enrich()` is called and fully resolves before `QualificationEngine.qualifyMeeting()` runs for that meeting
**And** no other service calls an LLM or external enrichment API directly (AD-8)

**Given** a company has never been researched before
**When** `enrich()` runs
**Then** it calls the selected external data source(s) (decision made as part of this story) exactly once
**And** persists the result via `IStorage` into a new `companyCache` table keyed by normalized `(companyName, domain)`

**Given** a company was researched within the last 24 hours
**When** the same company is looked up again, by any user or meeting
**Then** the cached result is returned and no external API/LLM call is made (FR-2.8, AD-9)

**Given** a company's cached result is older than 24 hours
**When** it is looked up
**Then** the stale data is served immediately and a background refresh is queued (stale-while-revalidate, AD-9)

**Given** enrichment completes successfully
**When** the rep views the meeting
**Then** the company snapshot shows: company overview, industry, revenue range, employee count, headquarters, founding year (FR-2.2)

**Given** the company name cannot be confidently resolved
**When** enrichment runs
**Then** the meeting is flagged with an "unresolved company" state instead of failing silently
**And** qualification does not run against incomplete data (AD-11)

**Given** enrichment for a company exceeds 30 seconds
**When** the timeout is hit
**Then** the meeting is marked with a research-timeout state
**And** processing continues for other meetings in the pipeline (NFR-2)

**Given** any new code introduced by this story
**When** it is compiled
**Then** it passes TypeScript strict mode with zero errors (NFR-4)

### Story 1.2: Products & Services Summary

As a sales rep,
I want to see a company's top products/services in the company research,
So that I understand what they sell and can tailor my conversation.

**Acceptance Criteria:**

**Given** a company has completed the foundational overview lookup (Story 1.1)
**When** I view the meeting's company snapshot
**Then** it also displays a list of the company's top products/services (FR-2.3)

**Given** products/services data is unavailable or ambiguous for a company
**When** the snapshot is displayed
**Then** the section shows an explicit "not available" state rather than a blank or broken UI

**Given** products/services data is fetched for a company
**When** it is stored
**Then** it is added as a field on the existing `companyCache` record for that company, preserving the parent record's 24h TTL rather than creating a duplicate cache entry

### Story 1.3: Recent News & Signals

As a sales rep,
I want to see recent news and signals about a company,
So that I can reference timely, relevant context in the meeting.

**Acceptance Criteria:**

**Given** a company's overview has been researched (Story 1.1)
**When** I view the meeting's company snapshot
**Then** it includes any funding rounds, layoffs, acquisitions, leadership changes, or earnings from the last 90 days (FR-2.4)

**Given** no notable news exists for a company in the last 90 days
**When** the snapshot is displayed
**Then** it shows an explicit "no recent notable news" state rather than an empty or broken section

**Given** news signals are found for a company
**When** stored
**Then** they are cached on the same company record and refreshed on the same 24h stale-while-revalidate cycle as the overview (AD-9)

**Given** a cached news item is older than 90 days at the time of a cache refresh
**When** the record is refreshed
**Then** that item is excluded from the returned signals

### Story 1.4: Key Contacts Lookup

As a sales rep,
I want to see key contacts at the company, beyond just my direct meeting attendee,
So that I understand who else may be involved in the buying decision.

**Acceptance Criteria:**

**Given** a company has been researched (Story 1.1)
**When** I view the meeting's company snapshot
**Then** it includes a list of key contacts with name, title, LinkedIn profile link, and tenure at the company (FR-2.5)

**Given** a contact's LinkedIn profile or tenure cannot be determined
**When** that contact is displayed
**Then** the missing field is omitted rather than showing incorrect or placeholder data

**Given** the meeting's actual attendee matches one of the identified key contacts
**When** the snapshot is displayed
**Then** that attendee is visually indicated as "meeting attendee" so the rep isn't confused about who they're already talking to

### Story 1.5: Tech Stack Identification

As a sales rep selling a SaaS product,
I want to see the likely tech stack a prospect company uses,
So that I can position my product relative to what they already have in place.

**Acceptance Criteria:**

**Given** a company has been researched (Story 1.1)
**When** I view the meeting's company snapshot
**Then** it includes a list of identified likely technologies/tools the company uses (FR-2.6)

**Given** tech stack data cannot be determined for a company
**When** the snapshot is displayed
**Then** the section shows an explicit "not available" state

**Given** tech stack data is fetched for a company
**When** it is stored
**Then** it is cached on the existing company record under the same 24h TTL as the rest of the profile

### Story 1.6: Suggested Sales Angle

As a sales rep,
I want a suggested sales angle generated from the full company profile and my product category,
So that I walk into the meeting with a specific point of view instead of generic small talk.

**Acceptance Criteria:**

**Given** a company's overview, products/services, recent news, key contacts, and tech stack have all been researched (Stories 1.1–1.5)
**And** the rep's product category is set in their account settings
**When** enrichment completes
**Then** the system generates a one-paragraph suggested sales angle that references at least one specific fact from the company profile (FR-2.7)

**Given** one or more underlying profile fields are missing (e.g. no recent news found)
**When** the sales angle is generated
**Then** it degrades gracefully using only the available fields rather than failing outright

**Given** the rep's product category is not set
**When** enrichment completes
**Then** the sales angle is omitted for that rep
**And** the rep is prompted to set their product category in settings, rather than generating a generic or incorrect angle

**Given** a sales angle is generated for a company/rep pair
**When** stored
**Then** it is cached alongside the rest of the company record and regenerated only when the underlying cache record refreshes — not on every meeting view — to avoid redundant LLM calls (AD-8, AD-9)

---

## Epic 2: SaaS Website & Subscriptions

A visitor can learn about Lead-Sweep on a public marketing page, sign up, subscribe to a paid tier via Stripe, and manage or change their plan, with usage limits enforced per tier.

**FRs covered:** FR-9.1, FR-9.2, FR-9.3, FR-9.4, FR-9.5
**Governing constraints:** AD-13 (deferred tier-enforcement decision), AD-3 (IStorage only), AD-4 (userId scoping), NFR-5 (mobile-responsive)

### Story 2.1: Public Marketing Page

As a prospective customer,
I want to view a public marketing page describing Lead-Sweep,
So that I can understand what it does and decide whether to sign up.

**Acceptance Criteria:**

**Given** an unauthenticated visitor navigates to the root marketing URL
**When** the page loads
**Then** it displays a hero section, feature highlights, pricing tiers, testimonials, and a clear call-to-action to sign up (FR-9.1)

**Given** the page is viewed on a mobile device
**When** rendered
**Then** all sections reflow responsively without horizontal scrolling or clipped content (NFR-5)

**Given** the visitor clicks the sign-up CTA
**When** redirected
**Then** they land on the existing sign-up/login flow, requiring no new backend work from this story

**Given** the marketing page displays pricing tiers
**When** authored
**Then** tier names and prices are static content owned by this story, not sourced from Stripe — this story ships independently of Story 2.2's Stripe setup

### Story 2.2: Subscription Tiers & Stripe Checkout

As a signed-up user,
I want to subscribe to a paid plan through Stripe,
So that I can start using Lead-Sweep at the tier that fits my needs.

**Acceptance Criteria:**

**Given** the tiers (e.g. Solo, Team, Enterprise) are confirmed
**When** this story is implemented
**Then** corresponding Stripe Products and Prices are created/configured for each tier (FR-9.2)

**Given** an authenticated user without an active subscription
**When** they choose a tier and proceed to checkout
**Then** they are redirected to Stripe Checkout for that tier's price (FR-9.3)

**Given** a Stripe Checkout session completes successfully
**When** Stripe sends the webhook confirmation
**Then** the user's subscription record is created/updated via `IStorage` (AD-3) with the correct tier and status, after verifying the webhook signature

**Given** a checkout session is abandoned or fails
**When** the user returns to the app
**Then** they see their current (unsubscribed) state accurately and can retry, with no orphaned or partially-created subscription record

**Given** new subscription-related tables are needed
**When** created
**Then** they go through `IStorage` (AD-3) — no direct Drizzle calls from route handlers or services outside `storage.ts`

### Story 2.3: Billing & Plan Management

As a subscribed user,
I want to view my billing info and change or cancel my plan,
So that I stay in control of what I'm paying for.

**Acceptance Criteria:**

**Given** an authenticated user has an active subscription (Story 2.2)
**When** they visit account/billing settings
**Then** they see their current plan, price, and next billing date (FR-9.4)

**Given** the user wants to upgrade or downgrade
**When** they select a different tier
**Then** the change is processed through Stripe and reflected in their subscription record via `IStorage`

**Given** the user wants to cancel
**When** they confirm cancellation
**Then** the subscription is marked to cancel per the confirmed cancellation behavior (immediately or at period end), and this is reflected in the user's account state

**Given** a plan change or cancellation happens directly in Stripe (e.g. via Stripe's customer portal)
**When** Stripe sends the corresponding webhook
**Then** the local subscription record is updated to match — the local database is never treated as the source of truth ahead of Stripe

### Story 2.4: Usage Limit Enforcement by Tier

As a subscribed user,
I want my usage (e.g. meetings processed per month) limited according to my subscription tier,
So that the product's costs stay aligned with what I'm paying for.

**Acceptance Criteria:**

**Given** each tier (Story 2.2) has a defined usage limit (e.g. max meetings/month)
**When** this story is implemented
**Then** the enforcement point is explicitly decided and documented — resolving the AD-13 deferred decision — e.g. middleware near `isAuthenticated`, or a check inside the calendar-scanner pipeline

**Given** a user's usage is below their tier's limit
**When** they trigger a limited action (e.g. a new meeting is scanned/processed)
**Then** the action proceeds normally (FR-9.5)

**Given** a user has reached their tier's usage limit
**When** they trigger a limited action
**Then** the action is blocked (or the user is warned, per the confirmed enforcement behavior), with a clear message referencing their current plan and limit

**Given** a user upgrades mid-cycle (Story 2.3)
**When** their new tier's limit takes effect
**Then** enforcement immediately reflects the new limit without requiring a restart or cache clear

**Given** usage counts are tracked
**When** stored
**Then** they go through `IStorage` (AD-3), scoped by `userId` (AD-4)
