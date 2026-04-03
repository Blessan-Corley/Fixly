# CLAUDE.md — Fixly Development Guide

## Project Overview

**Fixly** is a production-grade, on-demand service marketplace built on Next.js 14 (App Router). It connects **Hirers** (clients who post jobs) with **Fixers** (skilled professionals who apply and complete work).

### Core User Flows
```
Hirer:  Auth → Post Job → Review Applications → Accept Fixer → Messaging → Review/Dispute
Fixer:  Auth → Browse/Search Jobs → Apply → Get Accepted → Messaging → Complete Job → Review
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router, React 18, TypeScript 5.9 (strict) |
| Database | MongoDB 4.17 with Mongoose 8.0 ODM |
| Caching / Rate Limiting | Redis via Upstash (ioredis connection pooling) |
| Real-Time | Ably 2.13 (WebSocket messaging, presence, notifications) |
| Background Jobs | Inngest 3.52 (serverless event-driven functions) |
| Authentication | NextAuth.js 4.24 (Google OAuth) + Firebase Admin 12.0 (phone OTP) |
| Payments | Stripe 20.3 (primary), Razorpay 2.9 (backup) |
| File Storage | Cloudinary 1.41 (images/video), Firebase Storage (alt) |
| State Management | React Query (server state) + Zustand (client state) |
| Styling | Tailwind CSS 3.4, Radix UI, Framer Motion 10.16 |
| Forms | React Hook Form 7.48 |
| Error Tracking | Sentry 10.42 (client + server) |
| Logging | Pino 10.3 (structured, server-side) |
| Testing | Vitest 4.0 (unit), Jest 29.7 (integration), Playwright 1.40 (E2E) |
| Deployment | Vercel (serverless, 30s function timeout) |

---

## Essential Commands

```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Production build (must pass clean before any PR)
npm run typecheck        # TypeScript strict check — run after every file batch
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier formatting
npm run verify:env       # Verify all external services are reachable

# Testing
npm run test             # All unit + integration tests
npm run test:unit        # Vitest unit tests only
npm run test:unit:watch  # Vitest watch mode
npm run test:integration # Jest integration tests
npm run test:coverage    # Coverage report (HTML output)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI debug mode
npm run test:e2e:headed  # Run in headed browser

# Background Jobs (local dev only)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
# Then open http://localhost:8288 for the Inngest dashboard
```

---

## CRITICAL SERVERLESS RULES

These are non-negotiable on Vercel's serverless environment. Violating them causes connection exhaustion and cold-start failures.

### MongoDB
- **ALWAYS** use the Mongoose connection singleton in `lib/mongodb.ts`
- **NEVER** call `mongoose.connect()` inside a route handler
- Connection is initialized once and reused across invocations

### Redis
- **ALWAYS** import the ioredis singleton from `lib/redis.ts`
- **NEVER** call `new Redis()` inside any handler or service
- **NEVER** use Upstash REST client for pub/sub — use ioredis for that

### Ably
- **ALWAYS** use token-based auth via `lib/ably/client.ts`
- **NEVER** create persistent Ably sockets in serverless route handlers
- Token endpoint: `GET /api/ably/auth` — all clients must use this
- Publishing from server: use `lib/ably/publisher.ts`

```typescript
// CORRECT
import { getRedis } from '@/lib/redis';
const redis = getRedis();

// WRONG — kills serverless
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

---

## TypeScript Rules — NON-NEGOTIABLE

- **No `any`** — use `unknown` with proper type guards
- All `useRef`: `useRef<AbortController | null>(null)`
- All `useState`: `useState<Type[]>([])` with explicit type parameter
- All API responses typed with explicit interfaces in `types/`
- Use `??` not `||` for nullable numeric defaults
- All function return types must be explicit
- Run `npm run typecheck` after every file batch
- **Never commit if typecheck fails**

```typescript
// CORRECT
function parseCount(val: unknown): number {
  if (typeof val !== 'number') return 0;
  return val ?? 0;
}

// WRONG
function parseCount(val: any) {
  return val || 0;
}
```

---

## Authentication & Authorization

### Auth Stack
- **NextAuth.js** — primary session management (JWT, httpOnly cookies)
- **Firebase Admin** — phone OTP verification
- **Middleware** (`middleware.ts`) — enforces auth and role-based routing

### Role-Based Access Control
| Route | Required Role |
|-------|--------------|
| `/admin/*` | `admin` |
| `/dashboard/admin` | `admin` |
| `/dashboard/browse-jobs` | `fixer` |
| `/dashboard/post-job` | `hirer` |
| `/dashboard/*` (general) | any authenticated user |

### Auth Status Refresh
Middleware polls `/api/auth/status` with a 5-minute refresh window to detect real-time state changes (bans, deletions, account deactivation) and redirect appropriately.

### Server-Side Auth Pattern
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withAuth } from '@/lib/api/withAuth';

// In API routes:
const session = await getServerSession(authOptions);
if (!session) return unauthorizedResponse();
```

### Auth Module Structure (`lib/auth/`)
- `config.ts` — NextAuth configuration and authOptions
- `callbacks/signIn.ts` — Sign-in validation and blocking logic
- `callbacks/jwt.ts` — JWT generation and refresh
- `callbacks/session.ts` — Session shape hydration
- `callbacks/redirect.ts` — Post-auth redirect logic
- `providers.ts` — OAuth + Firebase provider config
- `types.ts` — Extended session/JWT TypeScript types
- `utils.ts` — Shared auth helpers

---

## API Response Standards

All API routes must use the shared response/error utilities:

```typescript
import { successResponse, errorResponse } from '@/lib/api/response';
import { AppError, handleApiError } from '@/lib/api/errors';

// Consistent success response
return successResponse({ data });

// Consistent error response
return errorResponse(new AppError('Not found', 404));

// CSRF protection — required for all mutating endpoints
import { validateCsrf } from '@/lib/security/csrf.server';
await validateCsrf(request);
```

---

## Project Structure

```
F:\My Projects\Fixly\
├── app/                        # Next.js App Router
│   ├── (public pages)          # about/, pricing/, how-it-works/, etc.
│   ├── auth/                   # signin/, signup/, forgot-password/, etc.
│   ├── dashboard/              # Protected — all role-gated pages
│   │   ├── jobs/[jobId]/       # Job details, edit, apply, messages
│   │   ├── post-job/           # Multi-step job posting (hirer)
│   │   ├── browse-jobs/        # Job search (fixer)
│   │   ├── applications/       # My applications (fixer)
│   │   ├── messages/           # Messaging center
│   │   ├── earnings/           # Earnings dashboard (fixer)
│   │   ├── subscription/       # Subscription management
│   │   ├── disputes/[id]/      # Dispute management
│   │   ├── profile/            # User profile
│   │   ├── settings/           # Account settings
│   │   └── admin/              # Admin dashboard (admin only)
│   ├── jobs/[jobId]/           # Public job view, dispute, reviews
│   ├── profile/[username]/     # Public profile page
│   └── api/                    # 80+ API routes
├── components/                 # React components
│   ├── auth/                   # Auth UI (AuthShell, FirebasePhoneAuth, OtpCodeInput)
│   ├── dashboard/              # Dashboard layout + feature components
│   │   ├── layout/             # Sidebar, TopBar, MobileNav, NotificationBell
│   │   ├── jobs/               # Job detail modals and tabs
│   │   ├── post-job/           # Multi-step posting form components
│   │   ├── profile/            # Profile sections and modals
│   │   └── settings/           # Per-section settings panels
│   ├── jobs/                   # Job cards, application modal, rating modal
│   │   └── comments/           # JobCommentsPanel + sub-components
│   ├── landing/                # Landing page section components
│   ├── browse-jobs/            # Browse-jobs filter + card components
│   ├── find-fixers/            # Find-fixers filter + card + modal components
│   ├── applications/           # Application card + filter components
│   ├── notifications/          # Notification item + group components
│   ├── disputes/               # Dispute card + filter components
│   ├── earnings/               # Earnings metric + chart components
│   ├── apply/                  # Job application form step components
│   └── LocationPicker/         # Google Maps location selector
├── contexts/                   # React context providers
│   ├── AblyContext.tsx          # WebSocket connection provider
│   ├── ThemeContext.tsx         # Dark/light mode
│   └── LoadingContext.tsx       # Global loading state
├── hooks/                      # Custom React hooks
│   ├── query/                  # React Query hooks (jobs, users, messages, etc.)
│   └── realtime/               # Ably real-time hooks
├── lib/                        # Core business logic and utilities
│   ├── api/                    # HTTP utilities (errors, response, withAuth, CSRF)
│   ├── ably/                   # Ably client, publisher, event hooks
│   ├── auth/                   # NextAuth config + per-callback modules
│   ├── db.ts / mongodb.ts      # MongoDB singleton
│   ├── redis.ts                # Redis singleton
│   ├── inngest/                # Background job functions
│   ├── services/               # Domain services (jobs, messages, notifications, billing)
│   ├── validations/            # Zod schemas + content moderation engine
│   ├── redis/                  # Redis utilities (rate-limit, scan, etc.)
│   ├── stores/                 # Zustand stores (auth, ui, notifications, connection)
│   ├── queries/                # React Query key constants
│   ├── security/               # CSRF utilities
│   └── stripe/                 # Stripe client + webhook idempotency
├── models/                     # Mongoose schemas (all split into sub-modules)
│   ├── User.ts / user/         # User model (split: schema, methods, statics, hooks, helpers)
│   ├── Job/ (index.ts)         # Job model (split: schema.base, applications, comments, etc.)
│   ├── Review.ts / review/     # Review model (split: schema, methods, statics, hooks, indexes)
│   ├── Dispute.ts
│   ├── Conversation.ts
│   ├── JobDraft.ts
│   └── PaymentEvent.ts
├── services/                   # Auth-specific service layer
├── types/                      # TypeScript interfaces and declarations
├── utils/                      # Pure utility functions
├── data/                       # Static data (cities, validation rules)
├── scripts/                    # One-off migration and seeding scripts
├── styles/                     # Global CSS
├── tests/                      # All test files
│   ├── unit/                   # Vitest unit tests
│   ├── integration/api/        # Jest integration tests
│   └── e2e/                    # Playwright E2E specs
├── public/                     # Static assets, PWA manifest, service worker
├── docs/                       # Internal documentation
└── middleware.ts               # Auth validation + role-based routing
```

---

## Data Models (MongoDB)

### User
Fields: email, phone, passwordHash, username, bio, avatar, location, skills, role (`hirer`|`fixer`|`admin`), status flags (banned, isActive, deleted, isRegistered), verificationStatus, subscriptionTier, ratings, reviewCount.

### Job (split-schema architecture in `models/Job/`)
- `schema.base.ts` — title, description, budget, location, status, category
- `schema.applications.ts` — embedded application sub-documents
- `schema.comments.ts` — job discussion thread
- `schema.messages.ts` — job-scoped messaging
- `schema.workflow.ts` — state machine constants
- `methods/` — split by domain: applications, status, comments, reactions, disputes, reviews, messaging
- `statics.ts`, `hooks.ts`, `indexes.ts`, `virtuals.ts`

**Job Status State Machine:**
```
draft → open → in_progress → completed
             ↘ cancelled
                          ↘ disputed
```

### Review (split-schema architecture in `models/review/`)
- `schema.ts`, `methods.ts`, `statics.ts`, `hooks.ts`, `indexes.ts`, `types.ts`

### Other Models
- **Dispute** — hirer, fixer, issue, status (open|pending|resolved), evidence, resolution
- **Conversation** — participants, lastMessage, timestamps
- **JobDraft** — temporary posting data (auto-expires)
- **PaymentEvent** — Stripe transaction tracking with idempotency
- **JobView** — analytics view tracking
- **VerificationToken** — email/phone tokens with expiry

---

## Real-Time Architecture (Ably)

### Channel Naming Convention
```
job:{jobId}          — job status/activity updates
user:{userId}        — personal notifications
conversation:{id}    — messaging channel
presence:{jobId}     — who's viewing a job
```

### Publishing from Server
```typescript
import { publishToChannel } from '@/lib/ably/publisher';

await publishToChannel(`job:${jobId}`, 'status-changed', { status: 'in_progress' });
```

### Subscribing in Components
```typescript
import { useAblyChannel } from '@/lib/ably/hooks/useAblyChannel';
import { useAblyEvent } from '@/lib/ably/hooks/useAblyEvent';

const channel = useAblyChannel(`job:${jobId}`);
useAblyEvent(channel, 'status-changed', (msg) => { /* handle */ });
```

---

## Background Jobs (Inngest)

Event-driven functions in `lib/inngest/functions/`:

| Function | Trigger Event |
|----------|--------------|
| `onUserSignup` | `user/signed-up` |
| `onJobPosted` | `job/posted` |
| `onApplicationReceived` | `job/application-received` |
| `onApplicationDecision` | `job/application-accepted` or `rejected` |
| `onPaymentConfirmed` | `payment/confirmed` |
| `onDisputeOpened` | `dispute/opened` |
| `onNotificationSend` | `notification/send` |
| `closeInactiveJobs` | Scheduled cron |
| `orphanUploadSweep` | Scheduled cron |

```typescript
import { inngest } from '@/lib/inngest/client';

await inngest.send({ name: 'job/posted', data: { jobId, hirerId } });
```

---

## Testing Strategy

### Layer 1 — Unit Tests (`tests/unit/`)
- Framework: **Vitest**
- Target: Pure functions, utils, validators, model methods
- **No DB or Redis mocking** — test logic only
- File naming: `tests/unit/[module].test.ts`

### Layer 2 — Integration Tests (`tests/integration/api/`)
- Framework: **Jest**
- Target: Every API route in `app/api/`
- Mock strategy:
  - MongoDB → `mongodb-memory-server`
  - Redis → `ioredis-mock`
  - Ably → mock token generation only (not the socket)
  - NextAuth → mock `getServerSession`
- Cover: happy path + auth failures + validation errors + edge cases
- File naming: `tests/integration/api/[route].test.ts`

### Layer 3 — E2E Tests (`tests/e2e/`)
- Framework: **Playwright**
- Target: Core user flows only (not every edge case)
- Uses real browser + seeded test DB (scripts/seed-test-db.ts)
- Required flows:
  1. Hirer signup → post job → review applicants → accept fixer
  2. Fixer signup → browse → apply → accepted → message hirer
  3. Job completion → review submission
  4. Dispute filing flow
  5. Real-time messaging between hirer and fixer
- File naming: `tests/e2e/[flow].spec.ts`

### Testing Rules
- **Never mock away** the actual business logic being tested
- **Never write tests** that only test the mock
- Tests must pass with `npm run test` before any commit

---

## Validation & Content Safety

All input validation uses **Zod schemas** in `lib/validations/`:
- `lib/validations/auth.ts` — auth inputs
- `lib/validations/job.ts` — job fields
- `lib/validations/post-job.ts` — job posting form
- `lib/validations/user.ts` / `profile.ts` — user/profile
- `lib/validations/review.ts` — review content
- `lib/validations/message.ts` — messaging
- `lib/validations/dispute.ts` — dispute forms

Content moderation engine at `lib/validations/content/engine.ts` with rules for:
- Profanity (`rules/profanity.ts`)
- Spam detection (`rules/spam.ts`)
- Safety violations (`rules/safety.ts`)
- Policy enforcement (`rules/policy.ts`)

---

## State Management

### Server State — React Query
Query key constants in `lib/queries/`. All query hooks in `hooks/query/`:
- `hooks/query/jobs.ts`, `applications.ts`, `messages.ts`, `notifications.ts`
- `hooks/query/users.ts`, `reviews.ts`, `disputes.ts`, `subscription.ts`
- `hooks/query/admin.ts`, `dashboard.ts`, `search.ts`

**Stale time guidelines:**
- Job listings: `staleTime: 30_000` (30s)
- Job detail: `staleTime: 60_000` (60s)
- User profiles: `staleTime: 60_000`
- Dashboard stats: `staleTime: 120_000` (2min)
- Static data (plans, cities): `staleTime: Infinity`

### Client State — Zustand
Stores in `lib/stores/`:
- `authStore.ts` — authenticated user state
- `uiStore.ts` — UI state (sidebars, modals)
- `notificationStore.ts` — notification badge counts
- `connectionStore.ts` — Ably connection status

---

## Security

### CSRF Protection
All mutating API routes (POST, PUT, PATCH, DELETE) must validate CSRF:
```typescript
import { validateCsrf } from '@/lib/security/csrf.server';
await validateCsrf(request); // throws 403 if invalid
```

Client-side fetch: use `fetchWithCsrf` from `lib/api/fetchWithCsrf.ts`.

### Rate Limiting
Redis-backed rate limiting in `lib/redis/rate-limit.ts`. Apply to all public-facing endpoints and auth routes.

### File Uploads
- Validate with `lib/fileValidation.ts` before processing
- Sanitize filenames with `lib/files/sanitiseFilename.ts`
- Upload rate-limiting via `lib/files/uploadRateLimit.ts`
- Store via Cloudinary (`lib/cloudinary.ts`)

### Environment Variables
Validated at startup via `lib/env.ts` (T3 env pattern). Never access `process.env` directly in app code — import from `lib/env.ts`.

---

## Subscriptions & Billing

Plans defined in `lib/services/billing/plans.ts`. Feature entitlements via `lib/services/billing/entitlementService.ts`.

Stripe webhook handler at `app/api/stripe/webhook/route.ts` with idempotency tracking in `lib/stripe/webhookIdempotency.ts`.

Stripe webhook handlers split into:
- `app/api/stripe/webhook/resolvers.ts` — user resolution helpers
- `app/api/stripe/webhook/handlers/` — one file per event type

---

## Notifications

Multi-channel notification system in `lib/services/notifications/`:
- **In-app** (Ably real-time) — `publisher.ts`
- **Email** (Nodemailer/SMTP) — `email.ts` + `templates.ts`
- **Web Push** (VAPID) — `push.ts`
- **WhatsApp** — `lib/whatsapp.ts`

User preferences managed via `preferences.ts`. Persisted to DB via `persistence.ts`.

---

## Location Services

- Google Maps API for address search and geocoding
- `components/LocationPicker/` — full map UI component with Places search, marker control, geocode cache
- `lib/location/geo.ts` — geospatial utilities
- `lib/services/locationHistory/` — split into tracking.ts, locations.ts, suggestions.ts, utils.ts, types.ts
- MongoDB geospatial indexes on Job and User for `$near` / `$geoWithin` queries

---

## File & Code Conventions

### File Naming
- React components: `PascalCase.tsx`
- Hooks: `useHookName.ts`
- Utilities/services: `camelCase.ts`
- Route handlers: `route.ts` (Next.js App Router)
- Test files: `*.test.ts` (unit/integration), `*.spec.ts` (E2E)

### Commit Messages (Conventional Commits — enforced by commitlint)
```
feat:     new user-facing feature
fix:      bug fix
refactor: code restructuring, no behavior change
test:     adding or fixing tests
chore:    build, config, tooling changes
docs:     documentation only
perf:     performance improvement
style:    formatting only
```

### File Size Rules
| File type | Max lines | Action when exceeded |
|-----------|-----------|----------------------|
| Page component (`page.tsx`) | 200 | Extract section components to `components/[feature]/` |
| React component (`.tsx`) | 250 | Extract sub-components and custom hooks |
| Service / lib module (`.ts`) | 200 | Split by responsibility into sub-modules |
| API route (`route.ts`) | 150 | Extract helpers to adjacent `helpers/` or `handlers/` |
| Model file | 200 | Split like Job model (schema, methods, statics, hooks, indexes) |
| Pure utility | 100 | One concern per file |

### Component Splitting Pattern
```
components/
  [feature]/
    [Feature]Page content stays in page.tsx (data loading + composition only)
    SubComponent.tsx     ← extracted UI piece
    AnotherPiece.tsx     ← extracted UI piece
    hooks/
      useFeatureLogic.ts ← extracted state/effect logic
    utils/
      normalization.ts   ← data transformation helpers
    types.ts             ← local TypeScript interfaces
```

### Refactoring Rules
- Page files: data fetching + composition only — no inline JSX business logic
- Extract every reusable sub-component into its own file
- Shared logic between routes: extract to `lib/` or `services/`
- No duplicate validation logic — always use `lib/validations/`
- No inline MongoDB queries in route handlers — use `models/` or `lib/services/`
- After any refactor: `npm run typecheck && npm run test` must both pass

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values. Key groups:

| Group | Variables |
|-------|----------|
| App | `NODE_ENV`, `PORT`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` |
| Database | `MONGODB_URI` |
| Auth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FIREBASE_ADMIN_*`, `FIREBASE_CLIENT_*` |
| Real-Time | `ABLY_ROOT_KEY`, `ABLY_API_KEY`, `NEXT_PUBLIC_ABLY_CLIENT_KEY` |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL` |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Media | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Maps | `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Monitoring | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |
| Background | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| Push | `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` |
| Email | `SMTP_EMAIL`, `SMTP_PASSWORD`, `EMAIL_HOST`, `EMAIL_PORT` |
| Admin | `ADMIN_SETUP_KEY`, `ADMIN_NOTIFICATION_EMAIL` |
| Feature Flags | `MAINTENANCE_MODE`, `ALLOW_IN_MEMORY_AUTH_FALLBACK` |

---

## Deployment

**Platform:** Vercel (serverless, Next.js framework preset)
- API function max duration: **30 seconds** (configured in `vercel.json`)
- Install command: `npm ci`
- Build command: `npm run build`

**Security Headers** (applied globally via `vercel.json`):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

**Pre-Deployment Checklist:**
1. `npm run typecheck` — zero errors
2. `npm run lint` — zero errors
3. `npm run test` — all pass
4. `npm run build` — clean build
5. `npm run verify:env` — all services reachable
6. All Stripe webhook endpoints registered in Stripe dashboard
7. Ably app keys configured for the target environment
8. Inngest functions deployed to Inngest cloud (not local dev mode)
9. Sentry source maps uploaded (`SENTRY_AUTH_TOKEN` set in Vercel env)

---

## Current Development Phase

**Phase 2: Modularisation & Polish** (as of 2026-03-22)

Phase 1 is complete — all critical bugs, security issues, and infrastructure patterns are fixed. Tests passing (719 unit, 623 integration, 5 E2E flows). Build is clean.

Current focus:
1. Split all files exceeding size guidelines into modular sub-files
2. Ensure every React Query hook has correct `staleTime` (no stale data)
3. Verify Ably real-time subscriptions active on every page that needs live updates
4. Seed script for Playwright test DB (scripts/seed-test-db.ts) for CI
5. Web Push VAPID end-to-end test coverage
6. Landing page performance — Lighthouse score target 90+
7. PWA install prompt polish

---

## What NOT To Do

- **Never** create `new Redis()` inside a handler — use `lib/redis.ts`
- **Never** use persistent Ably connections in serverless functions
- **Never** use `any` type — use `unknown` with type guards
- **Never** write inline MongoDB queries in route handlers
- **Never** duplicate validation logic — centralize in `lib/validations/`
- **Never** mock away actual business logic in tests
- **Never** write tests that only verify mock behavior
- **Never** leave a half-refactored file — complete it or revert
- **Never** commit if `npm run typecheck` fails
- **Never** skip pre-commit hooks (`--no-verify` is forbidden)
- **Never** access `process.env` directly — use `lib/env.ts`
- **Never** skip CSRF validation on mutating endpoints
- **Never** put business logic directly in `page.tsx` — pages are composition roots only
- **Never** access `process.env` directly — import from `lib/env.ts`
