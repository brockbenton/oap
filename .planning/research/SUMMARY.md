# Research Summary: OAP Go-Live on Base Sepolia

**Project:** OAP (Onchain Attendance), milestone "go live on Base Sepolia"
**Domain:** Soulbound, gasless (relayed) attendance-token dApp for one university club
**Researched:** 2026-10-27
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

OAP is a POAP-style three-tier system:

- A Vercel Next.js frontend with Privy embedded wallets signs the check-in.
- An Express API verifies the signature, writes a PENDING `CheckIn` row and enqueues a BullMQ job.
- A worker using a single relay wallet mints the soulbound ERC-1155 token and reconciles the result against `balanceOf`.

The code is mostly built but has never run end to end. This milestone is a **productionisation** job, not a feature build. The stack stays the same, with small additions: helmet, Sentry, Vitest with Testing Library, and a BullMQ job scheduler.

Treat "a real phone check-in produces an on-chain token" as a **hard gate**, and build everything else behind it. Two silent blockers must be fixed first:

1. **Redis URL bug (verified).** `backend/src/lib/queue.ts` and `backend/src/jobs/mint.job.ts` pass `{ url: REDIS_URL }` as a connection options object. ioredis ignores `url` in that position and falls back to `localhost:6379`. On a real host `/health` stays green while every check-in stays PENDING forever.
2. **Unknown role wiring.** It is unknown whether the relay key holds `RELAY_ROLE`, or who holds `DEFAULT_ADMIN_ROLE`. A `hasRole` pre-flight and a keep-or-redeploy decision come before any deploy work.

After the gate, the risks are operational: mints stuck in PENDING or permanently FAILED, a drained relay wallet, nonce races if the API runs more than one replica, and ABI/address/chain drift across five places. Each has a cheap, standard mitigation. For the real-data pages, the main risk is scope creep. Derive everything from `check_ins`, sessions and members, and cut or reframe anything with no data source.

## Key Findings

### Stack (STACK.md)
- Bump Node 20 to 22 (`engines.node >=22.12`, `.nvmrc`, CI, Railway, Vercel). Current Vitest, jsdom, jest-dom and Sentry require it.
- Use Railway Hobby (about $5-8/mo) for the API, Postgres and Redis, since `railway.toml` already exists. Redis must use `noeviction` with AOF persistence. Keep the API and worker in one service, with a `RUN_WORKER` flag.
- Security middleware:
  - helmet ^8.3.0.
  - A CORS allowlist read from `FRONTEND_ORIGIN`.
  - `trust proxy` set to `1`, not `true`.
  - `crossOriginResourcePolicy: 'cross-origin'`, so the art images keep loading.
- Sentry: `@sentry/node` and `@sentry/nextjs` ^10.77.1. Use v10, not v11, for Next 14.2, and don't mix majors. Set `sendDefaultPii: false` and scrub the auth headers.
- Use BullMQ `upsertJobScheduler` for the sweeper and the balance monitor. Keep the worker at `concurrency: 1`. No node-cron.
- Add an uptime ping (UptimeRobot or Better Stack) and a Discord webhook for alerts.
- Frontend tests:
  - Vitest ^4.1.12 and jsdom ^27.
  - Testing Library: react 16, dom 10, user-event 14, jest-dom 7.
  - msw ^2.15.
  - Mock Privy and `next/navigation`.
- Avoid: Express 5, Vitest 5, msw 3, Sentry 11, the Upstash free Redis tier, and reusing the admin or deployer key as the relay key.

### Features (FEATURES.md)
The mock pages promise a multi-club product with levels, XP and claimable rewards. One club's data only supports a subset of that, so the pages should show only what is true.

- **Must have:**
  - Mint status per check-in (PENDING, CONFIRMED or FAILED), shown with polling and a BaseScan link.
  - An honest FAILED state with a retry path.
  - "My attendance" history.
  - A single, real club page.
  - Explore built on real aggregates, without the clubs stat. It covers the recent-mint feed, collectors, and "Popular sessions" in place of trending topics.
  - Privacy-safe feeds that show a username or truncated address.
  - Rewards as derived achievements: Founding Member, Early Bird, Five-Week Streak, Perfect Semester and Semester MVP. Define "consecutive" by session sequence.
  - A live meeting view that polls every 3-5 s.
  - Empty, loading and error states everywhere.
  - A leaderboard whose timeframe tabs reflect real data.
- **Should have (pick one or two):** streak display, edition numbers.
- **Defer:** shareable cards and a public verify page, rank delta, levels/XP, Community Pin, Speaker Spotlight, multi-club support, claimable tokens, websockets, an indexer.
- **Never:** fabricated entries, or a mock fallback when the API fails.

### Architecture (ARCHITECTURE.md)
- Keep the three-tier layout with **exactly one API replica**.
- Add the sweeper, the balance monitor, Sentry (initialised first in `index.ts`), public read endpoints and a deep `/health` check.
- Code fixes:
  - `check-in.ts` has no try/catch around the enqueue, so a Redis blip leaves a PENDING row and the member's retry returns 409.
  - The enqueue sets no `jobId`.
  - FAILED is a dead end with no retry.
  - The relay balance is only checked at startup.
  - The address and ABI are duplicated in five places.
- Fix role problems with `grantRole` calls, not redeploys.

### Pitfalls (PITFALLS.md), top 5
1. **Redis `{url}` is ignored.**
   - Fix: use `new IORedis(REDIS_URL, { maxRetriesPerRequest: null })` or parse the URL, and share one connection module.
   - Verify: `ping` at boot, a deep `/health`, and a unit test on the parsed host.
2. **Missing roles or an unknown default-admin key.** Run a `hasRole` pre-flight for all three keys at deploy and at boot. Use separate, testnet-only keys.
3. **Stuck PENDING, permanent FAILED, Redis eviction.** Add a sweeper with `jobId = checkInId`, wrap the enqueue in try/catch and still return 202, require `noeviction`, and add an admin requeue.
4. **Single process and SIGTERM.**
   - Pin one replica and add graceful shutdown.
   - On a receipt timeout, re-check `balanceOf`, and store `txHash` as early as possible.
   - Burst-test with 20-40 check-ins.
5. **Config and env drift.**
   - Add an ABI/address check in CI and a chain/code sanity check at boot, and make `CHAIN_ID` required.
   - Make the Privy origins, app ID and token type match between Vercel and Railway.
   - Keep Prisma in `dependencies` so `migrate deploy` works at runtime.
   - Fix the production domain before onboarding anyone, because passkeys are bound to it.

## Implications for Roadmap

1. **Chain readiness, backend deploy and E2E mint proof (gated).**
   - Node 22.
   - Role pre-flight and the keep-or-redeploy decision.
   - Separate, funded relay and admin-signer keys.
   - Redis fix with a boot ping, and a deep `/health`.
   - Env validation.
   - Railway Postgres and Redis.
   - Minimal security.
   - Vercel and Privy wiring.
   - ABI/address drift check.
   - Sentry.
   - Rehearse locally, then run the live E2E checklist: create a session, check in from a phone, confirm `balanceOf`=1, check that a duplicate gets 409 and an expired QR gets 400, then run a burst test.
2. **Reliability.**
   - Enqueue try/catch plus `jobId`.
   - A sweeper for stale PENDING rows and capped FAILED retries.
   - A periodic balance monitor with alerts.
   - SIGTERM handling and receipt-timeout handling.
   - Sentry reporting on worker failures.
   - Admin requeue and an uptime ping.
   - Validate by killing Redis and stopping the worker.
3. **Real-data pages.**
   - Mint status endpoint and UI.
   - Attendance history.
   - Single club page.
   - Explore.
   - Derived rewards.
   - Live meeting view.
   - Leaderboard.
   - Delete `frontend/lib/mock/*` and add a CI grep that keeps it gone.
4. **Frontend tests and CI hardening.**
   - Vitest setup.
   - `CheckInFlow` tests covering the signed-message contract.
   - Admin gate tests.
   - A backend signature-contract test.
   - Make CI fail hard on test failures.
   - A manual smoke checklist.

**Research flags:**
- Phase 1 needs research: Railway Redis and Node settings, Privy dashboard and token type, faucet limits, Basescan verification.
- Phase 3 needs a product-decision pass and a check of what the existing stats endpoints already compute.
- Phases 2 and 4 use standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | MEDIUM-HIGH | Versions and engines verified via `npm view`. Sentry quota and Node EOL are from training knowledge |
| Features | MEDIUM | Mock-to-schema mapping comes from the repo. Ecosystem norms are not verified |
| Architecture | HIGH / MEDIUM | Integration points come from the code. Hosting specifics are unchecked |
| Pitfalls | MEDIUM-HIGH | Redis bug verified in installed source and by local test. Platform claims are unverified |

## Gaps to Address

- Who holds RELAY_ROLE, ADMIN_ROLE and DEFAULT_ADMIN_ROLE? If DEFAULT_ADMIN is a lost key, redeploy once, before any member data exists.
- Does Railway Redis support `noeviction` with persistence?
- Is the Vercel deployment current, and what is the final production domain?
- Which Privy token does the frontend send, identity or access?
- Does the Railway Hobby budget hold up?
- Phase 3 product decisions:
  - Keep a "level" concept or not.
  - Make the explore feed public or members-only.
  - Define a "week" as a session in the sequence.
- How long does a burst of 40 sequential mints take to drain? Measure it in Phase 1.
- Is the contract verified on Basescan? The Etherscan API v2 migration may need a `foundry.toml` change.

## Sources

- **HIGH:** repo code; installed `ioredis`/`bullmq` source; npm registry (2026-10-27); BullMQ production guide.
- **MEDIUM:** Railway plans page; Coinbase CDP faucet docs.
- **LOW (validate in the relevant phase):** Sentry quota; Node 20 EOL; free hosting tiers; Railway private networking; Privy dashboard labels; Basescan v2.
