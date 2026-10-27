# Domain Pitfalls

**Domain:** Going live with a gasless relayed-mint attendance dApp (Express + BullMQ + Redis + Postgres + viem on Railway; Next.js 14 + Privy on Vercel; AccessControl ERC-1155 on Base Sepolia)
**Researched:** 2026-10-27
**Overall confidence:** MEDIUM-HIGH. Code-grounded findings were verified by reading the repo and installed `ioredis` 5.10.1 / `bullmq` 5.71.1 / `viem` 2.47.6. Platform-behavior claims (Railway, Privy dashboard, faucets) come from training knowledge and are marked LOW/MEDIUM where not re-verified.

## Critical Pitfalls

### Pitfall 1: Redis `{ url }` connection option is silently ignored (VERIFIED in code)
**What goes wrong:** `backend/src/lib/queue.ts` and `backend/src/jobs/mint.job.ts` both pass `connection = { url: process.env.REDIS_URL, ... }` to BullMQ. BullMQ hands that options object to ioredis. ioredis only parses URLs when given a string as the first constructor argument (`Redis.js` line ~621, `parseURL(arg)` runs only for string args). In an options object `url` is not a recognized key. BullMQ then fills in defaults `host: 127.0.0.1, port: 6379`.
**Why it happens:** Works locally because local Redis is on localhost, so it hides the bug. Tests don't open the socket (`lazyConnect`).
**Consequences:** On Railway the API boots (the `REDIS_URL` presence check passes), `/health` is green, then every `mintQueue.add` fails with ECONNREFUSED/retries exhausted and the worker never consumes. Check-ins stay `PENDING` forever. The worker's connection errors only appear as ioredis log noise. This directly breaks the Core Value.
**Prevention:**
- Parse the URL into explicit fields (`new URL(REDIS_URL)` -> host, port, username, password, `tls: {}` if `rediss:`) or pass `new IORedis(REDIS_URL, { maxRetriesPerRequest: null })` as `connection`.
- Create one shared connection module used by both Queue and Worker.
- Railway private-network hostnames (`*.railway.internal`) can require `family: 0` (dual-stack) on ioredis; without it you get ENOTFOUND/ETIMEDOUT. (MEDIUM, verify on the first deploy.)
- Add a startup `await redis.ping()` that fails fast (exit 1) and a `/health` that reports Redis and DB status, not just `{status:'ok'}`.
**Detection:** Log lines showing `127.0.0.1:6379`, ECONNREFUSED; PENDING check-ins with no job in the queue; `/health` ok while check-in never confirms.
**Phase:** Backend hosting/deploy phase (first thing, before any end-to-end test). Add a unit test that asserts the parsed connection host equals the `REDIS_URL` host.

### Pitfall 2: Relay wallet lacks RELAY_ROLE (or the roles went to the wrong address)
**What goes wrong:** `Deploy.s.sol` reads `RELAY_WALLET` and grants RELAY_ROLE to it. PROJECT.md notes it is unknown whether that is a key the owner controls, or whether it equals the `RELAY_PRIVATE_KEY` address. If different, every `mint` reverts with `AccessControlUnauthorizedAccount`. Same for `ADMIN_SIGNER_PRIVATE_KEY` (needs ADMIN_ROLE for `createSession`/`closeSession`) and `DEFAULT_ADMIN_PRIVATE_KEY` (needed for `grantRole`/`setBaseCid`; the deployer typically holds DEFAULT_ADMIN_ROLE, which may be a key that is not in the backend env at all).
**Why it happens:** Deployer, relay, admin signer, and default admin are four conceptually different keys; the deploy was done before the backend ever ran.
**Consequences:** Failures happen after the DB row is created and the job is enqueued, so they look like "stuck mint" rather than an obvious config error. Retries (3 attempts) burn time, then reconcile marks FAILED. Session creation by admin fails with revert after the DB row is written, risking DB/chain divergence.
**Prevention:**
- Pre-flight script (run in deploy checklist and at boot): `hasRole(RELAY_ROLE, relayAddress)`, `hasRole(ADMIN_ROLE, adminSignerAddress)`, `hasRole(DEFAULT_ADMIN_ROLE, ...)` via `cast call` or viem; log addresses derived from each private key. Fail boot (or at minimum a loud error) if the relay lacks the role.
- Confirm `RELAY_ROLE` hash matches: `backend/src/lib/roles.ts` uses `keccak256(toBytes('RELAY_ROLE'))`; confirm the Solidity constant is the same string (`cast call <addr> "RELAY_ROLE()"`).
- Find out who holds DEFAULT_ADMIN_ROLE on the deployed contract now (`cast call ... hasRole`/read `RoleGranted` logs on Basescan). If it is a lost/unknown key, the options are: redeploy (see Pitfall 9) or accept no role changes.
- Use `~/.foundry/bin/forge` / `cast` (per CLAUDE.md), not `/usr/bin/forge`.
**Detection:** Worker logs `AccessControlUnauthorizedAccount`; `eth_estimateGas` reverts during the first `mintOnChain`. A dry-run `simulateContract` for mint with the relay account catches it before spending gas.
**Phase:** Contract/roles verification (before the first live check-in).

### Pitfall 3: Mint worker in the same process as the API, and the first-deploy scale/restart model
**What goes wrong:** `index.ts` calls `startMintWorker()` inside `app.listen`. Railway redeploys, restarts, or (if replicas > 1) runs multiple copies. Each instance runs a worker with `concurrency: 1`, so N replicas means N concurrent mints from the same relay key. No graceful shutdown: SIGTERM during a mint leaves the job "stalled" and BullMQ may re-run it after the lock expires (mint tx already sent -> double submission, 2nd reverts with AlreadyCheckedIn, handled only by `balanceOf` reconcile).
**Why it happens:** Convenient single-process dev layout carried into production; Railway sends SIGTERM on every deploy.
**Consequences:** Nonce collisions (`nonce too low` / `replacement transaction underpriced`) when two workers share the key; stalled-job double processing; API latency affected by worker's long `waitForTransactionReceipt` (120s).
**Prevention:**
- Keep exactly 1 replica for the backend service this round (state it explicitly in the Railway config). Worker in-process is acceptable for one club if replicas = 1.
- Add SIGTERM/SIGINT handlers: `await worker.close()`, `await mintQueue.close()`, `prisma.$disconnect()`, `server.close()`.
- Keep `concurrency: 1`. Treat a later split into a separate worker service as the scaling path, still with a single relay key per worker.
- Ensure `/health` does not depend on the worker being busy (the healthcheck timeout is 30s in `railway.toml`; a slow first Prisma migrate on start can exceed it -> deploy flagged failed).
**Detection:** Duplicate "Processing mint job" logs for the same `checkInId`; `nonce too low` errors; Railway deploy loops from healthcheck timeouts.
**Phase:** Backend hosting phase (config), reliability phase (graceful shutdown + sweeper).

### Pitfall 4: Check-ins stuck PENDING with no recovery (known design gap) and Redis eviction/persistence
**What goes wrong:** `check-in.ts` creates the DB row, then `mintQueue.add`. If Redis is down, misconfigured (Pitfall 1), or the managed Redis restarts without persistence or evicts keys, the row stays PENDING forever. Railway's Redis plugin and free tiers may have `maxmemory-policy` settings that evict BullMQ keys (BullMQ requires `noeviction`). (MEDIUM; verify with `CONFIG GET maxmemory-policy` where allowed. Upstash-style hosts may block this config or count commands against a free quota; BullMQ polling can exhaust a request-based free tier quickly.)
**Why it happens:** Two-phase write, no sweeper, and DB is source of truth but queue is volatile.
**Consequences:** Members who scanned never receive a token; with no indexer nobody notices. Because stats count only CONFIRMED, they also silently vanish from the leaderboard.
**Prevention:**
- Sweeper job (BullMQ repeatable job or `setInterval`) that finds `PENDING` check-ins older than N minutes and re-enqueues using a deterministic `jobId = checkInId` (dedupes against existing jobs). Also set `jobId: checkInId` on the original `add`, which makes the enqueue idempotent.
- Keep `removeOnComplete`/`removeOnFail` with age/count limits so Redis memory does not grow on a small instance.
- Prefer Railway-native Redis (a regular TCP Redis) over request-metered providers; verify `noeviction`.
- Return 202 only after the enqueue succeeds, or catch enqueue failure and leave the row in a state the sweeper picks up.
**Detection:** Count of PENDING rows older than 5 minutes (expose on an admin/health endpoint and alert).
**Phase:** Reliability phase (sweeper), validated in the E2E proof phase by killing Redis mid-test.

### Pitfall 5: Nonce contention and gas-estimation behavior under burst check-ins
**What goes wrong:** `concurrency: 1` plus `waitForTransactionReceipt` avoids local nonce races, but each mint waits a full block (Base Sepolia ~2s, receipt polling adds latency). A room of 40 people at once = ~40 sequential confirmations (a couple of minutes of backlog), and any single failure (RPC blip, 120s receipt timeout on a dropped tx) stalls the queue. viem fetches nonce via `eth_getTransactionCount` per send; load-balanced RPC nodes can return a stale count right after a block, producing `nonce too low`. Also the admin signer sends txs (`createSession`/`closeSession`) from a different key, so that is OK; but if relay and admin signer are accidentally the same key, admin actions and the worker race on nonces.
**Why it happens:** Single hot wallet; synchronous per-tx confirmation; testnet fee spikes causing "underpriced" replacements.
**Consequences:** Members see "pending" for minutes (UX risk, not data loss, if idempotency holds). A timed-out receipt wait throws even though the tx may later land; the retry then relies on the `balanceOf` check (good) but can submit a second tx while the first is still in the mempool (second reverts at estimation if the first is already mined, or wastes gas/nonce).
**Prevention:**
- Make relay and admin signer separate keys with separate funding; document that they must differ.
- Make the frontend treat 202 as "queued" and poll check-in status with a clear PENDING/CONFIRMED/FAILED display, with realistic copy ("takes up to a minute").
- Do not mark a job failed on receipt timeout alone: on timeout, re-check `balanceOf` and look up the tx hash before re-sending. Consider storing `txHash` right after submission (before waiting) so retries can resume by hash.
- Load test with a realistic burst (20-40 jobs) against Sepolia before the club meeting; measure queue drain time. Only consider multi-relay-account or a batch `mintBatch` function if drain time is unacceptable (needs a contract change, so out of scope this round).
- Use a paid-tier-capable Alchemy key and watch CU limits; the app reads (`hasRole` on every admin request, `balanceOf` per job) plus writes add up. Consider short-TTL caching of `hasRole`.
**Detection:** `nonce too low`, `replacement transaction underpriced`, `already known`; queue depth growing; job duration > 10s.
**Phase:** E2E proof phase (burst test), reliability phase.

### Pitfall 6: Privy domain/origin allowlist and token configuration mismatches between Vercel and the Privy dashboard
**What goes wrong:** Privy rejects or silently fails login/embedded-wallet creation if the deployed origin is not in the app's allowed origins (dashboard > Configuration > App settings > Allowed origins; Vercel gives you production, preview `*.vercel.app` and custom domains). Preview deployments get a different hostname each time and are not allowlisted by default, so "works in production, broken in PR previews" (or the reverse). Using the production Privy app ID in dev and a different one in prod mixes users and wallets. (MEDIUM; Privy dashboard labels may have changed.)
**Why it happens:** `NEXT_PUBLIC_PRIVY_APP_ID` is baked at build time by Next.js. Changing the Vercel env var does nothing until redeploy. The backend `PRIVY_APP_ID`/`PRIVY_APP_SECRET` must belong to the same Privy app as the frontend's ID, or token verification fails with a 401 that the code collapses into a generic "Invalid auth token" (`auth.ts` catches all errors).
**Consequences:** Login popups fail; every API call 401s; the backend catch-all hides whether the cause is a bad secret, wrong app, expired token, or network failure to Privy.
**Prevention:**
- Single Privy app for the testnet launch; add production domain(s) and the stable Vercel alias to allowed origins; accept that previews need explicit allowlisting or are not used for login testing.
- Use Privy's identity-token flow consistently: the backend calls `getUser({ idToken })`, so the Privy dashboard must have "return user data in an identity token" enabled and the frontend must send the identity token (not the access token) as the bearer value. Sending the access token to this call fails with a generic 401. Verify which token `frontend/lib/api` attaches. (MEDIUM, confirm in Privy docs for the installed `@privy-io/server-auth` version.)
- Log the underlying error class/message (not the token) in the `auth.ts` catch to distinguish config errors from expired tokens.
- Verify the frontend redeploys after setting env vars; checklist item: open the deployed site, view source, confirm the app ID.
- Keep login methods restricted to email/google/passkey (per PROJECT.md) so the embedded wallet exists; leave external-wallet login off or `CheckInFlow.tsx` signing breaks. Also check embedded wallet creation setting ("create on login for users without wallets").
- Google OAuth and passkeys are tied to the origin / RP ID: passkeys registered on one domain do not work on another, so decide the final production domain before onboarding the club (changing it later orphans passkeys).
**Detection:** Console errors from Privy about origin; 401 spikes after login; user object without `wallet` -> 403 `NO_WALLET`.
**Phase:** Frontend/backend wiring phase; domain decision before onboarding.

### Pitfall 7: Prisma migration and Postgres startup problems on deploy
**What goes wrong:** `railway.toml` runs `npx prisma migrate deploy && node dist/index.js` at start. Problems: (a) `prisma` CLI must be available in the runtime image; if `prisma` is a devDependency and the build prunes dev deps, `npx` downloads the latest major (possibly incompatible with the schema) or fails; `buildCommand` is `npm ci && npm run build` which keeps devDeps in Nixpacks by default, but verify. (b) Migrations run on every start/restart, and with multiple replicas race each other (advisory-lock protects, but still adds slow starts). (c) The 30s healthcheck window includes the migration time. (d) `DATABASE_URL` pointing to a pooler (PgBouncer/Supavisor/Neon pooled endpoint) breaks `migrate deploy` (needs a direct connection / `directUrl`). (e) Using Railway's public proxy URL instead of the internal one adds latency and egress cost. (f) `prisma generate` happens in `npm run build`; if the runtime is a different layer the client may be missing (Nixpacks usually OK).
**Consequences:** Crash loop on first deploy; "migration failed" leaves a partially applied state; mismatch of Prisma version (CLI vs client).
**Prevention:**
- Pin the prisma version (same major for CLI and `@prisma/client`) and keep `prisma` in `dependencies`, or run migrations as a Railway pre-deploy command rather than in the start command.
- Do a dry run: provision Postgres, run `prisma migrate deploy` once manually (`railway run`), verify the four migrations apply (`init`, `add_founding_member`, `add_session_close_tx_hash`, `add_member_profile`) on an empty DB, then start.
- Do not use `db push` in production; do not seed production with the dev seed (`db:seed`) accidentally (it may create fabricated members; the recent commit "replace fabricated member data" suggests this was a prior problem).
- Use the direct (non-pooled) URL for migrations if a pooler is introduced. Set connection limit in the URL for small instances (`?connection_limit=5`).
- Back up: Railway free/hobby Postgres has limited backup guarantees; export `check_ins` periodically (CSV export exists) since on-chain data can be rebuilt but member/profile data cannot.
**Detection:** Deploy logs with `P3009`/`P1001`; healthcheck timeout; "prisma: command not found".
**Phase:** Backend hosting phase.

### Pitfall 8: ABI, address, and chain drift across the three layers
**What goes wrong:** ABI duplicated in `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts`; address in `addresses.json`, `frontend/lib/contracts/addresses.ts`, backend `CONTRACT_ADDRESS`, and frontend `NEXT_PUBLIC_CONTRACT_ADDRESS`; chain in `CHAIN_ID` and `NEXT_PUBLIC_CHAIN_ID`. A redeploy changes the address and any signature change changes the ABI. `CHAIN_ID` unset defaults to 84532 in the backend while the frontend might use mainnet or vice versa; `CHAIN_ID=8453` flips to Base mainnet silently with the Sepolia contract address.
**Consequences:** `createSession` or `mint` calls revert on a function-signature mismatch (or worse, succeed against an old contract), frontend reads token balances from a different contract than the backend writes to, so users see zero attendance despite confirmed mints. The `uri` / session-id encoding differences break display.
**Prevention:**
- Single script that regenerates both ABIs from `smart-contract/out/AttendanceRegistry.sol/AttendanceRegistry.json` and CI check that diffs them (fail CI on drift).
- Boot-time sanity check in the backend: `publicClient.getChainId()` equals `CHAIN_ID`, `getCode(CONTRACT_ADDRESS)` is non-empty, and a read like `name()`/`RELAY_ROLE()` succeeds. Expose chainId + contract address in `/health` so the frontend and operators can compare.
- Make `CHAIN_ID` required in the `required` env list (currently it silently defaults).
- Verify the contract on Basescan so the ABI can be compared with the source of truth.
**Detection:** Different addresses in `/health` vs frontend bundle; empty `getCode`; revert with unrecognized selector.
**Phase:** Wiring/E2E phase; add CI drift check in the same phase.

### Pitfall 9: Redeploying the non-upgradeable contract mid-launch
**What goes wrong:** If E2E reveals a contract-level problem (role holder unknown, wrong relay), the only fix is redeploying, which orphans existing session ids/tokens and requires updating Pitfall 8's four places, regrant of roles, new `setBaseCid`, and re-creating sessions in DB with on-chain ids.
**Prevention:** Decide early (in the roles-verification step) whether the current deployment is usable. If redeploy is needed, do it once, before any member data exists, and treat DB sessions as testnet-disposable. Script the post-deploy checklist (grant roles, setBaseCid, update env, verify).
**Phase:** Contract/roles verification (decide before onboarding).

## Moderate Pitfalls

### Pitfall 10: Faucet funding limits and relay balance alerting
**What goes wrong:** Base Sepolia faucets (Coinbase CDP, Alchemy, QuickNode, Superchain faucet etc.) cap claims per day per address (often 0.05-0.1 ETH or less, sometimes requiring a login or mainnet balance). The relay's startup check (`RELAY_MIN_BALANCE_ETH` default 0.005) only runs once at boot. A mint costs very little gas on Base Sepolia (typically well under 0.0001 ETH), so 0.005 ETH funds many dozens of mints, but a burst day plus `createSession` plus retries can add up, and a drained wallet means every job retries then fails to FAILED. (LOW-MEDIUM: faucet limits change often; check the current ones.)
**Prevention:** Fund relay (and admin signer, a separate key) well ahead of the first meeting from two faucets; make the balance check periodic (every N minutes, repeatable job) with an alert (error tracker/Discord webhook); surface balance in an admin-only health endpoint; make the mint job fail fast with a distinct, retry-later error when balance is below minimum rather than burn 3 attempts (re-queue with delay instead of FAILED).
**Phase:** Reliability phase.

### Pitfall 11: Terminal FAILED is permanent
**What goes wrong:** After 3 attempts, `reconcileFailedMint` sets FAILED and nothing retries. A temporary outage (RPC, unfunded relay, missing role discovered late) permanently loses members' mints unless an operator intervenes.
**Prevention:** Provide an admin-triggered or script-based "requeue FAILED/PENDING" operation; longer backoff (minutes) with more attempts for infrastructure errors; sweeper (Pitfall 4) includes FAILED rows younger than a threshold once the cause is fixed.
**Phase:** Reliability phase.

### Pitfall 12: CORS, helmet, and trust proxy configured wrong
**What goes wrong:** (a) `cors()` currently allows all origins (low risk with bearer auth but contradicts the plan). When restricting, a single exact-origin string breaks previews and `www` vs apex, and a trailing slash in the env var never matches. The `Authorization` header triggers preflight; make sure OPTIONS is handled (the `cors` package does this when mounted before routes, as it is). (b) Behind Railway's proxy, `req.ip` is the proxy's address unless `app.set('trust proxy', 1)`; `express-rate-limit` v7 also throws a validation error/warning (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`) when `X-Forwarded-For` is present without trust proxy. The current limiter keys on `privyUserId`, falling back to the literal `'anonymous'`: unauthenticated requests would all share one bucket if the limiter runs before auth. (c) `helmet` defaults (CORP `same-origin`) can break cross-origin image/asset responses such as the art endpoints (`/api/v1/art`) consumed by the Vercel frontend; set `crossOriginResourcePolicy: 'cross-origin'`.
**Prevention:** Read allowed origins from a comma-separated env var, normalize trailing slashes, test with a real browser from the deployed Vercel domain (not curl); set `trust proxy` to the number of hops (1 on Railway); verify art images render after helmet; confirm the limiter runs after `authMiddleware`.
**Detection:** Browser console CORS errors with 200s in server logs; image broken icons; rate limiter errors in logs.
**Phase:** Minimal-security step in wiring phase.

### Pitfall 13: Frontend env/API URL pitfalls on Vercel
**What goes wrong:** `NEXT_PUBLIC_API_URL` set with a trailing slash or `http://` (mixed content blocked on https), pointing at localhost, or lacking the `/api/v1` base the client expects. Env vars set only for "Production" scope but not "Preview". The Railway public domain must be generated and the service port must honor `PORT` (the code reads `process.env.PORT`, good).
**Prevention:** One checklist of all env vars per environment with exact formats; smoke test with the deployed frontend against the deployed backend; keep a `/health` call on app load in dev builds.
**Phase:** Wiring phase.

### Pitfall 14: QR clock and TTL issues in production
**What goes wrong:** QR TTL is 10 minutes by default and verified against server time; the admin displaying a QR on a projector tab that gets throttled/suspended, or a member's slow signature flow, cause "expired" errors. Clock skew between the signing server and verification is not an issue (same backend), but the system also relies on session date semantics (`BigInt(Math.floor(date/1000))`); sessions created with a local-time date string parsed as UTC create off-by-hours dates on chain.
**Prevention:** Admin UI auto-refreshes the QR before expiry; test with a real phone on cellular; verify timezone handling when creating sessions from the browser (send ISO strings with offset).
**Phase:** E2E proof phase.

### Pitfall 15: Testing Privy-based flows is hard, so tests get skipped or are meaningless
**What goes wrong:** Privy components need a real app ID, network access, and iframe-based embedded wallets, so Jest/Vitest tests render nothing useful, and E2E tests cannot log in with Google. Mocking everything makes tests green but unrelated to the real regressions (PRs #40/#41 were session wedging and hydration, which mocks will not reproduce).
**Prevention:**
- Unit/component level: mock `usePrivy`/`useWallets`/`useSignMessage`-style hooks at the module boundary (`vi.mock('@privy-io/react-auth')`) and test `CheckInFlow` logic (state machine, error handling, payload shape) and the admin gate (`app/admin/layout.tsx`: loading, unauthenticated, non-admin, retry cap). Use Vitest/Jest + React Testing Library with jsdom.
- Backend contract-style test: sign a payload using a viem local account and assert the backend verifies it (this covers the signature format that the frontend must match, the real source of breakage).
- Privy offers test accounts (email + fixed OTP) in the dashboard for automated/manual QA (MEDIUM; confirm in docs); use them for one manual smoke test checklist rather than brittle automated browser tests.
- Keep CI soft step fixed: change `npm test --if-present` to `npm test` for backend so deleting tests cannot pass silently, and add the frontend test step.
**Detection:** Tests that assert only that mocks were called.
**Phase:** Frontend tests phase.

### Pitfall 16: Replacing mock pages with "real data" expands scope and hits unindexed data
**What goes wrong:** Clubs/explore/rewards pages lack backing models (Member, Session, CheckIn, TokenEvent only). Building them invents schema/migrations and APIs during the launch window, and anything derived from chain events requires the indexer that is explicitly out of scope.
**Prevention:** Derive each page from `check_ins` and sessions only; for anything with no data source, show honest empty states (matching the earlier commit that replaced fabricated member data) rather than fake numbers. Sequence this after the E2E proof so launch is not blocked by it.
**Phase:** Late phase, after E2E and reliability.

## Minor Pitfalls

### Pitfall 17: Secrets handling on Railway/Vercel
**What goes wrong:** Private keys pasted with surrounding quotes, whitespace/newline, or missing `0x` prefix (viem `privateKeyToAccount` requires `0x`-prefixed 32-byte hex) crash at import time with a stack that may print the value. Putting a `NEXT_PUBLIC_` prefix on a secret exposes it. Using the same key for relay/admin/deployer. **Prevention:** Validate with a zod/regex check at boot that logs only derived addresses; never prefix secrets with `NEXT_PUBLIC_`; fresh testnet-only keys for each role; do not reuse any key that ever held mainnet funds.

### Pitfall 18: Alchemy key and RPC limits
**What goes wrong:** Restricting the Alchemy key by domain allowlist blocks the Railway server (server calls have no Origin); free-tier CU throttling returns 429 under bursts and the backend has no fallback transport. **Prevention:** Do not domain-restrict the backend key; use viem `fallback([...])` transport with a second public RPC (`https://sepolia.base.org`) for reads; separate keys for backend and frontend if the frontend reads chain directly.

### Pitfall 19: Contract not verified on Basescan / stale `BASESCAN_API_KEY`
**What goes wrong:** Unverified contract makes role/event debugging slow. Basescan API moved under Etherscan API v2 (single key, new endpoint); old `api-sepolia.basescan.org` v1 endpoint usage in `foundry.toml` may fail. (MEDIUM; check current Foundry docs.) **Prevention:** Verify once with current `forge verify-contract` syntax and chain id 84532.

### Pitfall 20: IPFS `setBaseCid` ordering
**What goes wrong:** `setBaseCid` needs DEFAULT_ADMIN key (not in prod runtime by recommendation) and a directory CID; changing it after tokens exist changes every token's metadata. **Prevention:** Run `setBaseCid` once via a local script with the admin key before onboarding; keep `DEFAULT_ADMIN_PRIVATE_KEY` out of Railway env afterwards.

### Pitfall 21: Express error/async and body issues
**What goes wrong:** `express-async-errors` must be imported before routers (it is). Health endpoint always "ok" even if DB/Redis broken (see Pitfall 1). Default JSON body limit is fine. **Prevention:** Deep health endpoint; error tracker (Sentry) wired as the last middleware.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Contract/roles verification | Relay or admin signer lacks role; default-admin key unknown (2, 9) | Pre-flight `hasRole` script for all three keys; decide redeploy-or-keep before anything else |
| Backend deploy (Railway) | Redis `{url}` ignored -> localhost (1); Prisma CLI/migrate-on-start/pooler (7); worker in-process, SIGTERM (3) | Parse URL or string-form ioredis; `ping` at boot; pin prisma; single replica; graceful shutdown; deep `/health` |
| Frontend/backend wiring | Privy origins, token type, app ID mismatch (6); API URL/env scope (13); CORS/helmet/trust proxy (12); drift (8) | Env checklist per environment; log real auth errors; test from deployed origin in a real browser; ABI drift CI check; `CHAIN_ID` required |
| E2E proof on Sepolia | Burst/nonce, slow confirmations (5); QR expiry/timezone (14); faucet funding (10) | Fund both keys early; burst test 20-40 check-ins; kill Redis mid-test to prove recovery |
| Reliability (sweeper, alerting) | Stuck PENDING (4); permanent FAILED (11); one-time balance check (10) | Sweeper with `jobId = checkInId`; periodic balance job + alert; admin requeue; Redis `noeviction` and job retention limits |
| Real-data pages | Scope creep and fake data (16) | Derive from `check_ins`/sessions only; honest empty states |
| Frontend tests | Privy untestable end to end (15) | Mock hooks at the boundary; backend signature-contract test; manual smoke via Privy test accounts; remove soft `--if-present` |
| Minimal security | Secrets formatting, key reuse (17); RPC restrictions (18) | Boot-time validation logging only addresses; separate testnet keys |

## Recommended pre-launch checklist (derived)
1. Fix Redis connection construction and add boot-time `ping` (Pitfall 1).
2. Run role pre-flight for relay, admin signer, default admin (Pitfall 2).
3. Provision Postgres + Redis on Railway, run migrations manually once (Pitfall 7).
4. Set env vars (backend and Vercel) from a single checklist; `CHAIN_ID` explicit; redeploy frontend after env changes (6, 8, 13).
5. Allowlist the production origin in Privy; verify identity-token flow (6).
6. Fund relay and admin signer; verify `/health` shows Redis, DB, chain, contract, relay balance (10).
7. One real phone check-in end to end; then a burst test; then kill Redis and confirm the sweeper recovers (4, 5).

## Sources

- Repository (HIGH): `backend/src/lib/queue.ts`, `backend/src/jobs/mint.job.ts`, `backend/src/index.ts`, `backend/src/app.ts`, `backend/src/middleware/auth.ts`, `backend/src/middleware/rateLimit.ts`, `backend/src/services/relay.service.ts`, `backend/railway.toml`, `smart-contract/script/Deploy.s.sol`, `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/INTEGRATIONS.md`
- Installed dependency source (HIGH): `backend/node_modules/ioredis/built/Redis.js` (URL parsed only for string argument), `backend/node_modules/bullmq/dist/cjs/classes/redis-connection.js` (defaults host 127.0.0.1:6379; sets `maxRetriesPerRequest = null` for blocking connections, i.e. Worker, automatically when passing an options object)
- Training knowledge, not re-verified this session (LOW-MEDIUM): Railway private networking/`family: 0`, BullMQ `noeviction` requirement, Privy dashboard allowed-origins and identity-token settings, faucet daily limits, Basescan to Etherscan API v2 migration, express-rate-limit trust-proxy validation. Validate these during the relevant phase.
