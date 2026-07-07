# AUDIT.md — Phase 1 & 2 Regression Audit

Scope: re-verify Phase 1 & Phase 2 items already marked `[x]` in `MASTER_PLAN.md` before building Phase 3.
Method: full build/test of all three layers + manual trace of the QR check-in flow and the members/stats
endpoints against seeded data, plus an adversarial multi-agent review (4 reviewers → per-finding
verification). Per the goal: **HIGH and MEDIUM fixed; LOW logged only.**

Date: 2026-07-07

---

## Baseline verification (all green before Phase 3 work)

```
smart-contract $ forge test
Compiler run successful!
Ran 45 tests for test/AttendanceRegistry.t.sol:AttendanceRegistryTest
...
Suite result: ok. 45 passed; 0 failed; 0 skipped
Ran 1 test suite: 45 tests passed, 0 failed, 0 skipped (45 total tests)   [exit 0]

backend $ npm run build            # prisma generate && tsc   -> exit 0
backend $ npm run typecheck        # tsc --noEmit             -> exit 0
frontend $ npm run build           # next build (9 routes)    -> exit 0
frontend $ npm run typecheck       # tsc --noEmit             -> exit 0
```

Check-in flow traced end-to-end (contract → relay → mint.job → check-in route → frontend `CheckInFlow`):
signed message is consistent between frontend (`I am checking into session {id} as {lowercased addr} at {signedAt}`)
and the backend reconstruction — no casing/format mismatch. `/admin/members` and the public members endpoint were
exercised against a seeded Postgres DB (6 members, 16 sessions across 2 semesters, 49 check-ins).

---

## Findings

Severity is the **post-verification** severity (an adversarial pass re-graded several claims down).

### HIGH — fixed

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| H1 | Unauthenticated `GET /api/v1/members` returned every member's `linkedAccount` (email / Discord handle) plus internal member `id` — a wallet→identity deanonymization leak. | `backend/src/routes/members.ts:10`, `backend/src/services/stats.service.ts` | Public route now strips `linkedAccount` **and** `id`; `buildMemberStats(false)` skips the Privy PII lookup entirely on the public path. PII is served only by the auth-gated `/admin/members`. |

### MEDIUM — fixed

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| M1 | `tokensEarned` (and the attendance % / status tier derived from it) counted check-ins whose mint was `PENDING`/`FAILED`, so the reported token count could exceed a member's actual on-chain holdings. | `backend/src/services/stats.service.ts:69` | Stats now count only `mintStatus === 'CONFIRMED'` (member table + personal stats). The vault still lists all check-ins with a status badge. |
| M2 | Mint worker was not idempotent: a DB write failure after a successful on-chain mint led BullMQ to retry, hit the contract's `AlreadyCheckedIn` guard, and falsely mark the check-in `FAILED` (permanent DB/chain desync). | `backend/src/jobs/mint.job.ts:16` | Worker skips minting if the check-in is already `CONFIRMED` with a `txHash`; the `failed` handler uses `updateMany` guarded by `mintStatus != 'CONFIRMED'` so a real success is never overwritten. |
| M3 | Async route handler rejections were not forwarded to the error middleware (Express 4 behavior), so a transient DB error on `/api/v1/members` and admin endpoints crashed/hung the request instead of returning a clean 500. | `backend/src/routes/*.ts`, `backend/src/index.ts:50` | Added the `express-async-errors` shim at the top of `index.ts` (see new-dependency note below). |
| M4 | Admin roles page fetched a Privy **access** token but the backend verifies an **identity** token (`getUser({ idToken })`), so list/grant/revoke always 401'd — the whole role dashboard was non-functional. | `frontend/app/admin/roles/page.tsx:33` | Switched to `getIdentityToken()` (matching every other authenticated caller), with an explicit null-token guard. |
| M5 | Check-in broke for external-wallet logins: `wallet` was an enabled Privy login method but such users have no embedded wallet, so `useSignMessage` threw and check-in failed. | `frontend/components/providers/AppProviders.tsx:45`, `frontend/components/features/check-in/CheckInFlow.tsx:32` | Set `loginMethods: ['email','google','passkey']` per the resolved auth-methods decision in `MASTER_PLAN.md`. All remaining methods provision an embedded wallet, so signing always works. |

### LOW — logged only (not fixed, per goal)

| # | Finding | Location | Notes |
|---|---------|----------|-------|
| L1 | CSV formula injection: `csvEscape` does not neutralize leading `= + - @` in exported cells sourced from `linkedAccount`. | `backend/src/routes/admin.ts:340` | Admin-only export; realistic payloads are constrained by email/Discord-username validation. Fix = prefix formula triggers with `'`. |
| L2 | QR has no presence binding and the nonce is not consumed, so a forwarded QR is redeemable by a non-attendee within the TTL. | `backend/src/routes/check-in.ts:103` | Documented design tradeoff of a single shared projected QR; hardening = rotating per-scan codes / shorter TTL. |
| L3 | `closeSession` overwrites the session's creation `txHash` with the close tx in the single `txHash` column. | `backend/src/routes/sessions.ts:124` | Informational only; the on-chain `SessionCreated` event remains the source of truth. Fix = add a `closeTxHash` column. |
| L4 | Admin roles page lacks the `ready/authenticated` gating, 403 branch, and `force-dynamic` that its sibling admin pages have. | `frontend/app/admin/roles/page.tsx:30` | **Now fixed** — the new `app/admin/layout.tsx` gates every `/admin` route (auth + on-chain ADMIN_ROLE via `GET /admin/me`) with a shared sign-in / Access Denied UI, and the page declares `force-dynamic`. |

### Informational (investigated; not defects / out of Phase 3 scope)

- **No on-chain event indexer; `TokenEvent` table is never populated.** `indexer.service.ts` / `lib/alchemy.ts` referenced in docs do not exist. Adversarially verified as **not a bug**: `check_ins` (written at check-in, confirmed by the mint worker) is the effective recorded-attendance source. **Phase 3 aggregate queries read from `check_ins` accordingly** — noted in `stats.service.ts`.
- **`/admin` overview page + endpoint are not built.** These are **unchecked `[ ]`** Phase 2 items (added in PR #8), not a regression, and out of Phase 3 scope — left untouched.
- **shadcn/ui is referenced in docs but not installed.** The frontend uses plain Tailwind; Phase 3 pages match the existing plain-Tailwind style (no new UI library, per constraints).
- **CORS wildcard** (`index.ts:32`) — verified not a bug (no-credentials mode).
- **No pre-built Phase 3 / Phase 4 code was found.** Nothing was removed.

---

## New dependency added during fixes

- `express-async-errors@^3.1.1` (backend) — one-line shim that forwards async route-handler rejections to the
  Express error middleware. Chosen over hand-wrapping ~15 handlers to fix M3 comprehensively and future-proof it.

## Contract

`AttendanceRegistry.sol` was **not modified** — no HIGH-severity contract bug was found (45/45 tests pass; access
control, soulbound enforcement, reentrancy guard, and the `date==0` sentinel all verified).

---

## Post-review hardening (Codex + adversarial multi-agent review of the admin/Phase-3 work)

A Codex agentic review plus a second adversarial workflow reviewed the admin dashboard, overview aggregation,
page refactor, and tests. All confirmed findings were applied:

- **HIGH — admin gate trusted only the DB.** `adminMiddleware` now authorizes off the on-chain `hasRole(ADMIN_ROLE)`
  (contract = source of truth, fail-closed on RPC error); the `admin_roles` table is audit/listing only.
  `backend/src/middleware/admin.ts`, `backend/src/services/onchain.service.ts`, `backend/src/lib/roles.ts`.
- **HIGH — mint worker not truly idempotent.** Extracted `runMintJob`/`reconcileFailedMint`; both check on-chain
  `balanceOf` so a DB-write failure after a successful mint reconciles to CONFIRMED instead of re-minting (revert) or
  falsely marking FAILED. `backend/src/jobs/mint.job.ts`.
- **HIGH — IPFS pins didn't match `uri(id)`.** The pipeline now pins the whole metadata **directory** and returns one
  base CID so `ipfs://{baseCid}/{id}.json` resolves. `backend/src/services/ipfs.service.ts`.
- **MEDIUM — overview attendance rate could exceed 100%.** Eligible denominator is now `max(headcount, joinedByDate)`.
  `backend/src/services/stats.service.ts`.
- **MEDIUM — admin gate could hang / leak the shell.** `adminMe` query now uses a capped retry, is keyed by Privy
  user id, is non-cacheable (`staleTime/gcTime: 0`), and the cache is cleared on logout — so a non-admin can't inherit
  a prior admin's cached verdict on a shared browser, and errors reach the Access-Denied UI. Uncapped retries on the
  sessions/members queries were capped via a shared `retryUnlessForbidden`. `frontend/app/admin/layout.tsx`,
  `frontend/lib/api/client.ts`.
- **LOW** — wall-clock-dependent stats test now injects a fixed `now`; frontend attendance-color thresholds hoisted to
  `frontend/lib/constants.ts`; queue made lazy so importing the app opens no Redis socket; added negative admin tests
  (403 non-admin, 401 invalid token), mint-reconcile tests, and an IPFS publish-path test. Backend suite: **25 tests**.
