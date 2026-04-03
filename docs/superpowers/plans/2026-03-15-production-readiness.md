# Fixly — Production Readiness Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Fixly from a feature-complete prototype into a production-grade, secure, tested, scalable marketplace.

**Architecture:** Fix in dependency order — security first, then data integrity, then service layer completeness, then code quality, then test coverage, then observability. Each phase leaves the codebase shippable.

**Tech Stack:** Next.js 14 App Router, MongoDB/Mongoose, Redis/ioredis, Ably, NextAuth, Stripe, Inngest, Vitest, Jest, Playwright, Zod, TypeScript 5 strict

**Total estimated phases:** 6 — work through them in order. Do not skip ahead.

---

## Phase Overview

| Phase | Focus | Criticality |
|-------|-------|-------------|
| 1 | Security hardening — CSRF, env vars, XSS, auth | 🔴 CRITICAL |
| 2 | Data integrity — models, indexes, soft delete, state machine | 🔴 CRITICAL |
| 3 | Service completion — replace all stubs | 🟠 HIGH |
| 4 | Code quality — large files, TypeScript, duplicates | 🟡 MEDIUM |
| 5 | Test coverage — integration (66 routes) + E2E (5 flows) | 🟡 MEDIUM |
| 6 | Observability & scale — monitoring, caching, perf | 🟢 LOW |

---

# PHASE 1: Security Hardening

> **Deliver:** All mutating routes protected by CSRF. All env vars via env.ts. XSS patched. Auth hardened. Password hashing explicit. Middleware fail-safe.

---

## Chunk 1.1: Fix process.env violations

**Files to modify:**
- `lib/ably/publisher.ts`
- `lib/cloudinary.ts`
- `lib/api/auth.ts`
- `lib/email.ts`
- `lib/env.ts` (verify all needed vars are exported)

### Task 1: Verify env.ts exports all required vars

- [ ] Read `lib/env.ts` and confirm these are exported: `ABLY_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NODE_ENV`, `TEST_CSRF_TOKEN` (test-only)
- [ ] If any are missing, add them to the T3 env schema in `lib/env.ts`
- [ ] Run `npm run typecheck` — must pass before continuing

### Task 2: Fix lib/ably/publisher.ts

- [ ] Open `lib/ably/publisher.ts`
- [ ] Replace `process.env.ABLY_API_KEY` with `import { env } from '@/lib/env'` and `env.ABLY_API_KEY`
- [ ] Run `npm run typecheck`

### Task 3: Fix lib/cloudinary.ts

- [ ] Open `lib/cloudinary.ts`
- [ ] Replace all 3 `process.env.CLOUDINARY_*` references with `env.*`
- [ ] Run `npm run typecheck`

### Task 4: Fix lib/api/auth.ts and lib/email.ts

- [ ] Open both files
- [ ] Replace `process.env.NODE_ENV` with `env.NODE_ENV` in both
- [ ] If `TEST_CSRF_TOKEN` is used in `lib/api/auth.ts`, either add it to env.ts (server-only, optional) or guard with `process.env.NODE_ENV === 'test'` check using `env.NODE_ENV`
- [ ] Run `npm run typecheck`

### Task 5: Verify no remaining process.env violations

```bash
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" \
  app/ lib/ components/ hooks/ services/ utils/ contexts/ models/ \
  | grep -v "lib/env.ts" | grep -v "next.config.js" | grep -v ".test." | grep -v "jest.setup"
```

- [ ] Run the command above — output should be empty (or only acceptable exceptions like `instrumentation.ts`)
- [ ] Fix any remaining violations
- [ ] `npm run typecheck && npm run lint` — both must pass
- [ ] Commit: `fix: route all env vars through lib/env.ts`

---

## Chunk 1.2: CSRF protection on all mutating routes

**Context:** `lib/security/csrf.server.ts` already exports `validateCsrf(request)`. This throws a 403 `AppError` if the token is missing or invalid. The client must send `x-csrf-token` header (use `fetchWithCsrf` from `lib/api/fetchWithCsrf.ts`).

**Files to modify (add `await validateCsrf(request)` to each):**

Group A — User routes:
- `app/api/user/change-password/route.ts`
- `app/api/user/change-email/route.ts`
- `app/api/user/update-email/route.ts`
- `app/api/user/update-phone/route.ts`
- `app/api/user/update-username/route.ts`
- `app/api/user/profile-photo/route.ts`
- `app/api/user/notification-preferences/route.ts`
- `app/api/user/preferences/route.ts`
- `app/api/user/privacy/route.ts`
- `app/api/user/push-subscription/route.ts`
- `app/api/user/fixer-settings/route.ts`
- `app/api/user/verification/apply/route.ts`

Group B — Notifications:
- `app/api/user/notifications/read/route.ts`
- `app/api/user/notifications/read-all/route.ts`
- `app/api/user/notifications/[id]/route.ts` (DELETE handler)

Group C — Jobs/Comments:
- `app/api/jobs/[jobId]/applications/withdraw/route.ts`
- `app/api/jobs/[jobId]/comments/route.ts` (POST)
- `app/api/jobs/[jobId]/comments/[commentId]/edit/route.ts`
- `app/api/jobs/[jobId]/comments/[commentId]/route.ts` (DELETE)
- `app/api/jobs/[jobId]/comments/[commentId]/like/route.ts`
- `app/api/jobs/[jobId]/comments/[commentId]/react/route.ts`
- `app/api/jobs/[jobId]/like/route.ts`
- `app/api/jobs/[jobId]/save/route.ts`
- `app/api/jobs/drafts/route.ts` (POST)
- `app/api/jobs/drafts/[draftId]/route.ts` (PUT, DELETE)

Group D — Messages:
- `app/api/messages/route.ts`
- `app/api/messages/reactions/route.ts`
- `app/api/messages/conversations/route.ts` (POST)
- `app/api/messages/conversations/[conversationId]/route.ts` (PATCH)

Group E — Reviews/Disputes:
- `app/api/reviews/submit/route.ts`
- `app/api/reviews/route.ts` (POST)
- `app/api/reviews/[reviewId]/helpful/route.ts`
- `app/api/disputes/route.ts` (POST)

Group F — Subscription/Upload:
- `app/api/subscription/fixer/route.ts`
- `app/api/subscription/hirer/route.ts`
- `app/api/subscription/verify-payment/route.ts`
- `app/api/subscription/create-order/route.ts`
- `app/api/upload/route.ts`
- `app/api/jobs/upload-media/route.ts`

### Task 6: Add validateCsrf to Group A (user routes)

Pattern to add at the top of every POST/PUT/PATCH/DELETE handler:

```typescript
import { validateCsrf } from '@/lib/security/csrf.server';

// Inside the handler, before any DB work:
await validateCsrf(request);
```

- [ ] Add to all 12 Group A files
- [ ] Run `npm run typecheck` — must pass

### Task 7: Add validateCsrf to Groups B, C, D, E, F

- [ ] Add to Group B (3 files)
- [ ] Add to Group C (10 files)
- [ ] Add to Group D (4 files)
- [ ] Add to Group E (4 files)
- [ ] Add to Group F (6 files)
- [ ] Run `npm run typecheck` — must pass

### Task 8: Verify CSRF coverage

```bash
# Check all route files that have POST/PUT/PATCH/DELETE for validateCsrf
grep -rL "validateCsrf" app/api/**/*.ts | head -30
```

- [ ] For each route file listed: determine if it's a mutating route. If yes, add CSRF. If it's genuinely read-only or public-intentional (analytics, health), that's acceptable.
- [ ] `npm run lint && npm run typecheck`
- [ ] Commit: `security: add CSRF validation to all mutating API routes`

---

## Chunk 1.3: Fix mutation hooks to use fetchWithCsrf

**Context:** `lib/api/fetchWithCsrf.ts` exports a `fetchWithCsrf(url, options)` function that auto-attaches the CSRF token from the cookie. All mutation hooks must use this instead of raw `fetch()` or `fetcher()`.

**Files to modify:**
- `hooks/query/applications.ts`
- `hooks/query/disputes.ts`
- `hooks/query/messages.ts`
- `hooks/query/notifications.ts`
- `hooks/query/reviews.ts`
- `hooks/query/users.ts`
- `hooks/query/jobs.ts`
- `hooks/query/subscription.ts`
- `hooks/realtime/useJobComments.ts` (20+ raw fetch calls)
- `hooks/realtime/useNotificationCenter.ts`
- `hooks/useSettingsAccountFlows.ts`
- `hooks/useProfileSecurityFlows.ts`

### Task 9: Update all query mutation hooks

- [ ] Open `hooks/query/applications.ts` — find all `useMutation` blocks that call `fetch()` or `fetcher()` for POST/PUT/PATCH/DELETE. Replace with `fetchWithCsrf()`.
- [ ] Repeat for `hooks/query/disputes.ts`, `messages.ts`, `notifications.ts`, `reviews.ts`, `users.ts`, `jobs.ts`, `subscription.ts`
- [ ] Run `npm run typecheck`

### Task 10: Update realtime hooks and flow hooks

- [ ] Open `hooks/realtime/useJobComments.ts` — replace all 7 raw `fetch()` mutation calls with `fetchWithCsrf()`
- [ ] Open `hooks/realtime/useNotificationCenter.ts` — replace `markAsRead` and `markAllAsRead`
- [ ] Open `hooks/useSettingsAccountFlows.ts` — replace all mutating fetch calls
- [ ] Open `hooks/useProfileSecurityFlows.ts` — replace all mutating fetch calls
- [ ] Run `npm run typecheck`
- [ ] Run `npm run test:unit` — must pass
- [ ] Commit: `fix: use fetchWithCsrf for all client-side mutations`

---

## Chunk 1.4: Security — XSS, password hashing, middleware

### Task 11: Fix XSS in app/help/page.tsx

- [ ] Install DOMPurify if not present: check `package.json`. If absent: `npm install dompurify @types/dompurify`
- [ ] Open `app/help/page.tsx`
- [ ] Find the `dangerouslySetInnerHTML` usage
- [ ] Import DOMPurify: `import DOMPurify from 'dompurify'`
- [ ] Wrap the content: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedHelpArticle.content) }}`
- [ ] Note: DOMPurify is browser-only. If this is SSR'd, use `isomorphic-dompurify` instead.
- [ ] Run `npm run typecheck && npm run build`

### Task 12: Explicit password hashing in registrationService.ts

- [ ] Open `services/auth/registrationService.ts`
- [ ] Find where `passwordHash` is set to `data.password`
- [ ] Add explicit bcrypt hash before the User.create call:
```typescript
import bcrypt from 'bcryptjs';
// ...
const passwordHash = await bcrypt.hash(data.password, 12);
// use passwordHash in User.create, not data.password
```
- [ ] Verify the User pre-save hook in `models/User.ts` — if it also hashes, ensure double-hashing cannot occur. Either remove the hook or add a guard:
```typescript
// In pre-save hook:
if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
}
```
- [ ] Run `npm run typecheck`

### Task 13: Harden middleware auth status fetch

- [ ] Open `middleware.ts`
- [ ] Find the `/api/auth/status` fetch block (around line 216-222)
- [ ] Add timeout and fallback:
```typescript
try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
  const res = await fetch(statusUrl, { signal: controller.signal });
  clearTimeout(timeout);
  liveState = await res.json();
} catch (err) {
  // Network error or timeout — be conservative: redirect to signin
  return NextResponse.redirect(new URL('/auth/signin?reason=session-error', req.url));
}
```
- [ ] Also fix `needsSignupCompletion()` to check `isRegistered` properly — read current implementation and add: if user has a valid non-temp username AND `isRegistered === true`, return false
- [ ] Run `npm run typecheck`

### Task 14: Middleware — check isRegistered for role-gated routes

- [ ] Find role-based routing block in `middleware.ts` (around line 283-298)
- [ ] Add check: if role-gated route AND `!token.isRegistered`, redirect to `/auth/signup`
- [ ] Add rate limiting to OTP endpoints in `services/auth/emailChangeService.ts`:
```typescript
import { getRedis } from '@/lib/redis';
const redis = getRedis();
const key = `otp-rate:${userId}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60); // 1 per minute
if (count > 3) throw new AppError('Too many OTP requests', 429);
```
- [ ] Fix `usernameService.ts` counter bug:
```typescript
// The counter must increment:
while (counter < 10) {
  const candidate = `${base}${counter}`;
  const exists = await User.exists({ username: candidate });
  if (!exists) return candidate;
  counter++; // This line was missing
}
```
- [ ] Run `npm run typecheck && npm run test`
- [ ] Commit: `security: harden auth, middleware, OTP rate limits, username generation`

---

# PHASE 2: Data Integrity

> **Deliver:** All Mongoose models correct, indexed, type-safe. Soft delete consistent. Job state machine enforced. Ratings transactional.

---

## Chunk 2.1: Add missing database indexes

**Files to modify:**
- `models/User.ts` (or wherever User indexes are defined)
- `models/Dispute.ts`
- `models/Conversation.ts`
- `models/Review.ts`
- `models/job/indexes.ts`

### Task 15: Add User indexes

- [ ] Open `models/User.ts`
- [ ] Add these indexes:
```typescript
UserSchema.index({ banned: 1, isActive: 1 }); // middleware auth checks
UserSchema.index({ deletedAt: 1 }, { sparse: true }); // soft delete queries
UserSchema.index({ username: 1 }, { unique: true, sparse: true }); // verify unique
UserSchema.index({ email: 1 }, { unique: true, sparse: true }); // verify unique
```
- [ ] Run `npm run typecheck`

### Task 16: Add Dispute indexes

- [ ] Open `models/Dispute.ts`
- [ ] Add:
```typescript
DisputeSchema.index({ initiatedBy: 1, status: 1 });
DisputeSchema.index({ respondent: 1, status: 1 });
DisputeSchema.index({ relatedJob: 1 });
DisputeSchema.index({ isActive: 1, status: 1 });
```

### Task 17: Add Conversation and Job indexes

- [ ] Open `models/Conversation.ts` — add `{ participants: 1, relatedJob: 1 }` compound index
- [ ] Open `models/job/indexes.ts` — add `{ status: 1, createdBy: 1, createdAt: -1 }` and `{ status: 1, assignedTo: 1 }`
- [ ] Open `models/Review.ts` — add `{ job: 1, reviewer: 1 }` unique index to prevent duplicate reviews
- [ ] Run `npm run typecheck`
- [ ] Commit: `perf: add missing database indexes for all models`

---

## Chunk 2.2: Fix User soft delete

**Context:** `User` has `deletedAt` but no `isDeleted` boolean. `User.find()` and `User.findOne()` return deleted records. Every query in the app must filter them out.

**Files to modify:**
- `models/User.ts`
- `lib/services/user/profile.queries.ts`
- `lib/services/user/profile.mutations.ts`
- `services/auth/registrationService.ts`
- `services/auth/googleService.ts`
- `app/api/user/profile/[username]/route.ts`
- Any other file that queries User directly

### Task 18: Add isDeleted to User model

- [ ] Open `models/User.ts`
- [ ] Add field:
```typescript
isDeleted: { type: Boolean, default: false, index: true },
```
- [ ] Add a query middleware (Mongoose pre-hook) to auto-filter deleted users:
```typescript
// Apply to all find operations
const excludeDeleted = function(this: Query<unknown, unknown>) {
  if (!this.getFilter().isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
};
UserSchema.pre('find', excludeDeleted);
UserSchema.pre('findOne', excludeDeleted);
UserSchema.pre('findOneAndUpdate', excludeDeleted);
UserSchema.pre('countDocuments', excludeDeleted);
```
- [ ] Update soft-delete logic wherever user deletion happens:
```typescript
await User.findByIdAndUpdate(userId, {
  isDeleted: true,
  deletedAt: new Date(),
  isActive: false,
});
```
- [ ] Run `npm run typecheck`

### Task 19: Audit all User queries for soft delete

- [ ] Run:
```bash
grep -rn "User\.find\|User\.findOne\|User\.findById" --include="*.ts" app/ lib/ services/ | grep -v ".test."
```
- [ ] Review each result. Any direct `User.findById(id)` in non-admin code should work fine (mongoose hook auto-filters). Admin routes that intentionally need to see deleted users should pass `{ isDeleted: true }` explicitly to bypass the hook.
- [ ] Run `npm run typecheck && npm run test`
- [ ] Commit: `fix: consistent soft delete on User model with query middleware`

---

## Chunk 2.3: Fix Job state machine

**Context:** Job status enum includes `'expired'` but nothing sets it. The state machine needs `closeInactiveJobs` (Inngest scheduled function) to set it. The `completed → disputed` path also needs fixing.

**Files to modify:**
- `models/job/schema.workflow.ts`
- `models/job/workflow.ts`
- `lib/inngest/functions/scheduled/closeInactiveJobs.ts`
- `models/job/schema.base.ts`

### Task 20: Implement expired status transition

- [ ] Open `lib/inngest/functions/scheduled/closeInactiveJobs.ts`
- [ ] Implement the function to transition stale `open` jobs to `expired`:
```typescript
// Jobs open for > 30 days with no applications → expired
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
await Job.updateMany(
  {
    status: 'open',
    createdAt: { $lt: thirtyDaysAgo },
    'applications.0': { $exists: false } // no applications
  },
  { $set: { status: 'expired' } }
);
```
- [ ] Verify the cron schedule is set — function should run daily

### Task 21: Fix completed → disputed transition

- [ ] Open `models/job/workflow.ts`
- [ ] Find where disputes are raised on completed jobs
- [ ] Ensure: when a dispute is raised on a completed job, the job status becomes `'disputed'` (not stays `'completed'`). The current `dispute.raised = true` approach is ambiguous.
- [ ] Update state transition guard:
```typescript
const validTransitionsFrom = {
  draft: ['open'],
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed'], // allow dispute within window
  disputed: [], // terminal until resolved by admin
  cancelled: [], // terminal
  expired: [], // terminal
};
```

### Task 22: Fix Dispute pre-save hook deadline logic

- [ ] Open `models/Dispute.ts`
- [ ] Find `pre('save')` hook for deadline mutation
- [ ] Add idempotency guard:
```typescript
DisputeSchema.pre('save', function(next) {
  // Only set deadline on FIRST transition to awaiting_response
  if (this.isModified('status') && this.status === 'awaiting_response') {
    if (!this.metadata?.responseDeadline) { // Only if not already set
      this.metadata.responseDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
  next();
});
```
- [ ] Run `npm run typecheck && npm run test:unit`
- [ ] Commit: `fix: job state machine, dispute deadline idempotency, expired status`

---

## Chunk 2.4: Fix Review ratings race condition

**Context:** Review post-save hook updates User.ratings outside a transaction. Two concurrent reviews on the same user can corrupt rating data.

**Files to modify:**
- `models/Review.ts`
- `lib/services/jobs/job.mutations.ts` (or wherever reviews are submitted)

### Task 23: Remove post-save hook, use atomic update

- [ ] Open `models/Review.ts`
- [ ] Remove the post-save hook that calls `User.updateRatings()`
- [ ] Instead, use MongoDB `$inc` and `$push` for atomic updates where reviews are saved:
```typescript
// After saving the review, atomic update to user ratings:
await User.findByIdAndUpdate(revieweeId, {
  $inc: {
    reviewCount: 1,
    'ratings.total': review.rating,
  },
  $set: {
    'ratings.average': await computeNewAverage(revieweeId),
  }
});
```
- [ ] For `computeNewAverage`, use an aggregation:
```typescript
async function computeNewAverage(userId: string): Promise<number> {
  const result = await Review.aggregate([
    { $match: { reviewee: new Types.ObjectId(userId), status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  return result[0]?.avg ?? 0;
}
```
- [ ] Run `npm run typecheck && npm run test`
- [ ] Commit: `fix: atomic user rating updates, remove race-prone post-save hook`

---

## Chunk 2.5: Add missing model fields

### Task 24: Add withdrawnAt to Job applications

- [ ] Open `models/job/schema.applications.ts`
- [ ] Find the application sub-document schema
- [ ] Add `withdrawnAt: { type: Date }` field alongside `rejectedAt`, `acceptedAt`
- [ ] Update withdrawal handler to set this field:
  - Find `app/api/jobs/[jobId]/applications/withdraw/route.ts`
  - Add `withdrawnAt: new Date()` when setting status to `'withdrawn'`

### Task 25: Add Conversation.lastMessage

- [ ] Open `models/Conversation.ts`
- [ ] Add nested field:
```typescript
lastMessage: {
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, maxlength: 200 },
  sentAt: { type: Date },
}
```
- [ ] Update message send logic (`lib/services/messages/mutations.ts`) to also update `lastMessage` on the Conversation document whenever a new message is sent:
```typescript
await Conversation.findByIdAndUpdate(conversationId, {
  $set: {
    lastMessage: {
      senderId: message.senderId,
      text: message.text.slice(0, 200),
      sentAt: message.createdAt,
    }
  }
});
```
- [ ] Run `npm run typecheck && npm run test`
- [ ] Commit: `feat: add withdrawnAt to applications, lastMessage to Conversation`

---

# PHASE 3: Service Completion (Replace Stubs)

> **Deliver:** All stub/placeholder implementations replaced with real business logic.

---

## Chunk 3.1: Admin user management (suspend/verify)

**Files:**
- `app/api/admin/users/[userId]/suspend/route.ts`
- `app/api/admin/users/[userId]/verify/route.ts`
- `lib/services/api-stubs.ts` (remove stub functions when replaced)
- `models/User.ts`
- `lib/inngest/client.ts` (for events)

### Task 26: Implement user suspension

- [ ] Open `app/api/admin/users/[userId]/suspend/route.ts`
- [ ] Replace `suspendUserStub()` call with real logic:
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateCsrf } from '@/lib/security/csrf.server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/api/response';
import { AppError, handleApiError } from '@/lib/api/errors';

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    await validateCsrf(req);
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }
    await connectDB();
    const { reason, durationDays } = await req.json();
    const user = await User.findById(params.userId);
    if (!user) throw new AppError('User not found', 404);

    const unsuspendAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await User.findByIdAndUpdate(params.userId, {
      $set: {
        banned: true,
        banReason: reason,
        bannedAt: new Date(),
        bannedUntil: unsuspendAt,
        bannedBy: session.user.id,
      }
    });

    // Trigger notification to user
    await inngest.send({
      name: 'notification/send',
      data: {
        userId: params.userId,
        type: 'account_suspended',
        message: `Your account has been suspended. Reason: ${reason}`,
      }
    });

    return successResponse({ message: 'User suspended' });
  } catch (err) {
    return handleApiError(err);
  }
}
```
- [ ] Ensure `User` model has `bannedAt`, `bannedUntil`, `bannedBy` fields — add if missing
- [ ] Run `npm run typecheck`

### Task 27: Implement user verification

- [ ] Open `app/api/admin/users/[userId]/verify/route.ts`
- [ ] Replace `verifyUserStub()` with real logic that:
  - Sets `verificationStatus: 'verified'`
  - Sets `verifiedAt: new Date()`
  - Sets `verifiedBy: session.user.id`
  - Sends notification to user
  - Triggers Inngest `user/verified` event
- [ ] Run `npm run typecheck`
- [ ] Commit: `feat: implement admin suspend/verify user functionality`

---

## Chunk 3.2: Admin metrics service

**File:** `lib/services/adminMetricsService.ts`

### Task 28: Implement admin metrics

- [ ] Open `lib/services/adminMetricsService.ts`
- [ ] Find all functions returning `[]` or stubs
- [ ] Implement each with real MongoDB aggregations:

**User metrics:**
```typescript
export async function getUserPlanAggregates(): Promise<UserPlanAggregate[]> {
  return User.aggregate([
    { $match: { isDeleted: { $ne: true }, isActive: true } },
    { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } },
    { $project: { tier: '$_id', count: 1, _id: 0 } }
  ]);
}
```

**Job metrics:**
```typescript
export async function getJobStatusBreakdown() {
  return Job.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
}
```

**Revenue metrics:**
```typescript
export async function getRevenueByPeriod(from: Date, to: Date) {
  return PaymentEvent.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, status: 'succeeded' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
}
```
- [ ] Implement all remaining stub functions with appropriate aggregations
- [ ] Run `npm run typecheck`

---

## Chunk 3.3: Entitlement service

**File:** `lib/services/billing/entitlementService.ts`

### Task 29: Implement entitlement checks

- [ ] Open `lib/services/billing/entitlementService.ts`
- [ ] Open `lib/services/billing/plans.ts` to understand the plan structure
- [ ] Replace all `return null` stubs with real checks:
```typescript
export async function canPostJob(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await User.findById(userId).select('subscriptionTier role').lean();
  if (!user) return { allowed: false, reason: 'User not found' };
  if (user.role !== 'hirer') return { allowed: false, reason: 'Must be a hirer' };

  const plan = PLANS[user.subscriptionTier ?? 'free'];
  const jobCount = await Job.countDocuments({ createdBy: userId, status: { $in: ['open', 'in_progress'] } });

  if (jobCount >= plan.maxActiveJobs) {
    return { allowed: false, reason: `Plan limit: ${plan.maxActiveJobs} active jobs` };
  }
  return { allowed: true };
}
```
- [ ] Implement all entitlement checks: `canApplyToJob`, `canViewApplicants`, `canMessageFirst`, `canAccessPremiumSearch`
- [ ] Run `npm run typecheck && npm run test`
- [ ] Commit: `feat: implement entitlement service and admin metrics`

---

# PHASE 4: Code Quality

> **Deliver:** No file over 500 lines. No duplicate utilities. TypeScript fully clean. Frontend readable.

---

## Chunk 4.1: Split large files

**Order matters — split most used files first.**

### Task 30: Split lib/auth.ts (911 lines)

- [ ] Create `lib/auth/providers.ts` — extract Google + Credentials provider configs
- [ ] Create `lib/auth/callbacks.ts` — extract all callback functions (jwt, session, signIn, redirect)
- [ ] Create `lib/auth/credentials.ts` — extract credentials provider login logic
- [ ] Keep `lib/auth.ts` as a barrel that imports and re-exports `authOptions`
- [ ] Run `npm run typecheck` — every import of `@/lib/auth` must still work
- [ ] Run `npm run test`

### Task 31: Split app/dashboard/page.tsx (~996 lines)

- [ ] Create `app/dashboard/_components/DashboardStatsGrid.tsx` — stats display section
- [ ] Create `app/dashboard/_components/DashboardRecentJobs.tsx` — recent jobs section
- [ ] Create `app/dashboard/_hooks/useDashboardController.ts` — all data fetching and logic
- [ ] Keep `app/dashboard/page.tsx` as the shell that composes these
- [ ] Target: `page.tsx` < 150 lines after split
- [ ] Run `npm run typecheck`

### Task 32: Split remaining large files

- [ ] `app/api/disputes/route.ts` (~640 lines) → extract handlers into `app/api/disputes/dispute-handlers.ts`
- [ ] `lib/services/api-stubs.ts` (645 lines) → migrate ObjectId utils to `lib/mongo/objectid-utils.ts`, delete stubs that are now replaced
- [ ] `app/api/jobs/[jobId]/route.ts` (~559 lines) → extract into `app/api/jobs/[jobId]/route-handlers.ts`
- [ ] `app/dashboard/layout.client.tsx` (~514 lines) → extract notification polling logic into `app/dashboard/_hooks/useLayoutData.ts`
- [ ] Run `npm run typecheck && npm run lint` after each split
- [ ] Commit: `refactor: split all files exceeding 500 lines`

---

## Chunk 4.2: Centralize utilities and fix TypeScript

### Task 33: Create lib/mongo/objectid-utils.ts

- [ ] Create `lib/mongo/objectid-utils.ts`:
```typescript
import { Types } from 'mongoose';

export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ObjectId: ${id}`);
  return new Types.ObjectId(id);
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && Types.ObjectId.isValid(id);
}

export function toStringId(id: string | Types.ObjectId): string {
  return id instanceof Types.ObjectId ? id.toHexString() : id;
}
```
- [ ] Replace all inline duplicates in: `lib/services/api-stubs.ts`, `lib/services/public-reviews.ts`, `lib/services/saved-jobs.ts`, `lib/services/dashboardStatsService.ts`, `lib/auth-utils.ts`
- [ ] Run `npm run typecheck`

### Task 34: Consolidate duplicate utilities

- [ ] Identify all 3 copies of `getErrorMessage()` (in `hooks/realtime/utils.ts`, `utils/errorHandling.ts`, `contexts/ably/notification-utils.ts`)
- [ ] Keep only `utils/errorHandling.ts` version. Update the other two to import from there.
- [ ] Consolidate `ConfirmModal.tsx` vs `ConfirmationModal.tsx` — keep `ConfirmationModal.tsx` as canonical, update all `ConfirmModal` usages
- [ ] Align `utils/validation.ts` with `lib/validations/` — remove any schema-level validation from utils (it belongs in lib/validations/), keep only runtime utility helpers
- [ ] Run `npm run typecheck && npm run lint`

### Task 35: Fix TypeScript quality issues

- [ ] Add `"noUnusedLocals": true` and `"noUnusedParameters": true` to `tsconfig.json`
- [ ] Run `npm run typecheck` — fix all new errors this surfaces (unused variables, dead parameters)
- [ ] Replace all `BaseEntity` (Record<string, unknown>) return types in `hooks/query/` with properly typed interfaces — create `types/api-responses.ts` for shared response types
- [ ] Fix `||` vs `??` violations in `lib/otpService.ts`, `lib/reviews/job-review.ts`, `lib/signup-draft.ts`
- [ ] Run `npm run typecheck`

### Task 36: Fix app/auth/signup/page.tsx formatting

- [ ] Open `app/auth/signup/page.tsx`
- [ ] Run Prettier on it: `npx prettier --write "app/auth/signup/page.tsx"`
- [ ] Expand all single-line reducer/useEffect/useCallback functions into readable multi-line code
- [ ] Extract the `checkExistingUser` logic into a named function
- [ ] Remove hardcoded email from `app/auth/error/page.tsx` — replace with `env.SUPPORT_EMAIL` (add to env.ts)

### Task 37: Add ESLint rules

- [ ] Open `.eslintrc.json`
- [ ] Add rules:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "jsx-a11y/label-has-associated-control": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "MemberExpression[object.name='process'][property.name='env']",
        "message": "Use lib/env.ts instead of process.env directly"
      }
    ]
  }
}
```
- [ ] Run `npm run lint` — fix all new errors
- [ ] Commit: `refactor: centralize utilities, fix TypeScript, ESLint hardening`

---

# PHASE 5: Test Coverage

> **Deliver:** Integration tests for all 96 API routes. All 5 E2E user flows. Test infra fixed.

---

## Chunk 5.1: Fix test infrastructure

### Task 38: Fix jest.setup.js — remove auto-CSRF injection

- [ ] Open `jest.setup.js`
- [ ] Find the auto-CSRF injection block (around line 142-186)
- [ ] Remove the global Request wrapper that auto-attaches CSRF tokens
- [ ] Instead, export a helper:
```typescript
// tests/helpers/csrf.ts
export function withCsrf(headers: HeadersInit = {}): HeadersInit {
  return { ...headers, 'x-csrf-token': 'test-csrf-token' };
}
```
- [ ] Update all existing tests that currently work because of auto-injection to explicitly use `withCsrf()`
- [ ] Run `npm run test` — confirm all tests still pass

### Task 39: Fix Redis mock

- [ ] Open `jest.setup.js`
- [ ] Find the Redis mock (around line 294-326)
- [ ] Add missing methods:
```typescript
const redisMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  pexpire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  pttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue(['0', []]),
  pipeline: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
};
```
- [ ] Run `npm run test`
- [ ] Commit: `test: fix jest setup — explicit CSRF, complete Redis mock`

---

## Chunk 5.2: Integration tests — Jobs

**For each test file:**
- Use `mongodb-memory-server` (already configured via jest)
- Mock `getServerSession` to return an authenticated session
- Include CSRF header explicitly with `withCsrf()`
- Test: happy path, unauthenticated, validation error, not-found, forbidden (wrong role)

### Task 40: Tests for job CRUD

- [ ] Create `tests/integration/api/job-post.test.ts`
  - POST `/api/jobs/post` — hirer can post, fixer cannot, validation errors
- [ ] Create `tests/integration/api/job-browse.test.ts`
  - GET `/api/jobs/browse` — returns open jobs, filter by category/location/budget
- [ ] Create `tests/integration/api/job-detail.test.ts`
  - GET/PUT `/api/jobs/[jobId]` — fetch detail, edit (only owner), not-found

### Task 41: Tests for job lifecycle

- [ ] Create `tests/integration/api/job-apply.test.ts`
  - POST `/api/jobs/[jobId]/apply` — fixer can apply, hirer cannot, duplicate blocked
- [ ] Create `tests/integration/api/job-complete.test.ts`
  - POST `/api/jobs/[jobId]/complete` — transitions state, only assigned fixer
- [ ] Create `tests/integration/api/job-save.test.ts`
  - POST/DELETE `/api/jobs/[jobId]/save` — save/unsave, fetch saved list
- [ ] Create `tests/integration/api/job-drafts.test.ts`
  - GET/POST/PUT/DELETE `/api/jobs/drafts/*` — full draft lifecycle

---

## Chunk 5.3: Integration tests — Admin, Subscription, Upload, Stripe

### Task 42: Admin route tests

- [ ] Create `tests/integration/api/admin-stats.test.ts` — GET `/api/admin/stats`, admin only
- [ ] Create `tests/integration/api/admin-users.test.ts` — GET `/api/admin/users`, suspend, verify
- [ ] Create `tests/integration/api/admin-disputes.test.ts` — GET/PUT admin dispute management
- [ ] Test that all admin routes return 403 for non-admin users

### Task 43: Subscription and payment tests

- [ ] Create `tests/integration/api/subscription.test.ts`
  - GET/PUT `/api/subscription/fixer` and `/hirer`
  - POST `/api/subscription/create-order`
- [ ] Create `tests/integration/api/stripe-webhook.test.ts`
  - POST `/api/stripe/webhook` with valid Stripe signature
  - Test idempotency — duplicate events ignored

### Task 44: Upload tests

- [ ] Create `tests/integration/api/upload.test.ts`
  - POST `/api/upload` — auth required, file size limit, type validation
  - Mock Cloudinary upload

---

## Chunk 5.4: Integration tests — User profile, notifications, search

### Task 45: User profile and settings tests

- [ ] Create `tests/integration/api/user-preferences.test.ts`
  - GET/PUT `/api/user/preferences`, `/api/user/privacy`
- [ ] Create `tests/integration/api/user-fixer-settings.test.ts`
  - GET/PUT `/api/user/fixer-settings`
- [ ] Create `tests/integration/api/user-location.test.ts`
  - GET/PUT/DELETE `/api/user/location` and `/location/history`

### Task 46: Notifications and search tests

- [ ] Create `tests/integration/api/notifications-full.test.ts`
  - GET `/api/user/notifications`, mark read, mark all read, delete one
- [ ] Create `tests/integration/api/search.test.ts`
  - GET `/api/search/suggestions` — returns suggestions, handles empty query

---

## Chunk 5.5: E2E flows

**Setup:** Use a real test database (not mocked). Each E2E test creates its own users via API calls before the browser flow. Do NOT use `page.route()` mocking except for Ably (real-time is impractical in CI).

### Task 47: E2E Flow 1 — Hirer posts job, accepts fixer

- [ ] Create `tests/e2e/hirer-post-accept.spec.ts`
```typescript
test('hirer signup → post job → accept fixer', async ({ page }) => {
  // 1. Sign up as hirer
  await page.goto('/auth/signup');
  // ... fill signup form, select hirer role

  // 2. Post a job
  await page.goto('/dashboard/post-job');
  // ... fill job form, submit

  // 3. Fixer applies (via API helper)
  const fixerToken = await createTestFixer();
  await applyToJob(fixerToken, jobId);

  // 4. Hirer reviews applications
  await page.goto(`/dashboard/jobs/${jobId}`);
  await expect(page.locator('[data-testid="applications-tab"]')).toBeVisible();

  // 5. Accept the fixer
  await page.click('[data-testid="accept-application"]');
  await expect(page.locator('[data-testid="job-status"]')).toHaveText('In Progress');
});
```

### Task 48: E2E Flow 2 — Fixer browses and applies

- [ ] Create `tests/e2e/fixer-browse-apply.spec.ts`
  - Fixer signup → browse jobs → apply → see in applications list

### Task 49: E2E Flow 3 — Job completion and review

- [ ] Create `tests/e2e/job-completion-review.spec.ts`
  - Set up hirer + fixer + accepted job via API helpers
  - Fixer marks job complete → hirer confirms → both submit reviews
  - Verify ratings updated on profile

### Task 50: E2E Flow 4 — Dispute filing

- [ ] Create `tests/e2e/dispute-flow.spec.ts`
  - Set up completed job via API helpers
  - Hirer files dispute → verify dispute appears in dashboard → admin resolves

### Task 51: E2E Flow 5 — Real-time messaging

- [ ] Create `tests/e2e/realtime-messaging.spec.ts`
  - Open two browser contexts (hirer + fixer)
  - Hirer sends message → verify it appears in fixer's window (Ably)
  - Fixer replies → verify it appears in hirer's window
  - Note: Mock Ably channel in CI, use real in staging

- [ ] Run all E2E tests: `npm run test:e2e`
- [ ] Commit: `test: complete E2E coverage for all 5 required user flows`

---

# PHASE 6: Observability and Scale

> **Deliver:** Sentry fully wired. Redis caching on hot paths. Connection health. Performance monitoring.

---

## Chunk 6.1: Sentry integration

### Task 52: Verify Sentry is capturing correctly

- [ ] Open `instrumentation.ts` and `instrumentation-client.ts`
- [ ] Verify Sentry DSN comes from `env.SENTRY_DSN` (not process.env)
- [ ] Verify `app/global-error.tsx` passes errors to Sentry
- [ ] Add Sentry transaction tracking to slow operations (DB queries > 1s, Ably publishes)
- [ ] Test: trigger a known error in dev, verify it appears in Sentry dashboard

---

## Chunk 6.2: Redis caching on hot paths

### Task 53: Cache job browse results

- [ ] Open `app/api/jobs/browse/route.ts`
- [ ] Add Redis cache with 60-second TTL on browse results (keyed by query params):
```typescript
import { getRedis } from '@/lib/redis';
const redis = getRedis();
const cacheKey = `jobs:browse:${JSON.stringify(queryParams)}`;
const cached = await redis.get(cacheKey);
if (cached) return successResponse(JSON.parse(cached));
// ... fetch from DB ...
await redis.setex(cacheKey, 60, JSON.stringify(result));
```
- [ ] Invalidate cache on new job post (in `lib/services/jobs/createJob.ts`):
```typescript
await redis.del('jobs:browse:*'); // or use pattern-based invalidation
```

### Task 54: Cache user profiles

- [ ] Open `app/api/user/profile/[username]/route.ts`
- [ ] Add 5-minute cache on public profiles:
```typescript
const cacheKey = `profile:${username}`;
```
- [ ] Invalidate on profile update

### Task 55: Health and readiness endpoints

- [ ] Open `app/api/health/route.ts`
- [ ] Implement proper health check that tests DB + Redis connectivity:
```typescript
export async function GET() {
  const [dbHealth, redisHealth] = await Promise.allSettled([
    getDatabaseHealth(),
    redis.ping()
  ]);
  const status = dbHealth.status === 'fulfilled' && redisHealth.status === 'fulfilled'
    ? 'healthy' : 'degraded';
  return successResponse({ status, db: dbHealth.status, redis: redisHealth.status });
}
```
- [ ] Run full test suite: `npm run test`
- [ ] Run build: `npm run build` — must be clean zero errors
- [ ] Run typecheck: `npm run typecheck` — zero errors
- [ ] Run lint: `npm run lint` — zero errors
- [ ] Commit: `feat: Redis caching, health endpoint, observability complete`

---

## Final Checklist Before Production Deploy

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all pass
- [ ] `npm run test:e2e` — all 5 flows pass
- [ ] `npm run build` — clean build
- [ ] `npm run verify:env` — all services reachable
- [ ] Stripe webhook endpoints registered in Stripe dashboard
- [ ] All Ably app keys configured for production
- [ ] Sentry DSN configured for production environment
- [ ] VAPID keys set for web push
- [ ] SMTP credentials verified
- [ ] Admin user created via `/api/admin/setup`
- [ ] Run smoke test on staging before prod deploy
