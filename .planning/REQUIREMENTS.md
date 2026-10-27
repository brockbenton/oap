# Requirements: Onchain Attendance (OAP)

**Defined:** 2026-10-27
**Core Value:** A member who scans the meeting QR code reliably ends up with an attendance token on-chain, without paying gas.

## v1 Requirements

Requirements for going live on Base Sepolia for one club. Each one maps to a roadmap phase.

### Chain Readiness

- [ ] **CHAIN-01**: The holders of RELAY_ROLE, ADMIN_ROLE and DEFAULT_ADMIN_ROLE on the deployed contract are verified with `hasRole`. A keep-or-redeploy decision is made and recorded.
- [ ] **CHAIN-02**: The relay key and the admin-signer key are separate, testnet-only wallets. Each holds its required role and is funded with Base Sepolia ETH.
- [ ] **CHAIN-03**: The contract address and ABI match across `addresses.json`, backend env/`abi.ts` and `frontend/lib/contracts/*`. A check script or CI step enforces this.
- [ ] **CHAIN-04**: At boot the backend checks chain ID, contract code and the relay's role, and fails fast on a mismatch. `CHAIN_ID` is a required env var.

### Deployment

- [ ] **DEPLOY-01**: The backend connects to Redis using `REDIS_URL` (fix the ignored `{ url }` connection option), pings Redis at boot, and shares one connection module.
- [ ] **DEPLOY-02**: The backend runs in production on Railway as a single replica, with managed Postgres (migrations applied with `prisma migrate deploy`) and Redis (`noeviction`, persistent).
- [ ] **DEPLOY-03**: `/health` checks the DB, Redis and RPC connectivity rather than only that the process is up.
- [ ] **DEPLOY-04**: The Vercel frontend points at the production backend (`NEXT_PUBLIC_API_URL`). The Privy allowed origins include the production domain, and the Privy app ID and secret match between frontend and backend.
- [ ] **DEPLOY-05**: Node 22 is pinned across CI, `engines`/`.nvmrc`, Railway and Vercel.
- [ ] **DEPLOY-06**: A local rehearsal (Docker Postgres and Redis against the real Sepolia contract) completes a full check-in-to-mint run before the production deploy.

### Mint Proof

- [ ] **MINT-01**: An admin creates a session from the production UI, and it reaches `onchainStatus` CONFIRMED with the transaction visible on Basescan.
- [ ] **MINT-02**: A new member using email or a passkey scans the QR code on a phone and gets a token. The DB row reaches CONFIRMED with a `txHash`, and `balanceOf(member, sessionId) == 1` on-chain.
- [ ] **MINT-03**: Negative paths behave correctly. A duplicate check-in returns 409, and an expired QR returns 400.
- [ ] **MINT-04**: A burst test of 20 or more check-ins all reach CONFIRMED, with no nonce errors. The drain time is recorded.

### Reliability

- [ ] **REL-01**: The check-in route still returns 202 when the enqueue fails (Redis outage), and enqueues use `jobId = checkInId` for dedupe.
- [ ] **REL-02**: A scheduled sweeper re-enqueues check-ins stuck in PENDING and retries FAILED mints up to a capped number of attempts.
- [ ] **REL-03**: The relay and admin-signer balances are monitored on a schedule, and an alert fires when a balance falls below the threshold.
- [ ] **REL-04**: Errors from the backend (including mint-worker failures) and the frontend are reported to Sentry, with PII and auth headers scrubbed.
- [ ] **REL-05**: The backend shuts down gracefully on SIGTERM. If a mint receipt times out, the worker re-checks on-chain state before resubmitting.
- [ ] **REL-06**: An external uptime monitor pings `/health` and alerts when it fails.

### Security

- [ ] **SEC-01**: CORS is restricted to the frontend origin(s).
- [ ] **SEC-02**: The helmet security headers are enabled, and art images still load cross-origin.
- [ ] **SEC-03**: `trust proxy` is configured correctly, so rate limiting keys on real client IPs behind Railway.

### Member Experience

- [ ] **MEM-01**: After a check-in, the member sees whether their mint is pending, confirmed (with a BaseScan link) or failed. Status updates by polling.
- [ ] **MEM-02**: A member whose mint failed sees an honest failure state and a retry path.
- [ ] **MEM-03**: Anyone can view a live meeting view of the open session showing check-ins, updated by polling.

### Real-Data Pages

- [ ] **DATA-01**: The Clubs page is a single club page showing real member, session and token counts.
- [ ] **DATA-02**: The Explore page shows a public recent-mints feed from real check-ins. Members are identified only by username or a truncated address.
- [ ] **DATA-03**: The Rewards page shows derived achievements: Founding Member, Early Bird (first check-in at a session) and Semester MVP (most attendance in a semester). They are computed from attendance, and nothing can be claimed.
- [ ] **DATA-04**: The Rewards page and all other UI drop the level/XP mechanics. The existing tiers stay.
- [ ] **DATA-05**: All real-data pages have honest empty, loading and error states, and never fall back to mock data.
- [ ] **DATA-06**: The `frontend/lib/mock/*` files are deleted, and a CI check fails if mock imports come back.

### Testing

- [ ] **TEST-01**: The frontend has a test runner (Vitest + Testing Library + msw) and runs in CI as a hard failure.
- [ ] **TEST-02**: `CheckInFlow` tests mock Privy and assert that the exact signed-message format and the POST payload match what the backend expects.
- [ ] **TEST-03**: Admin gate tests cover the loading, non-admin (403) and admin states, including the capped retries.
- [ ] **TEST-04**: A backend test verifies that a signature from a viem local account passes check-in verification (the signed-message contract).
- [ ] **TEST-05**: The backend CI test step fails hard (no `--if-present`).

## v2 Requirements

Deferred to a later release. They are tracked here but are not in the current roadmap.

### Real-Data Pages

- **DATA-V2-01**: Explore club stats tiles (members, sessions, tokens)
- **DATA-V2-02**: Explore top collectors
- **DATA-V2-03**: Explore popular sessions
- **DATA-V2-04**: Streak (5 in a row) and Perfect Semester achievements

### Member Experience

- **MEM-V2-01**: "My attendance" history page
- **MEM-V2-02**: Streak display on member home

### Security / Mainnet

- **SEC-V2-01**: Separate the QR-signing key from the on-chain admin key, and use a multisig for role operations
- **SEC-V2-02**: Bind the QR to presence (rotating QR codes or a geofence) so forwarded QRs can't be redeemed
- **SEC-V2-03**: Global rate limiting on public endpoints
- **SEC-V2-04**: Base Mainnet deployment and an external contract audit

## Out of Scope

| Feature | Reason |
|---------|--------|
| Levels / XP | Owner dropped them for v1. The existing tiers cover progression |
| Multi-club directory and joining | One club at launch, with no `Club` model |
| Claimable reward tokens | Would need a new contract. Achievements are display-only |
| Community Pin and Speaker Spotlight achievements | No data source (multiple clubs, host concept) |
| On-chain event indexer (`TokenEvent`) | `check_ins` stays the source of truth, and the sweeper covers reconciliation |
| Websockets | Polling is enough for one club |
| Rank delta on leaderboard | Needs snapshots, so the value is low for one club |
| Splitting the worker into a separate service | Adds deploy surface and would need nonce locking. One replica is fine |
| Express 5 migration, large-file refactors | Tech debt that does not block go-live |
| Education onboarding, email notifications | Not needed to go live |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 0
- Unmapped: 37 ⚠️

---
*Requirements defined: 2026-10-27*
*Last updated: 2026-10-27 after initial definition*
