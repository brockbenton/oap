# Codebase Concerns

**Analysis Date:** 2026-10-27

## Tech Debt

**Unused `TokenEvent` model / no on-chain indexer:**
- Issue: `TokenEvent` is defined in `backend/prisma/schema.prisma` but never populated. No indexer service exists (docs reference `indexer.service.ts` / `lib/alchemy.ts`, which do not exist). `check_ins` is the de-facto source of attendance.
- Files: `backend/prisma/schema.prisma`, `backend/src/services/stats.service.ts`
- Impact: DB can drift from chain (e.g. tokens minted or burned outside the relay path are invisible). Stats count only `mintStatus === 'CONFIRMED'`.
- Fix approach: Build an event indexer (or reconciliation job comparing `balanceOf` to `check_ins`), or drop the model and stale doc references.

**Stale docs vs. code:**
- Issue: `AUDIT.md` (dated 2026-07-07) lists L1 (CSV injection) and L3 (`closeSession` overwriting `txHash`) as open, but both are fixed (`csvEscape` in `backend/src/routes/admin.ts` prefixes `'`; `closeTxHash` column exists in the schema). It also mentions shadcn/ui, which is not installed.
- Impact: Planners may re-do or mis-prioritize work.
- Fix approach: Refresh `AUDIT.md`; reconcile `MASTER_PLAN.md`, `frontend/DESIGN_BUILD_PLAN.md`, and the `CLAUDE.md` files with actual code.

**Large multi-purpose files:**
- Files: `backend/src/services/stats.service.ts` (512 lines), `backend/src/routes/admin.ts` (397), `frontend/components/features/member/MemberHome.tsx` (551), `frontend/components/features/check-in/CheckInFlow.tsx` (436), `frontend/app/settings/page.tsx` (427), `frontend/app/vault/page.tsx` (416)
- Impact: Hard to modify safely, especially stats aggregation.
- Fix approach: Split by concern (stats queries vs. formatting; admin routes by resource); extract hooks from page components.

**Unfinished plan items:**
- Education onboarding track and email notification system are still `[ ]` in `MASTER_PLAN.md` (lines ~227, ~236).

**Committed build artifact:**
- `frontend/tsconfig.tsbuildinfo` is present in the frontend directory. Confirm it is gitignored (`frontend/.gitignore`).

## Known Bugs

No confirmed open functional bugs found. Known design-level issue: see QR sharing under Security.

## Security Considerations

**QR code is shareable (no presence binding):**
- Risk: A forwarded QR is redeemable by a non-attendee within `QR_TTL_MS` (default 600000 ms = 10 min). The nonce is stored but not consumed or unique (shared by all attendees).
- Files: `backend/src/services/qr.service.ts`, `backend/src/routes/check-in.ts`
- Current mitigation: Signed envelope, TTL, per-user unique `(memberId, sessionId)` constraint, per-user rate limit (`backend/src/middleware/rateLimit.ts`).
- Recommendations: Shorter TTL, rotating QR codes, optional geofence/organizer confirmation.

**Open CORS, no security headers, default body limit:**
- Risk: `app.use(cors())` allows any origin; no `helmet`; `express.json()` uses defaults. Auth is by bearer token (no cookies), so CORS is low-risk, but there is no global rate limit (only `checkInLimiter`).
- Files: `backend/src/app.ts`
- Recommendations: Restrict CORS to the frontend origin(s), add `helmet`, add a global rate limiter on public endpoints (`/api/v1/members`, `/api/v1/art`), set `trust proxy` for Railway (`backend/railway.toml`).

**Hot keys held by the backend:**
- Risk: Relay key (RELAY_ROLE minter), QR-signing admin key (`adminAccount` in `backend/src/lib/contract.ts`), and optional `DEFAULT_ADMIN_PRIVATE_KEY` (grant/revoke roles, `setBaseCid`) in env. Compromise of the default-admin key lets an attacker grant admin and mint/alter metadata.
- Files: `backend/src/services/relay.service.ts`, `backend/src/lib/contract.ts`
- Recommendations: Keep `DEFAULT_ADMIN_PRIVATE_KEY` out of production runtime (use multisig for role ops); separate QR-signing key from on-chain admin key; monitor relay balance (`getRelayBalanceWei`).

**Admin authorization depends on RPC:**
- `adminMiddleware` checks on-chain `hasRole` and fails closed on RPC error (`backend/src/middleware/admin.ts`). Safe but admin API goes down if the RPC is down; no caching/fallback RPC.

**Public member endpoint exposes wallet addresses and attendance:**
- `GET /api/v1/members` is unauthenticated (PII stripped per AUDIT H1). Wallet-level attendance is public by design; confirm that is intended.
- Files: `backend/src/routes/members.ts`

## Performance Bottlenecks

**Stats aggregation computed per request:**
- Problem: `buildMemberStats` and overview aggregation in `backend/src/services/stats.service.ts` run live queries over `check_ins`/members on each request; the admin path also does Privy PII lookups.
- Cause: No caching; N lookups to Privy for linked accounts on admin member list.
- Improvement path: Cache results (short TTL), batch/cached Privy lookups, add DB indexes if tables grow.

**Synchronous receipt waits:**
- `waitForTransactionReceipt` with 120 s timeout inside admin role/`setBaseCid`/session handlers (`backend/src/services/relay.service.ts`, `backend/src/routes/sessions.ts`) can hold HTTP requests open.

## Fragile Areas

**Mint pipeline (DB <-> chain consistency):**
- Files: `backend/src/jobs/mint.job.ts`, `backend/src/services/relay.service.ts`, `backend/src/lib/queue.ts`
- Why fragile: Two-phase write (on-chain mint then DB update) with BullMQ retries (3 attempts, exponential backoff). Reconciliation relies on `balanceOf`. Single relay wallet means nonce contention under concurrent mints and one gas-balance failure stalls everything. Redis is a required runtime dependency.
- Safe modification: Keep `runMintJob`/`reconcileFailedMint` idempotency checks; extend `backend/test/mint.job.test.ts` for any change.
- Check-in route creates the DB row then enqueues; if `mintQueue.add` fails (Redis down) the check-in stays `PENDING` forever with no sweeper.

**IPFS metadata pipeline:**
- Files: `backend/src/services/ipfs.service.ts`, `backend/src/services/art.service.ts`
- Why fragile: Contract `uri(id)` depends on a single base CID set via `setBaseCid`; pins must be a whole directory. Changing/ordering breaks resolution of existing tokens.

**Privy session handling in frontend:**
- Files: `frontend/components/shared/SessionRecoveryGate.tsx`, `frontend/components/providers/AppProviders.tsx`, `frontend/app/admin/layout.tsx`
- Why fragile: Workarounds for wedged Privy sessions (clears `privy:*` localStorage), hydration remount fixes, and capped admin-gate retries are recent patches (PRs #40, #41). Login methods are restricted to `email/google/passkey` so every user has an embedded wallet; adding `wallet` breaks `CheckInFlow.tsx` signing.

**Soulbound contract constraints:**
- Files: `smart-contract/src/AttendanceRegistry.sol`
- Transfers/approvals disabled (`setApprovalForAll` pure revert, `_update` override). Not upgradeable: any logic fix requires redeploy and migration of `addresses.json` (`base-sepolia` only) plus backend ABI (`backend/src/lib/abi.ts`) and frontend ABI (`frontend/lib/contracts/abi.ts`), which must be kept manually in sync.

## Scaling Limits

**Single relay/minter wallet and single worker:**
- Throughput limited by sequential nonce management and Base block time; a whole room checking in simultaneously queues mints. Scaling path: multiple relay accounts or batched mint function.

## Dependencies at Risk

**Express 4 with `express-async-errors` shim:**
- Risk: Monkey-patching library; Express 5 handles async natively. Migration path: upgrade to Express 5 and remove the shim (`backend/src/app.ts`).

**Contract dependencies not vendored:**
- `smart-contract/lib/` is gitignored; CI clones OpenZeppelin v5.1.0 and forge-std v1.9.4 manually (`.github/workflows/ci.yml`). Local setups must replicate; version drift risk.

## Missing Critical Features

**Mainnet readiness:**
- Only Base Sepolia deployed (`addresses.json`). No external contract audit, no monitoring/alerting (only `backend/src/lib/logger.ts`), no error tracking.

## Test Coverage Gaps

**Frontend has no tests:**
- What's not tested: All of `frontend/` (no test runner configured; CI only runs typecheck + build in `.github/workflows/ci.yml`). Includes check-in signing flow (`CheckInFlow.tsx`), admin gate (`app/admin/layout.tsx`), session recovery.
- Risk: Regressions in auth/signing flows go unnoticed.
- Priority: High

**Backend route coverage is thin:**
- `backend/test/` has 6 files (~25 tests per AUDIT). Not directly covered: `routes/sessions.ts` close/create flows, `routes/admin.ts` role grant/revoke and CSV export, `services/relay.service.ts`, `services/qr.service.ts` expiry/tamper paths, `middleware/rateLimit.ts`.
- Priority: Medium

**CI test step is soft:**
- Backend uses `npm test --if-present`, so deleting the test script silently passes. Priority: Low

**Contract tests:**
- 45 Foundry tests in `smart-contract/test/AttendanceRegistry.t.sol`; no fuzz/invariant tests noted and no deploy script test for `script/Deploy.s.sol`. Priority: Low

---

*Concerns audit: 2026-10-27*
