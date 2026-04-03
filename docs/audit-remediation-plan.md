# Fixly Audit Remediation Plan

## Purpose

This document turns the code audit into an execution plan. It is the working source of truth for refactoring, hardening, and testing the Fixly codebase until it is trustworthy enough to present to recruiters and robust enough to run as a real product.

## Non-Negotiable Rules

- Do not add new product features until the existing implementation is stable.
- No route may rely on a stub service once its phase is complete.
- No phase is considered done until `npm run typecheck`, `npm run lint`, and the relevant tests pass.
- All new backend behavior must have at least unit or integration coverage.
- All critical user flows must have E2E coverage before final sign-off.
- Prefer extracting logic into `lib/services`, `lib/validations`, `hooks`, and route-local helpers instead of growing page files.

## Definition of Done

The remediation effort is complete only when all of the following are true:

- `npm run typecheck` passes
- `npm run lint` passes without meaningful warnings
- `npm test` passes
- `npm run test:e2e` passes for core flows
- stub-backed routes are replaced with real implementations
- oversized files are split to reasonable responsibilities
- encoding and content-quality issues are removed
- README and deployment docs reflect the actual architecture

## Phase 0: Baseline and Repo Hygiene

### Goals

- Freeze a reliable starting point.
- Remove noise that makes the repo look unfinished.
- Create visibility into what must be fixed.

### Tasks

- Remove generated and local artifact directories from the tracked working set:
  - `.next_prebuild_backup`
  - `.next_stale_*`
  - `.scan`
  - `coverage`
  - `test-results*`
- Verify `.gitignore` still covers all local tool output and generated assets.
- Record baseline counts:
  - failing unit tests
  - failing integration tests
  - lint warnings
  - files over 500 lines
  - API routes without integration tests
- Create a route-to-test coverage matrix for `app/api/**/route.ts`.

### Exit Criteria

- The repo contains only source, docs, tests, and intentional assets.
- We have a written baseline of failing areas and missing coverage.

## Phase 1: Repair the Test Foundation

### Goals

- Make the test harness reliable before changing business logic.
- Eliminate the Vitest/Jest mismatch and restore trust in failures.

### Primary Targets

- `tests/setup.ts`
- `jest.setup.js`
- `vitest.config.ts`
- `jest.config.js`
- all failing unit tests under `tests/unit`

### Tasks

- Standardize mocking strategy:
  - use `vi.fn`/`vi.mock` for Vitest unit tests
  - use Jest-native mocks for Jest integration tests
- Replace tests that cast everything to `jest.Mock` when running under Vitest.
- Fix `next/navigation` mocks so router/search params are mockable and reusable.
- Remove environment and JSDOM assumptions that break model or server logic tests.
- Split helper factories into shared test utilities where repeated.
- Re-run unit and integration suites after each repaired test batch.

### Exit Criteria

- `npm run test:unit` passes.
- shared test setup is deterministic.
- failed tests now indicate real product issues, not harness issues.

## Phase 2: Replace Stubbed APIs with Real Services

### Goals

- Remove the biggest trust problem in the codebase.
- Make live API routes call real services with real authorization and persistence.

### Primary Targets

- `lib/services/api-stubs.ts`
- `app/api/jobs/saved/route.ts`
- `app/api/jobs/[jobId]/save/route.ts`
- `app/api/jobs/[jobId]/reviews/route.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/read-all/route.ts`
- `app/api/notifications/[id]/read/route.ts`
- `app/api/users/[userId]/public/route.ts`
- `app/api/users/[userId]/reviews/route.ts`
- `app/api/admin/disputes/route.ts`
- `app/api/admin/users/[userId]/verify/route.ts`
- `app/api/admin/users/[userId]/suspend/route.ts`

### Tasks

- For each stub-backed route:
  - define explicit request/response types
  - move behavior into a real service module
  - enforce authorization in one place
  - add input validation
  - add integration coverage for happy path, auth failure, validation failure, and edge cases
- Delete `lib/services/api-stubs.ts` once all consumers are replaced.

### Exit Criteria

- No route imports `api-stubs`.
- Every replaced route has integration tests.

## Phase 3: Auth, Security, Env, and Logging Hardening

### Goals

- Reduce security and reliability debt in foundational code.
- Make runtime behavior consistent and reviewer-friendly.

### Primary Targets

- `lib/auth.ts`
- `middleware.ts`
- `lib/env.ts`
- `lib/ably/publisher.ts`
- `lib/cloudinary.ts`
- `app/api/admin/setup/route.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/security/csrf.ts`
- `models/User.ts`

### Tasks

- Split `lib/auth.ts` into:
  - config
  - provider definitions
  - callback logic
  - session/cache helpers
- Replace remaining raw `process.env` access with the validated env module where appropriate.
- Remove hardcoded admin setup profile defaults and make dev-only behavior explicit and isolated.
- Replace `console.*` in server/runtime code with the project logger.
- Re-check CSRF and auth requirements for every mutating route.
- Tighten development-only validation bypasses and document them.

### Exit Criteria

- core security/runtime files are smaller and easier to review.
- env access is consistent.
- noisy logs are removed from business-critical paths.

## Phase 4: Split God Files and Rebalance Responsibilities

### Goals

- Improve maintainability and onboarding.
- Move business logic out of giant pages and components.

### Primary Targets

- `app/help/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/find-fixers/page.tsx`
- `app/dashboard/browse-jobs/page.tsx`
- `app/dashboard/jobs/[jobId]/apply/page.tsx`
- `app/jobs/[jobId]/dispute/page.tsx`
- `components/InstagramCommentsRealtime.tsx`
- `components/dashboard/settings/SettingsSectionContent.tsx`
- `data/cities.ts`
- `utils/validation.ts`

### Tasks

- Split large pages into:
  - route page
  - view components
  - route-local hooks
  - formatters/constants/types
- Move static help/legal/article content into structured data files or MDX-like modules.
- Separate city data from skills data and suggestion logic.
- Rename misleading components where names do not match the product domain.
- Replace `||` nullable defaults with `??` where appropriate.

### Exit Criteria

- major files are reduced to clear responsibilities.
- onboarding a new developer does not require reading 1,000-line files.

## Phase 5: Data, Content, and UX Polish

### Goals

- Remove visible rough edges that make the product look unfinished.
- Improve trust and consistency.

### Primary Targets

- all files with mojibake or broken symbols
- help, pricing, terms, and dashboard UI
- accessibility hot spots from lint output

### Tasks

- Fix encoding issues in user-visible strings.
- Remove personal contact details from product-facing UI unless they are intentionally part of the demo story.
- Repair accessibility warnings:
  - labels
  - keyboard support for interactive elements
  - alt text
  - autofocus misuse
- Standardize loading, empty, and error states across dashboard and search/job flows.

### Exit Criteria

- the app no longer looks like a partially migrated prototype.
- lint accessibility warnings are near-zero or zero.

## Phase 6: Comprehensive Backend Test Coverage

### Goals

- Give every important domain path real automated coverage.
- Match the test strategy stated in `AGENTS.md`.

### Required Coverage

- Unit tests for:
  - `utils/*`
  - `lib/validations/*`
  - pure helpers in `lib/services/*`
  - model methods/statics that can be tested without integration overhead
- Integration tests for every route under `app/api/**/route.ts`
- Shared test helpers for:
  - session mocking
  - Mongo memory setup
  - Redis mock setup
  - Ably token/publisher mocks
  - CSRF helpers

### Tasks

- Expand route coverage from the current partial state to full route coverage.
- Add negative-path testing for all auth-protected routes.
- Add validation and malformed-request tests everywhere input is accepted.
- Add idempotency and duplicate-action tests for payment, review, and message mutation routes.

### Exit Criteria

- every API route has integration coverage.
- there is no critical backend path without automated tests.

## Phase 7: Frontend and Component Test Coverage

### Goals

- Cover the complex client behavior that is currently untrusted.

### Primary Targets

- auth pages
- dashboard pages
- post-job flow
- message UI
- dispute UI
- settings/profile security flows
- realtime comment/message components

### Tasks

- Add component tests for:
  - render states
  - form validation
  - loading/error behavior
  - role-based branching
  - interaction-heavy components
- Add hook tests for custom hooks with branching logic and side effects.
- Add a11y assertions where practical for critical forms and dialogs.

### Exit Criteria

- critical client logic is tested independently of E2E.
- regressions in forms and role-based flows are caught early.

## Phase 8: End-to-End Coverage for Core Product Flows

### Goals

- Validate the product as a user experiences it.

### Required Flows

- hirer signup -> post job -> view applicants -> accept fixer
- fixer signup -> browse jobs -> apply -> accepted -> message hirer
- job completion -> review flow
- dispute filing flow
- realtime messaging flow

### Tasks

- Seed deterministic E2E test data and roles.
- Remove flaky selectors and rely on accessible, stable UI contracts.
- Ensure the app can run locally with a documented E2E environment.

### Exit Criteria

- `npm run test:e2e` passes consistently for all five core flows.

## Phase 9: Performance, Build, and Production Readiness Pass

### Goals

- Finish with operational quality, not just green tests.

### Tasks

- Run a bundle-size review on large client pages.
- Lazy-load heavy components where justified.
- Check image optimization usage and avoid `unoptimized` where not needed.
- Verify service worker, PWA, and offline behavior intentionally.
- Reconcile README, deployment docs, and environment docs with the actual code.
- Run final verification:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run test:e2e`
  - `npm run build`

### Exit Criteria

- the app builds cleanly.
- docs match reality.
- the project is defensible in a recruiter or code-review setting.

## Testing Matrix

### Unit

- validators
- formatters
- mappers
- status helpers
- content policy/rules
- pricing/entitlement helpers
- auth helper logic

### Integration

- every API route
- auth/authorization failures
- CSRF failures
- rate limiting
- invalid input
- resource not found
- conflict/idempotency behavior

### Component

- auth pages
- post-job steps
- settings/profile forms
- message and dispute UI
- search and dashboard states

### End-to-End

- the five core marketplace flows
- at least one smoke path for deployment sanity

## Recommended Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9

## Immediate Next Step

Start with Phase 1. Until the test harness is fixed, every other change is harder to trust.
