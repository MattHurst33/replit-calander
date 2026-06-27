---
title: Lead-Sweep PRD
status: draft
created: 2026-06-24
updated: 2026-06-24
---

# Lead-Sweep — Product Requirements Document

## Problem

B2B sales reps spend 10–20 minutes per meeting manually researching companies across LinkedIn, Crunchbase, Google News, and company websites. With 5–10 meetings per day this is 1–2 hours of low-value prep time, done under pressure, often incomplete. Reps walk into calls underprepared and miss signals that would change how they position.

## Product Vision

Lead-Sweep connects to a sales rep's calendar, identifies every upcoming meeting, and automatically delivers a pre-meeting intelligence brief — company overview, revenue, headcount, recent news, key contact info, and a suggested sales angle — before they need to ask. The rep opens the app or checks their email and walks into every call knowing exactly who they're talking to.

## Target User

**Primary:** B2B SaaS and field sales reps with 5+ meetings/day at companies 10–5,000 employees. They live in their calendar, sell to mid-market, and are accountable to pipeline metrics.

**Secondary:** Sales managers who want visibility into rep activity and lead quality across the team.

## Core Features

### F1 — Calendar Integration

- **FR-1.1** Connect Google Calendar via OAuth 2.0
- **FR-1.2** Connect Microsoft Outlook Calendar via OAuth 2.0 (MSAL)
- **FR-1.3** Automatically sync calendar events on a configurable schedule (default: every 15 min)
- **FR-1.4** Allow manual sync trigger from dashboard
- **FR-1.5** Display integration status and last sync time per calendar source

### F2 — Company Intelligence Engine

- **FR-2.1** Extract company name from meeting title, description, and attendee email domains
- **FR-2.2** Research and return: company overview, industry, revenue range, employee count, headquarters, founding year
- **FR-2.3** Research and return: top products/services offered
- **FR-2.4** Surface recent news and signals: funding rounds, layoffs, acquisitions, leadership changes, earnings (last 90 days)
- **FR-2.5** Identify key contacts: name, title, LinkedIn profile, tenure at company
- **FR-2.6** Identify likely tech stack (for SaaS sellers)
- **FR-2.7** Generate a suggested sales angle based on company profile and rep's product category
- **FR-2.8** Cache company research results to avoid redundant API calls within 24 hours

### F3 — Pre-Meeting Brief

- **FR-3.1** Deliver a brief to the rep 15 minutes before each meeting (configurable: 15/30/60 min)
- **FR-3.2** Brief displays in-app on the dashboard
- **FR-3.3** Brief optionally delivered via email (user toggle)
- **FR-3.4** Brief is readable in under 60 seconds — one paragraph summary + structured data cards
- **FR-3.5** Brief includes: company snapshot, contact info, recent news, suggested angle, meeting context (how they booked, prior interaction history)

### F4 — Morning Briefing

- **FR-4.1** Send a daily morning email at configurable time (default 7:30 AM) summarizing all meetings for the day
- **FR-4.2** Each meeting entry includes: time, company name, contact name, one-line company snapshot, meeting type
- **FR-4.3** User can enable/disable morning briefing from settings

### F5 — Lead Qualification

- **FR-5.1** Allow rep to define qualification rules (field, operator, value, priority)
- **FR-5.2** Auto-qualify or disqualify meetings based on rules after research is complete
- **FR-5.3** Rep can manually override qualification status per meeting
- **FR-5.4** Meeting statuses: pending, qualified, disqualified, needs_review, no_show, completed
- **FR-5.5** Dashboard shows meeting counts by status

### F6 — Post-Meeting Tracking

- **FR-6.1** Rep marks meeting outcome (completed, no-show, rescheduled)
- **FR-6.2** No-show triggers optional auto-reschedule email workflow
- **FR-6.3** End-of-day summary shows qualified vs disqualified vs pending from that day

### F7 — Email Automation

- **FR-7.1** Send confirmation emails to meeting attendees
- **FR-7.2** Send follow-up emails post-meeting (configurable templates)
- **FR-7.3** Custom email templates per user
- **FR-7.4** Email job queue with status tracking

### F8 — Analytics

- **FR-8.1** No-show rate by time of day, industry, company size, revenue band
- **FR-8.2** Qualification rate over time
- **FR-8.3** Weekly grooming efficiency metrics (time saved, meetings processed)
- **FR-8.4** Manager view: team-level pipeline quality report

### F9 — SaaS Website & Subscriptions

- **FR-9.1** Public marketing/landing page: hero, features, pricing, testimonials, CTA
- **FR-9.2** Subscription tiers (e.g. Solo, Team, Enterprise)
- **FR-9.3** Payment integration (Stripe)
- **FR-9.4** User account management: billing, plan upgrade/downgrade, cancel
- **FR-9.5** Usage limits enforced by subscription tier (e.g. max meetings/month)

## Non-Functional Requirements

- **NFR-1** Pre-meeting briefs delivered within 2 minutes of trigger time
- **NFR-2** Company research completed within 30 seconds per company
- **NFR-3** Calendar sync latency under 30 seconds for manual trigger
- **NFR-4** TypeScript strict mode — zero compilation errors
- **NFR-5** Mobile-responsive web app
- **NFR-6** OAuth tokens encrypted at rest

## Out of Scope (v1)

- Native mobile app
- CRM integration (Salesforce, HubSpot) — post-v1
- Voice/call recording integration
- Real-time meeting assistant (in-call AI)

## Success Metrics

- Rep saves ≥45 minutes/day on manual research
- Pre-meeting brief delivered on time ≥95% of meetings
- 70%+ of active users open their morning briefing daily
- Qualification accuracy ≥80% vs rep manual review

**Counter-metrics:** Brief delivery failure rate, research accuracy complaints, calendar sync errors/day
