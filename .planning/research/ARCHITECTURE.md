# Architecture Patterns: Going Live with Gasless Relayed Minting

**Domain:** relayed-mint attendance dApp, subsequent milestone (productionise the existing code)
**Researched:** 2026-10-27
**Confidence:** HIGH on integration points, which come from reading the code. MEDIUM on hosting specifics (Railway Redis/Postgres plugins, Sentry), which were not checked against current docs.

## Recommended Architecture

The three-tier layout stays as it is. The only additions are a small in-process scheduler (the sweeper and balance monitor), error tracking, and public read endpoints.

```
Vercel (Next.js) --HTTPS, Bearer Privy token--> Railway service "api"
                                                 |  Express (routes -> services -> lib)
                                                 |  in-process BullMQ Worker (concurrency 1)
                                                 |  NEW: sweeper (BullMQ repeatable job or setInterval)
                                                 |  NEW: relay/admin-signer balance monitor
                                                 |  NEW: Sentry init at the top of index.ts
                  Railway Postgres <-- Prisma ---+
                  Railway Redis    <-- BullMQ ---+
                  Alchemy RPC (Base Sepolia) <-- viem (relay, admin signer, default admin)
                  AttendanceRegistry 0x7bEf...6192
```

The worker stays in-process for this launch. The deploy constraint is that the API service must run **exactly one replica**. Two replicas would mean two workers using the relay key, and they would race on nonces.

### Component Boundaries

| Component | Responsibility | Talks to |
|---|---|---|
| Frontend (Vercel) | UI, Privy auth, signs the check-in message | Backend REST only (`NEXT_PUBLIC_API_URL`) |
| Express API | Validates the request, writes `CheckIn` as PENDING, enqueues the mint | Postgres, Redis (enqueue), chain reads (admin `hasRole`) |
| Mint worker (`mint.job.ts`) | Mints idempotently, then updates the DB | Redis, `relay.service`, `onchain.service`, Postgres |
| Sweeper (new, `jobs/sweeper.job.ts`) | Re-enqueues stale PENDING rows and retries FAILED rows up to a cap | Postgres, `mintQueue` |
| Balance monitor (new) | Checks relay and admin-signer balances periodically and alerts when low | `relay.service`, Sentry or webhook |
| Public read endpoints (new) | Real data for the clubs, explore and rewards pages | Postgres via services; `frontend/lib/api/*` |
| Contract | Source of truth for tokens; RELAY_ROLE gates minting | Called by relay, admin signer, default admin |

### Data Flow

- **Check-in:** the browser calls `POST /check-in`. The backend writes `CheckIn(PENDING)`, calls `mintQueue.add` and returns 202. The worker calls `mint`, waits for the receipt, then sets the row to `CONFIRMED` and stores `txHash`. The frontend polls the status.
- **Sweeper:** every N minutes it finds rows with `mintStatus=PENDING AND checkedInAt < now - 2 min` and calls `mintQueue.add('mint', data, { jobId: checkInId })`. It gets the wallet by joining `member.walletAddress` (passed through `getAddress` for chain calls) and the session from `session.sessionIdOnchain`.

## Findings from the Code That Shape the Build

1. **Role wiring is the biggest go-live risk.**
   - `Deploy.s.sol` grants `DEFAULT_ADMIN_ROLE` and `ADMIN_ROLE` to the deployer, and `RELAY_ROLE` to `RELAY_WALLET`. It is unknown which wallet `RELAY_WALLET` was.
   - The backend uses three keys:
     - `RELAY_PRIVATE_KEY` mints and needs `RELAY_ROLE`.
     - `ADMIN_SIGNER_PRIVATE_KEY` signs QR codes and also sends `createSession`/`closeSession`, so it needs `ADMIN_ROLE` and gas.
     - `DEFAULT_ADMIN_PRIVATE_KEY` is optional and handles grant/revoke and `setBaseCid`.
   - Check each key with `cast call <addr> "hasRole(bytes32,address)(bool)"`, and fix any gaps with `grantRole` from the deployer. A redeploy is only needed if the deployer key is lost.
2. **Enqueue failure window.** `check-in.ts` creates the row and then awaits `mintQueue.add` with no try/catch. If Redis is down, the request returns 500 but the row stays PENDING. When the user retries, they get 409. Fix: wrap the enqueue in try/catch, return 202 anyway, and let the sweeper recover the row.
3. **No job dedupe.** The enqueue call sets no `jobId`. Use `jobId: checkInId` in both the route and the sweeper.
4. **FAILED is a dead end.** `reconcileFailedMint` marks a row FAILED and nothing ever retries it. The usual causes are an unfunded relay or a missing role, both fixable after the fact. The sweeper should retry FAILED rows up to a cap and alert.
5. **Alert hook.** `logRelayBalance` runs only at startup. Reuse `isBalanceLow` and `RELAY_MIN_BALANCE_ETH` on an interval of about 5 minutes. Send `Sentry.captureException` from `worker.on('failed')`.
6. **Startup readiness.**
   - Confirm that `/health` exists, because `railway.toml` uses it.
   - Add `FRONTEND_URL` (for CORS) to the required env list.
   - `app.ts` uses `cors()` with no options, no helmet and no `trust proxy`. Fix all three.
7. **Config drift.** The contract address appears in `addresses.json`, the `CONTRACT_ADDRESS` env var and `frontend/lib/contracts/addresses.ts`. The ABI appears in `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts`. Add a consistency check script or CI step that compares them against `forge inspect AttendanceRegistry abi`.

## Suggested Build Order

1. **Chain readiness** (no code; blocks everything): identify the relay and admin-signer addresses, verify their roles with `hasRole`, fund both, and run the address/ABI consistency check.
2. **Backend deploy skeleton:** add Postgres and Redis on Railway, set the env (including `FRONTEND_URL`), deploy a single replica, then run `prisma migrate deploy` and check `/health`. Make the minimal security changes. Point Vercel's `NEXT_PUBLIC_API_URL` at the backend and add the Vercel domain to Privy's allowed origins.
3. **End-to-end mint proof (the core-value gate).** Don't start anything else until this passes.
4. **Reliability:**
   - (a) enqueue try/catch plus `jobId`
   - (b) sweeper
   - (c) balance monitor
   - (d) Sentry, which can move earlier for visibility during the E2E run
5. **Real-data endpoints and pages:** these don't depend on the mint pipeline, so they can run in parallel with step 4. Build the backend endpoints first, then the `frontend/lib/api/*` fetchers, then delete the `frontend/lib/mock/*` imports.
6. **Frontend tests:** Vitest plus Testing Library, mocking `usePrivy` and wallet signing.
   - Cover `CheckInFlow`. The signed message format `I am checking into session {id} as {wallet} at {signedAt}` is the contract between frontend and backend.
   - Cover the admin gate: a 403 shows the error UI, and retries are capped.
   - Make the CI test step a hard failure.

## Verification Path: Proving Minting Works

1. **Static checks:**
   - `hasRole(RELAY_ROLE, relay)` and `hasRole(ADMIN_ROLE, adminSigner)` both return true.
   - `cast balance` shows both wallets funded.
   - The address/ABI consistency check passes.
2. **Backend boot:** the logs show `Backend listening`, `Mint worker started`, and a relay balance at info level. `/health` returns 200.
3. **Session creation:** an admin creates a session from the UI. Its `onchainStatus` goes from PENDING to CONFIRMED, and the transaction appears on Basescan.
4. **Real check-in:** a fresh email/passkey user scans the QR on the Vercel site. The request returns 202, and the row goes from PENDING to CONFIRMED with a `txHash`.
5. **On-chain proof (independent of the DB):** `cast call <addr> "balanceOf(address,uint256)(uint256)" <wallet> <sessionId>` returns 1, and Basescan shows the mint came from the relay address.
6. **Negative and failure paths:**
   - A duplicate check-in returns 409.
   - An expired QR returns 400 INVALID_QR.
   - With the worker stopped, the row stays PENDING, and the sweeper recovers it once the worker is back.
   - A drained relay triggers the alert.
7. **Local rehearsal first** (Docker Postgres and Redis plus the real Sepolia contract). This catches env and migration mistakes cheaply.

## Anti-Patterns to Avoid

- **Splitting the worker into a second service now.** It adds a deploy target and needs locking. Defer it.
- **A sweeper without `jobId` dedupe.** Duplicate jobs waste gas and race on the balance checks.
- **A sweeper that trusts only the DB.** Let the worker's `balanceOf` reconciliation make the decision.
- **Redeploying the contract to fix roles.** Role grants are cheap transactions; a redeploy forces address and ABI changes in five places.
- **Calling the real-data pages done while mock fallbacks remain.** Delete the mock imports and add a grep check in CI.

## Scalability

| Concern | Club (~50 users) | A few hundred | Beyond |
|---|---|---|---|
| Mint throughput | Concurrency 1 is fine | A room-wide scan queues for a few minutes | Multiple relay accounts or batch minting (needs a contract change) |
| Replicas | Exactly 1 | Exactly 1 | Needs distributed nonce management |
| Stats queries | Live | Short TTL cache | Indexer |

## Phase-Structure Implications

- **Phase A:** chain readiness, backend deploy and the E2E proof, as one gated phase.
- **Phase B:** reliability. Uses standard patterns. A BullMQ repeatable job with a fixed `jobId` is recommended over `setInterval`.
- **Phase C:** real-data pages. Needs product decisions for the single-club scope and may need Prisma models and a migration.
- **Phase D:** frontend tests. Mocking Privy is the fiddly part.
- **Open questions:**
  - Who owns the `RELAY_WALLET` used at deploy?
  - Does Railway's Redis persist data across restarts?
  - Is the Vercel deployment current?

## Sources

- Code: `backend/src/{index.ts,app.ts,routes/check-in.ts,jobs/mint.job.ts,services/relay.service.ts,lib/contract.ts,lib/queue.ts}`, `backend/railway.toml`, `backend/prisma/schema.prisma`, `smart-contract/script/Deploy.s.sol`, `smart-contract/src/AttendanceRegistry.sol`, `addresses.json`
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`
