# IMPLEMENTATION_PLAN.md

## Objective
Build the `Kloterby Meme` MVP as a web application with:
- `Next.js` frontend
- `FastAPI` backend
- `PostgreSQL` database
- `Celery + Redis` for automation

This plan is the execution reference for implementation. It follows the frozen decisions in `AGENTS.md`.

## Final Scope

### MVP Includes
- admin authentication
- member OTP authentication
- kloter creation and management
- period generation
- payment expectation creation
- payment proof upload
- payment verification queue
- late and default handling
- GET readiness check
- GET release
- basic WhatsApp reminders

### Not In MVP
- OCR
- AI features
- complex fraud analysis
- advanced analytics
- deep dispute workflows

## UI Reference Mapping

### Admin
- Dashboard: `kloterby-dashboard.html`
- Kloter list: `kloterby-semua-kloter.html`
- Kloter detail: `kloterby-detail-kloter.html`
- Create kloter: `kloterby-form-kloter.html`
- Payment verification queue: `kloterby-verification-queue.html`

### Member
- Login OTP: `kloterby-login-member.html`
- Home/detail visual basis: `kloterby-dashboard-member.html`

## Sitemap

### Admin Routes
- `/login`
- `/admin/dashboard`
- `/admin/kloter`
- `/admin/kloter/new`
- `/admin/kloter/[id]`
- `/admin/payments`
- `/admin/disbursements`

### Member Routes
- `/member/home`
- `/member/kloter/[id]`
- `/member/upload`

## Domain Model
- `Tenant`
- `AdminUser`
- `Member`
- `Kloter`
- `Membership`
- `Period`
- `PeriodProgress`
- `PaymentExpectation`
- `PaymentAttempt`
- `Disbursement`
- `BankAccount`
- `BankTransaction`
- `LedgerEntry`
- `AuditLog`

## Required State Model

### Payment
- `EXPECTED`
- `PROOF_UPLOADED`
- `AUTO_MATCHED`
- `MANUAL_REVIEW`
- `VERIFIED`
- `LATE`
- `REJECTED`
- `DEFAULTED`

### Period
- `UPCOMING`
- `COLLECTING`
- `VERIFYING`
- `READY_GET`
- `COMPLETED`
- `PROBLEM`

### Disbursement
- `PENDING`
- `READY`
- `RELEASED`
- `HELD`
- `DISPUTED`

## Critical Database Constraints
- `UNIQUE(membership_id, period_id)`
- `UNIQUE(unique_code, period_id)`
- `UNIQUE(kloter_id, slot_number)`
- `UNIQUE(kloter_id, period_number)`
- `UNIQUE(period_id)`
- `UNIQUE(bank_reference)`

## Page Requirements

### `/login`
- admin login form
- member OTP flow
- success redirect by role
- consistent visual style from existing HTML

### `/admin/dashboard`
- KPI cards
- collection overview
- action queue
- problem kloter list

### `/admin/payments`
- verification table
- confidence badge
- approve/reject actions
- bulk verify
- proof preview

### `/admin/kloter`
- searchable/filterable kloter list
- status and progress
- CTA to detail/create

### `/admin/kloter/new`
- multi-step wizard
- summary preview
- validation and defaults

### `/admin/kloter/[id]`
- header summary
- member slots
- periods and progress
- GET readiness

### `/admin/disbursements`
- disbursement ready list
- gross, fee, penalty, net
- release action

### `/member/home`
- list of member kloter
- countdown
- status cards
- timeline
- upload CTA

### `/member/kloter/[id]`
- payment detail
- GET schedule
- expected amount and unique code
- timeline/history

### `/member/upload`
- active expectation selection
- proof upload
- preview and submit state

## API Contract

### Auth
- `POST /auth/login`
- `POST /auth/otp/send`
- `POST /auth/otp/verify`

### Admin
- `GET /dashboard/overview`
- `GET /kloter`
- `POST /kloter`
- `GET /kloter/{id}`
- `GET /collections/today`
- `GET /payments/queue`
- `POST /payments/{id}/verify`
- `POST /payments/{id}/reject`
- `POST /payments/bulk-verify`
- `GET /disbursements/ready`
- `POST /disbursements/{id}/release`

### Member
- `GET /member/home`
- `GET /member/kloter/{id}`
- `POST /member/payments/{id}/proof`

## Backend File Plan

### Core
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/database.py`
- `backend/app/core/enums.py`
- `backend/app/core/exceptions.py`
- `backend/app/core/state_rules.py`
- `backend/app/core/security.py`
- `backend/app/core/events.py`
- `backend/app/core/utils.py`

### Models
- `backend/app/models/tenant.py`
- `backend/app/models/admin.py`
- `backend/app/models/member.py`
- `backend/app/models/kloter.py`
- `backend/app/models/membership.py`
- `backend/app/models/period.py`
- `backend/app/models/payment.py`
- `backend/app/models/disbursement.py`
- `backend/app/models/bank.py`
- `backend/app/models/ledger.py`
- `backend/app/models/audit.py`

### Schemas
- `backend/app/schemas/auth.py`
- `backend/app/schemas/kloter.py`
- `backend/app/schemas/payment.py`
- `backend/app/schemas/disbursement.py`
- `backend/app/schemas/member.py`

### Repositories
- `backend/app/repositories/base_repo.py`
- `backend/app/repositories/kloter_repo.py`
- `backend/app/repositories/period_repo.py`
- `backend/app/repositories/payment_repo.py`
- `backend/app/repositories/member_repo.py`
- `backend/app/repositories/bank_repo.py`

### Services
- `backend/app/services/kloter_service.py`
- `backend/app/services/period_service.py`
- `backend/app/services/payment_service.py`
- `backend/app/services/disbursement_service.py`
- `backend/app/services/matching_service.py`
- `backend/app/services/member_service.py`
- `backend/app/services/audit_service.py`

### API
- `backend/app/api/router.py`
- `backend/app/api/deps.py`
- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/kloter.py`
- `backend/app/api/routes/periods.py`
- `backend/app/api/routes/payments.py`
- `backend/app/api/routes/disbursements.py`
- `backend/app/api/routes/members.py`

### Workers
- `backend/app/workers/celery_app.py`
- `backend/app/workers/reminder_worker.py`
- `backend/app/workers/penalty_worker.py`
- `backend/app/workers/matching_worker.py`
- `backend/app/workers/period_worker.py`

### Events
- `backend/app/events/payment_events.py`
- `backend/app/events/period_events.py`
- `backend/app/events/member_events.py`

### Tests
- `backend/tests/test_payment_states.py`
- `backend/tests/test_period_flow.py`
- `backend/tests/test_disbursement_flow.py`
- `backend/tests/test_auth.py`

## Frontend File Plan

### App Shell
- `frontend/pages/_app.js`
- `frontend/lib/api.js`
- `frontend/lib/auth.js`
- `frontend/styles/theme.css`

### Admin Components
- `frontend/components/admin/AdminLayout.js`
- `frontend/components/admin/AdminSidebar.js`
- `frontend/components/admin/AdminTopbar.js`
- `frontend/components/admin/StatCard.js`
- `frontend/components/admin/KloterCard.js`
- `frontend/components/admin/VerificationQueueTable.js`
- `frontend/components/admin/KloterWizard.js`
- `frontend/components/admin/PeriodProgressPanel.js`
- `frontend/components/admin/DisbursementPanel.js`

### Member Components
- `frontend/components/member/MemberLayout.js`
- `frontend/components/member/OtpLoginCard.js`
- `frontend/components/member/KloterTimeline.js`
- `frontend/components/member/CountdownCard.js`
- `frontend/components/member/ProofUploadCard.js`

### Pages
- `frontend/pages/login.js`
- `frontend/pages/admin/dashboard.js`
- `frontend/pages/admin/payments.js`
- `frontend/pages/admin/kloter/index.js`
- `frontend/pages/admin/kloter/new.js`
- `frontend/pages/admin/kloter/[id].js`
- `frontend/pages/admin/disbursements.js`
- `frontend/pages/member/home.js`
- `frontend/pages/member/kloter/[id].js`
- `frontend/pages/member/upload.js`

## Execution Order
1. project setup
2. backend core
3. database models and migration
4. repositories
5. services
6. service tests
7. auth and admin APIs
8. admin frontend shell
9. admin pages
10. member APIs
11. member pages
12. workers and automation
13. pilot validation

## Task Board

### Phase 0: Project Setup
- `[ ]` create `backend/` and `frontend/`
- `[ ]` create `.env.example`
- `[ ]` setup app bootstrap for backend and frontend
- `[ ]` setup theme and fonts

### Phase 1: Backend Domain
- `[ ]` create core files
- `[ ]` create domain models
- `[ ]` create migration
- `[ ]` verify schema bootstraps correctly

### Phase 2: Services
- `[ ]` implement period service
- `[ ]` implement payment service
- `[ ]` implement disbursement service
- `[ ]` implement audit logging
- `[ ]` add service tests

### Phase 3: APIs
- `[ ]` implement auth routes
- `[ ]` implement admin routes
- `[ ]` implement member routes
- `[ ]` validate tenant isolation

### Phase 4: Admin Frontend
- `[ ]` create admin layout
- `[ ]` implement dashboard
- `[ ]` implement payments queue
- `[ ]` implement kloter list
- `[ ]` implement kloter detail
- `[ ]` implement create kloter

### Phase 5: Member Frontend
- `[ ]` implement member login flow
- `[ ]` implement member home
- `[ ]` implement member detail
- `[ ]` implement proof upload

### Phase 6: Automation
- `[ ]` setup celery and redis integration
- `[ ]` implement reminder worker
- `[ ]` implement penalty worker
- `[ ]` implement matching worker

### Phase 7: Pilot Readiness
- `[ ]` create realistic seed data
- `[ ]` run admin smoke test
- `[ ]` run member smoke test
- `[ ]` verify audit logs and state safety
- `[ ]` validate with one real operator

## Definition Of Done
- admin can create kloter
- period can be generated
- expectations are created
- member can upload proof
- admin can verify payment
- period can move to `READY_GET`
- admin can release GET
- audit log exists for critical actions
- one real operator can run the flow end-to-end
