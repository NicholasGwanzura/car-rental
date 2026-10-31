# Car Rental Management SaaS — Technical Implementation Plan

## Purpose
Zimbabwe-first multi-tenant SaaS for vehicle rental companies, built by Spiritus Systems. Full scope includes platform administration, tenant onboarding, fleet, customers, pricing, bookings, rental lifecycle, inspections, finance, maintenance, reporting, notifications and customer booking portal.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Better Auth, Prisma 7, PostgreSQL 16+, Redis/BullMQ, S3-compatible storage, Resend, React PDF, Recharts, Vitest, Playwright, Sentry, Docker/Dokploy, GitHub Actions. Modular monolith. Runtime adapter for Prisma; Prisma 7 datasource connection configuration in prisma.config.ts.

## Security and tenancy
Memberships link users to organisations; branch scope optional. Platform and tenant RBAC separate. Every repository query must filter tenant ID and enforce membership. Tenant consistency must also be checked at database level through composite foreign keys and/or carefully designed RLS. Cross-tenant IDOR tests mandatory. Sensitive files stored private with signed URLs, encrypted integration secrets, audited access and retention policies.

## Workstreams and target sequence
1. Foundation (weeks 1–2): architecture, CI, local infrastructure, authentication, tenant onboarding, RBAC, schema migrations.
2. Fleet/customers (weeks 3–4): categories, vehicles, branches, documents, KYC, verification.
3. Pricing/bookings (weeks 5–6): quotes, discounts, availability, holds, booking calendar, concurrency safeguards.
4. Rental operations (weeks 7–8): agreement PDFs, digital signatures, check-out/check-in, inspections, extension, damage, incidents.
5. Finance (weeks 9–10): invoices, payments, provider callbacks, receipts, allocations, deposit ledger, refund approval and reconciliation.
6. Maintenance/reports (weeks 11–12): jobs, expenses, reminders, utilisation, revenue, receivables and fleet profitability.
7. SaaS/customer portal (weeks 13–14): public booking, tenant plans/limits, subscription integration, notifications and exports.
8. Hardening and launch (weeks 15–16): E2E/security/load tests, observability, backup restore, staging, pilot, Dokploy rollout and training.
Timeline assumes focused implementation capacity, stable requirements and timely integration access; not a contractual guarantee.

## Core state machines
Booking: DRAFT -> HELD -> CONFIRMED -> COMPLETED, with CANCELLED/EXPIRED terminal branches.
Rental: PENDING_CHECKOUT -> ACTIVE -> RETURNED -> CLOSED, with OVERDUE and DISPUTED paths.
Invoice: DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID, or VOID by authorised reversal.
Payment: PENDING -> SUCCEEDED/FAILED, with separately recorded reversals/refunds.
Vehicle: AVAILABLE/RESERVED/RENTED/MAINTENANCE/INACTIVE; status derives from operational events where possible.

## Key invariants
- Vehicle cannot be allocated to overlapping live bookings; database exclusion constraints and transaction-safe service logic required.
- Availability must account for maintenance blocks, active rentals, holds and extensions.
- Booking, customer, vehicle, branch, rate plan and rental must all belong to the same tenant.
- No customer-facing success until payment provider verification.
- Security deposits are liabilities; invoice payments and deposits have separate accounting semantics.
- Monetary arithmetic is currency-safe and integer-minor-unit or exact decimal.
- Audit records and outbox events written atomically with critical mutations.

## Main API families
/api/v1/organizations, /branches, /memberships, /vehicles, /categories, /customers, /drivers, /rate-plans, /availability, /quotes, /bookings, /rentals, /inspections, /maintenance, /expenses, /invoices, /payments, /deposits, /refunds, /reports, /notifications, /subscriptions. Separate /api/webhooks/payment-provider for verified external callbacks.

## Infrastructure
Staging and production deployments on Dokploy; separate PostgreSQL, Redis, object storage buckets and encryption keys. Run worker process separately from Next.js web process. TLS and HTTPS-only cookies. Daily encrypted backups, tested restores, monitoring/alerting, migration rollback plan and immutable image tags. Health and readiness probes. CI gates: lint, typecheck, unit/integration tests, migration check and Playwright smoke suite.

## Zimbabwe specifics
Default timezone Africa/Harare. USD default, optional ZWG/ZAR with explicit currency conversion. Zimbabwe driver licence and national ID/passport verification workflow. EcoCash/card/bank adapters only after actual provider documentation and credentials. VAT/fiscalisation adapter and tax rules configurable; confirm legal applicability before enabling. WhatsApp and SMS opt-in and delivery receipts.

## First release acceptance test
Create two tenants; tenant A cannot see tenant B data. Create branches, staff, vehicles, rate plan and customer. Quote and reserve a vehicle; concurrent second reservation fails cleanly. Generate agreement; verify payment sandbox callback; complete check-out with photos, fuel and odometer; extend; check-in; issue invoice; refund deposit; generate accurate statements and audit trail. Run successful backup/restore test.

## Included files
- schema.prisma — extensive initial data model (review and extend before migrations)
- booking-exclusion.sql — PostgreSQL exclusion constraint example (apply via migration)
- DEEPSEEK_MASTER_PROMPT.md — detailed coding agent execution instructions
