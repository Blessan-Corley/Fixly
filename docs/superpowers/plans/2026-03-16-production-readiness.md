# Fixly Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Fixly to full production readiness — clean build, all tests passing, CSRF on every authenticated mutation, dead code removed, all large files split, and integration test coverage across all API route groups.

**Architecture:** Next.js 14 App Router on Vercel serverless. MongoDB/Mongoose singleton. Redis via Upstash. Ably real-time. All mutations require session + CSRF. Pino logger server-side.

**Tech Stack:** Next.js 14, TypeScript strict, MongoDB/Mongoose, Redis/ioredis, Ably, Inngest, Stripe, Vitest (unit), Jest (integration), Playwright (E2E).

**Current state:**
- ✅ Build passes (`npm run build`)
- ✅ Lint passes (`npm run lint`)
- ✅ Typecheck passes (`npm run typecheck`)
- ✅ All 181 tests pass (`npm run test`)
- ✅ console.* replaced with logger everywhere server-side
- ✅ process.env violations fixed (2 remaining are legitimate: npm_package_version in health route, TEST_CSRF_TOKEN in test helper)

---

## Chunk 1: Security — CSRF on authenticated mutation routes

### Task 1: Add CSRF to `location/route.ts` (POST + PUT mutations)

**Files:**
- Modify: `app/api/location/route.ts`

The route has `POST` (save location) and `PUT` (update preferences) requiring session but missing CSRF. The `csrfGuard(request, session)` call must come immediately after session auth.

- [ ] **Step 1: Read the file to understand POST and PUT handler structure**

Read: `app/api/location/route.ts`

- [ ] **Step 2: Add CSRF to POST handler**

In the POST handler (around line 207), after `const auth = await requireSession()`, add:
```typescript
import { csrfGuard } from '@/lib/security/csrf';
// ...
const csrfCheck = csrfGuard(request, auth.session);
if (csrfCheck) return csrfCheck;
```

- [ ] **Step 3: Add CSRF to PUT handler**

In the PUT handler (around line 226), same pattern.

- [ ] **Step 4: Run lint + typecheck**
```bash
npm run lint && npm run typecheck
```

### Task 2: Add CSRF to `validate-content/route.ts` (POST)

**Files:**
- Modify: `app/api/validate-content/route.ts`

- [ ] **Step 1: Add CSRF after requireSession**

After `const auth = await requireSession()` (line ~84):
```typescript
import { csrfGuard } from '@/lib/security/csrf';
// in handler:
const csrfCheck = csrfGuard(request, auth.session);
if (csrfCheck) return csrfCheck;
```

- [ ] **Step 2: Run lint + typecheck**
```bash
npm run lint && npm run typecheck
```

---

## Chunk 2: Dead code removal

### Task 3: Delete `lib/services/api-stubs.ts` (not imported anywhere)

**Files:**
- Delete: `lib/services/api-stubs.ts`

- [ ] **Step 1: Verify it's unused**
```bash
grep -rn "api-stubs" --include="*.ts" --include="*.tsx" app/ lib/ components/ hooks/
```
Expected: no output (file imports nothing, nothing imports it)

- [ ] **Step 2: Delete the file**

- [ ] **Step 3: Verify build still passes**
```bash
npm run build 2>&1 | grep -E "Error:|Failed"
```

### Task 4: Delete `utils/validation.ts` (not imported anywhere)

**Files:**
- Delete: `utils/validation.ts`

- [ ] **Step 1: Verify it's unused**
```bash
grep -rn "utils/validation" --include="*.ts" --include="*.tsx" app/ lib/ components/ hooks/
```
Expected: no output

- [ ] **Step 2: Delete the file**

- [ ] **Step 3: Run typecheck**
```bash
npm run typecheck
```

---

## Chunk 3: Split large files (500+ lines)

### Task 5: Split `models/Dispute.ts` (622 lines) — follow Job model pattern

**Files:**
- Create: `models/dispute/schema.ts`
- Create: `models/dispute/methods.ts`
- Create: `models/dispute/statics.ts`
- Create: `models/dispute/hooks.ts`
- Create: `models/dispute/indexes.ts`
- Modify: `models/Dispute.ts` → barrel re-export + model registration

Dispute model has schema fields, instance methods, static methods, and a compound index. Split following `models/Job/` pattern.

- [ ] **Step 1: Read models/Dispute.ts fully**

- [ ] **Step 2: Create models/dispute/schema.ts** — All field definitions, type interfaces, and schema construction (no model registration)

- [ ] **Step 3: Create models/dispute/methods.ts** — All `schema.methods.*` assignments

- [ ] **Step 4: Create models/dispute/statics.ts** — All `schema.statics.*` assignments

- [ ] **Step 5: Create models/dispute/hooks.ts** — All `schema.pre` / `schema.post` hooks

- [ ] **Step 6: Create models/dispute/indexes.ts** — All `schema.index(...)` calls

- [ ] **Step 7: Rewrite models/Dispute.ts** to assemble and export:
```typescript
import { disputeSchema } from './dispute/schema';
import './dispute/methods';
import './dispute/statics';
import './dispute/hooks';
import './dispute/indexes';
// ... register model
```

- [ ] **Step 8: Run typecheck + tests**
```bash
npm run typecheck && npm run test
```

### Task 6: Split `models/JobDraft.ts` (620 lines)

**Files:**
- Create: `models/jobDraft/schema.ts`
- Create: `models/jobDraft/methods.ts`
- Create: `models/jobDraft/statics.ts`
- Modify: `models/JobDraft.ts` → barrel re-export

- [ ] **Step 1: Read models/JobDraft.ts fully**
- [ ] **Step 2: Create schema.ts, methods.ts, statics.ts**
- [ ] **Step 3: Rewrite models/JobDraft.ts as assembler**
- [ ] **Step 4: Run typecheck + tests**

### Task 7: Split `app/api/jobs/[jobId]/route-actions.ts` (732 lines)

This file contains action handlers for accept, reject, cancel, complete, arrive, etc. Split by action group.

**Files:**
- Create: `app/api/jobs/[jobId]/actions/accept-application.ts`
- Create: `app/api/jobs/[jobId]/actions/reject-application.ts`
- Create: `app/api/jobs/[jobId]/actions/cancel-job.ts`
- Create: `app/api/jobs/[jobId]/actions/complete-job.ts`
- Create: `app/api/jobs/[jobId]/actions/progress-actions.ts` (arrive, mark-done, confirm)
- Create: `app/api/jobs/[jobId]/actions/shared.ts` (shared types + utils)
- Modify: `app/api/jobs/[jobId]/route-actions.ts` → re-exports from actions/

- [ ] **Step 1: Read route-actions.ts fully to understand action boundaries**
- [ ] **Step 2: Extract shared types and utils to actions/shared.ts**
- [ ] **Step 3: Extract each action to its own file**
- [ ] **Step 4: Make route-actions.ts re-export all actions**
- [ ] **Step 5: Run typecheck + tests**

### Task 8: Split `app/api/jobs/[jobId]/comments/route.ts` (689 lines)

**Files:**
- Create: `app/api/jobs/[jobId]/comments/handlers/get.ts`
- Create: `app/api/jobs/[jobId]/comments/handlers/post.ts`
- Create: `app/api/jobs/[jobId]/comments/handlers/delete.ts`
- Create: `app/api/jobs/[jobId]/comments/handlers/reply.ts`
- Create: `app/api/jobs/[jobId]/comments/handlers/shared.ts`
- Modify: `app/api/jobs/[jobId]/comments/route.ts` → thin router

- [ ] **Step 1: Read comments/route.ts fully**
- [ ] **Step 2: Create each handler file**
- [ ] **Step 3: Make route.ts thin**
- [ ] **Step 4: Run typecheck + tests**

### Task 9: Split `app/api/messages/route.ts` (644 lines)

**Files:**
- Create: `app/api/messages/handlers/get-messages.ts`
- Create: `app/api/messages/handlers/post-message.ts`
- Create: `app/api/messages/handlers/delete-message.ts`
- Create: `app/api/messages/handlers/shared.ts`
- Modify: `app/api/messages/route.ts` → thin router

- [ ] **Step 1: Read messages/route.ts fully**
- [ ] **Step 2: Create handler files**
- [ ] **Step 3: Make route.ts thin**
- [ ] **Step 4: Run typecheck + tests**

### Task 10: Split `app/api/reviews/route.ts` (624 lines) and `app/api/reviews/submit/route.ts` (567 lines)

**Files:**
- Create: `app/api/reviews/handlers/get.ts`
- Create: `app/api/reviews/handlers/post.ts`
- Create: `app/api/reviews/handlers/shared.ts`
- Create: `app/api/reviews/submit/handlers/submit.ts`
- Create: `app/api/reviews/submit/handlers/validate.ts`

- [ ] **Step 1: Read both files fully**
- [ ] **Step 2: Split reviews/route.ts**
- [ ] **Step 3: Split reviews/submit/route.ts**
- [ ] **Step 4: Run typecheck + tests**

### Task 11: Split `app/api/jobs/[jobId]/apply/route.ts` (591 lines)

**Files:**
- Create: `app/api/jobs/[jobId]/apply/handlers/post-apply.ts`
- Create: `app/api/jobs/[jobId]/apply/handlers/get-application.ts`
- Create: `app/api/jobs/[jobId]/apply/handlers/patch-application.ts`
- Create: `app/api/jobs/[jobId]/apply/handlers/shared.ts`
- Modify: `app/api/jobs/[jobId]/apply/route.ts` → thin router

- [ ] **Step 1: Read apply/route.ts fully**
- [ ] **Step 2: Split into handlers**
- [ ] **Step 3: Run typecheck + tests**

### Task 12: Split `app/api/user/fixer-settings/route.ts` (552 lines)

**Files:**
- Create: `app/api/user/fixer-settings/handlers/get-settings.ts`
- Create: `app/api/user/fixer-settings/handlers/put-settings.ts`
- Create: `app/api/user/fixer-settings/handlers/shared.ts`
- Modify: `app/api/user/fixer-settings/route.ts` → thin router

- [ ] **Step 1: Read fixer-settings/route.ts fully**
- [ ] **Step 2: Split into handlers**
- [ ] **Step 3: Run typecheck + tests**

### Task 13: Split `utils/validation.ts` → DELETED (dead code, Task 4)

### Task 14: Split `models/User.ts` (654 lines) — follow Job model pattern

**Files:**
- Create: `models/user/schema.ts`
- Create: `models/user/methods.ts`
- Create: `models/user/statics.ts`
- Create: `models/user/hooks.ts`
- Create: `models/user/indexes.ts`
- Create: `models/user/virtuals.ts`
- Modify: `models/User.ts` → assembler + model registration

- [ ] **Step 1: Read models/User.ts fully**
- [ ] **Step 2: Split schema fields into schema.ts**
- [ ] **Step 3: Split instance methods into methods.ts**
- [ ] **Step 4: Split static methods into statics.ts**
- [ ] **Step 5: Split hooks into hooks.ts**
- [ ] **Step 6: Split indexes into indexes.ts**
- [ ] **Step 7: Rewrite User.ts as assembler**
- [ ] **Step 8: Run typecheck + tests**

---

## Chunk 4: Integration test coverage — high-value missing routes

### Task 15: Integration tests for job CRUD routes

**Files:**
- Create: `tests/integration/api/jobs-browse.test.ts`
- Create: `tests/integration/api/jobs-post.test.ts`
- Create: `tests/integration/api/job-detail.test.ts`

Cover:
- `GET /api/jobs/browse` — list/filter jobs (auth + unauth)
- `POST /api/jobs/post` — create job (hirer only, CSRF required)
- `GET /api/jobs/[jobId]` — get job detail (auth + unauth)
- `PUT /api/jobs/[jobId]` — edit job (hirer only)
- `DELETE /api/jobs/[jobId]` — delete job (hirer only)

Each test: happy path, auth failure (401), role failure (403), CSRF failure (403).

### Task 16: Integration tests for job lifecycle routes

**Files:**
- Create: `tests/integration/api/job-apply.test.ts`
- Create: `tests/integration/api/job-complete.test.ts`
- Create: `tests/integration/api/job-save.test.ts`

Cover:
- `POST /api/jobs/[jobId]/apply` — fixer applies (CSRF, rate limit)
- `POST /api/jobs/[jobId]/complete` — mark complete (auth, state machine)
- `POST/DELETE /api/jobs/[jobId]/save` — save/unsave job

### Task 17: Integration tests for user settings routes

**Files:**
- Create: `tests/integration/api/user-fixer-settings.test.ts`
- Create: `tests/integration/api/user-privacy.test.ts`
- Create: `tests/integration/api/user-preferences.test.ts`
- Create: `tests/integration/api/user-earnings.test.ts`

Cover: GET+PUT patterns, auth required, CSRF on mutations, field validation.

### Task 18: Integration tests for messages/conversations

**Files:**
- Create: `tests/integration/api/conversations.test.ts`
- Create: `tests/integration/api/messages-job.test.ts`

Cover:
- `GET /api/messages/conversations` — list (auth required)
- `GET /api/messages/conversations/[id]` — read (participant only)
- `GET /api/messages/job/[jobId]` — job-scoped messages

### Task 19: Integration tests for subscription routes

**Files:**
- Create: `tests/integration/api/subscription-status.test.ts`

Cover:
- `GET /api/subscription/fixer` — fixer status (role required)
- `GET /api/subscription/hirer` — hirer status (role required)
- `POST /api/subscription/verify-payment` — verify (CSRF, idempotency)

### Task 20: Integration tests for admin routes

**Files:**
- Create: `tests/integration/api/admin-users.test.ts`
- Create: `tests/integration/api/admin-jobs.test.ts`
- Create: `tests/integration/api/admin-stats.test.ts`

Cover: admin-only access (403 for non-admin), CRUD operations, audit trail.

### Task 21: Integration tests for location routes

**Files:**
- Create: `tests/integration/api/location.test.ts`

Cover:
- `GET /api/user/location` — get location (auth required)
- `POST /api/user/location` — save location (CSRF required)
- `PUT /api/user/location` — update preferences (CSRF required)

---

## Chunk 5: E2E tests for core user flows

### Task 22: E2E — Hirer flow (signup → post → accept)

**Files:**
- Create: `tests/e2e/hirer-flow.spec.ts`

Flow:
1. Hirer signs up (email/Google)
2. Posts a job (multi-step form)
3. Views applications
4. Accepts a fixer

```typescript
test('hirer: sign up, post job, accept fixer', async ({ page }) => {
  // ...
});
```

### Task 23: E2E — Fixer flow (signup → browse → apply → accepted)

**Files:**
- Create: `tests/e2e/fixer-flow.spec.ts`

Flow:
1. Fixer signs up
2. Browses jobs
3. Applies to a job
4. Gets accepted (pre-seeded job)

### Task 24: E2E — Messaging flow (real-time messages between hirer and fixer)

**Files:**
- Create: `tests/e2e/messaging-flow.spec.ts`

Flow:
1. Two browser contexts (hirer + fixer)
2. Hirer sends message
3. Fixer receives in real-time
4. Fixer replies

### Task 25: E2E — Job completion + review

**Files:**
- Create: `tests/e2e/job-completion.spec.ts`

Flow:
1. Job in `in_progress` state (seeded)
2. Fixer marks done
3. Hirer confirms completion
4. Both submit reviews
5. Rating updates on profile

### Task 26: E2E — Dispute filing

**Files:**
- Create: `tests/e2e/dispute-flow.spec.ts`

Flow:
1. Job in `in_progress` state
2. Hirer files dispute
3. Fixer responds
4. Admin resolves

---

## Verification checklist

After all tasks complete:
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run test` — all pass
- [ ] `npm run test:unit` — all pass
- [ ] `npm run build` — clean
- [ ] No file in `app/api/`, `lib/`, `models/` exceeds 500 lines
- [ ] Every authenticated POST/PUT/PATCH/DELETE has CSRF validation
- [ ] No `process.env.*` outside `lib/env.ts` (except npm_package_version + test helper)
- [ ] No `console.*` in any server-side file
