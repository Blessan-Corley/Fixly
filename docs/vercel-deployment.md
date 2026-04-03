# Vercel Deployment (Production / One-Click Ready)

## What Is Configured
- `vercel.json` uses the Next.js framework with explicit:
  - `installCommand: npm ci`
  - `buildCommand: npm run build`
  - serverless function `maxDuration: 30s` for `app/api/**/*`
- `npm run build` and `npm run typecheck` include `NODE_OPTIONS=--max-old-space-size=8192`
- `lib/db.ts`, `lib/redis.ts`, and `lib/ably.ts` use singleton patterns suitable for serverless / warm invocations
- Ably token endpoint (`/api/ably/auth`) is `nodejs` runtime and `no-store`

## One-Click Vercel Steps
1. Push repo to GitHub/GitLab/Bitbucket.
2. Import the repo into Vercel.
3. Framework preset: `Next.js` (auto-detected).
4. Build command: leave default (`npm run build`) unless overriding intentionally.
5. Install command: leave default (`npm ci`) unless overriding intentionally.
6. Add environment variables from `.env.example` in Vercel Project Settings.
7. Deploy.

## Required Environment Variables (Core Runtime)
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ABLY_ROOT_KEY`

## Region Alignment (Important)
For best latency and fewer timeouts, align Vercel execution region with your data providers:
- MongoDB Atlas region
- Upstash Redis region
- Ably primary usage region (if region-sensitive workflows are critical)

This repo does **not** hardcode Vercel regions anymore to keep one-click deployments portable.
Set the region in Vercel project settings if you need to pin execution near your database.

## Pre-Deploy Verification
- Local full check:
  - `npm run typecheck`
  - `npm run build`
- Optional deployment verification (includes live third-party checks):
  - `npm run verify:deployment`
- Skip live third-party checks when validating build only:
  - `node scripts/verify-deployment.js --skip-env-verify`

## Notes
- `npm run build` may emit ESLint warnings; warnings do not block deployment unless converted to errors.
- If local `tsc` is memory-constrained, the build/typecheck scripts already set a larger Node heap.
