# Spiritus Car Rental

Zimbabwe-first, multi-tenant car rental SaaS. This repository currently contains a Phase 0 application scaffold and a **draft** data model. It is not yet ready for operational use.

## Local setup

1. Install Node.js 24 and Docker with Compose.
2. Copy `.env.example` to `.env` and replace development secrets.
3. Run `npm install` and `docker compose up -d`.
4. Run `npm run db:validate`. Review the schema and tenancy constraints before generating the first migration.
5. Run `npm run dev` and open `http://localhost:3000`.

The MinIO bucket in `.env.example` must be created before using object storage. No object storage, authentication, or booking route is active yet.

## Architecture decisions and blockers

- Next.js App Router serves the web app and versioned route handlers. Domain services will own transactions and enforce tenant and branch authorization.
- PostgreSQL is the system of record. Redis will support queues and short-lived coordination; it must not be the sole booking-overlap guard.
- The supplied `schema.prisma` was copied into `prisma/schema.prisma` as a starting point. It currently has single-column relations that can permit cross-tenant references. Composite foreign keys or equivalent database enforcement must be added before accepting business data.
- `prisma/booking-exclusion.sql` is a draft for the first migration. Expired holds, rental extensions, and maintenance blocks need explicit lifecycle and concurrency design before booking is enabled.
- The authentication tables are a draft for Better Auth compatibility and must be checked against the installed adapter before migration.
- Provider-specific payments, tax, and fiscalisation remain unconfigured until actual specifications are available.

## Verification status

The scaffold was created on 2026-10-31. Dependency installation, typecheck, lint, Prisma validation, tests, and migrations were not run successfully because this environment cannot resolve `registry.npmjs.org` and lacks the required packages. There is no database migration or production deployment.

## Next slice

Once dependencies are available: validate and correct the Prisma schema, generate a reviewed initial migration with tenant-consistent composite keys, then implement Better Auth, organization onboarding, and membership-scoped route handlers with cross-tenant integration tests.
