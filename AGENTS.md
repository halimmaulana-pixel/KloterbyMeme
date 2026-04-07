# AGENTS.md

## Project Context
- Product name: `Kloterby Meme`
- Goal: build an MVP web app for arisan operations
- Primary users:
  - `Admin/operator` for daily operational control
  - `Member/anggota` for viewing obligations and uploading proof

## Source Of Truth
- Business and architecture reference:
  - `Kloterby-Meme-Blueprint (1).docx`
  - `Kloterby-State-ERD-v2.docx`
  - `Kloterby-Implementation-Guide-v3.docx`
- UI and visual reference:
  - `kloterby-dashboard.html`
  - `kloterby-semua-kloter.html`
  - `kloterby-detail-kloter.html`
  - `kloterby-form-kloter.html`
  - `kloterby-verification-queue.html`
  - `kloterby-login-member.html`
  - `kloterby-dashboard-member.html`

## Fixed Decisions
- Frontend stack: `Next.js` with `pages router`
- Backend stack: `FastAPI`
- Database: `PostgreSQL`
- Background jobs: `Celery + Redis`
- Frontend admin design must follow the existing admin HTML files
- Frontend member design must follow the existing member HTML files
- MVP delivery order:
  1. Admin flow first
  2. Member flow second
  3. Automation third

## Design Rules
- Do not redesign from scratch
- Treat the existing HTML files as `UI source of truth`
- Preserve the visual language already present in the HTML:
  - Admin: `Fredoka One + Nunito`, colorful playful operational dashboard
  - Member: `Syne + Plus Jakarta Sans + JetBrains Mono`, cleaner premium pastel UI
- Normalize tokens in code, but keep the rendered look close to the HTML references
- Reuse existing layouts, spacing rhythm, badge styles, card density, and sidebar patterns

## Product Scope Rules
- Focus MVP on:
  - kloter creation and management
  - period generation
  - payment expectation tracking
  - proof upload
  - admin verification queue
  - GET readiness and release
  - basic reminders
- Do not build these before MVP core is stable:
  - OCR
  - AI features
  - vector search
  - complex fraud detection
  - advanced reporting
  - deep dispute workflows

## Core Domain Rules
- Core hierarchy:
  - `Tenant -> Kloter -> Period -> PaymentExpectation -> PaymentAttempt -> Disbursement`
- Operational unit is `Period`, not `Member`
- Business logic must live in service layer only
- Route handlers must not contain business logic branches
- Important state transitions must always produce audit logs

## Required States
- Payment states:
  - `EXPECTED`
  - `PROOF_UPLOADED`
  - `AUTO_MATCHED`
  - `MANUAL_REVIEW`
  - `VERIFIED`
  - `LATE`
  - `REJECTED`
  - `DEFAULTED`
- Period states:
  - `UPCOMING`
  - `COLLECTING`
  - `VERIFYING`
  - `READY_GET`
  - `COMPLETED`
  - `PROBLEM`
- Disbursement states:
  - `PENDING`
  - `READY`
  - `RELEASED`
  - `HELD`
  - `DISPUTED`

## Critical Constraints
- `UNIQUE(membership_id, period_id)` on payment expectation
- `UNIQUE(unique_code, period_id)` on payment expectation
- `UNIQUE(kloter_id, slot_number)` on membership
- `UNIQUE(kloter_id, period_number)` on period
- `UNIQUE(period_id)` on disbursement
- `UNIQUE(bank_reference)` on bank transaction
- Enforce tenant isolation in repositories and APIs
- Prevent invalid changes from terminal states
- `GET` may only be released when readiness rules are satisfied

## Build Priority
1. Backend foundation and schema
2. Core services and tests
3. Auth and admin APIs
4. Admin frontend
5. Member APIs and frontend
6. Workers and automation
7. Pilot validation with real operator data

## Frontend Route Targets
- `/login`
- `/admin/dashboard`
- `/admin/kloter`
- `/admin/kloter/new`
- `/admin/kloter/[id]`
- `/admin/payments`
- `/admin/disbursements`
- `/member/home`
- `/member/kloter/[id]`
- `/member/upload`

## Implementation Discipline
- Do not add features outside the fixed scope without approval
- Do not build frontend pages against undefined API contracts
- Do not bypass repositories or services
- Do not start worker automation before state machine, constraints, and main APIs are stable
- Prefer test coverage on service-layer behavior before UI polish

## Working Rule For Agents
- Read `IMPLEMENTATION_PLAN.md` before starting new implementation work
- When making a new page, explicitly map it to one of the HTML reference files
- When making backend changes, preserve the hierarchy and state rules above
- If a requested change conflicts with the frozen decisions here, stop and ask for a product decision before coding
