# Roadmap: Onchain Attendance (OAP)

## Overview

The code is mostly built but has never run end to end. This roadmap is a productionisation job: first make the chain and backend wiring correct and rehearse a full mint locally (Phase 1), then deploy and prove a real gasless mint live on Base Sepolia (Phase 2, the hard gate). Only after that do we harden reliability (Phase 3), improve what members see (Phase 4), replace mock pages with real data (Phase 5) and lock in the signing and admin flows with tests (Phase 6).

## Phases

- [ ] **Phase 1: Chain Readiness & Local Mint Rehearsal** - Verified roles, separate funded keys, consistent address/ABI, fixed Redis connection, and a full local check-in-to-mint run
- [ ] **Phase 2: Production Deploy & Live Mint Proof** - Backend on Railway wired to Vercel, minimal security, and real phone check-ins producing on-chain tokens (hard gate)
- [ ] **Phase 3: Reliability** - Stuck-mint recovery, balance monitoring, error tracking, graceful shutdown and uptime alerts
- [ ] **Phase 4: Member Experience & Live Meeting** - Members see honest mint status with retry; anyone can watch a live meeting view
- [ ] **Phase 5: Real-Data Pages** - Clubs, Explore and Rewards pages backed by real data, mock files deleted
- [ ] **Phase 6: Testing & CI Hardening** - Frontend test runner, signing-flow and admin-gate tests, backend signature contract test, hard-failing CI

## Phase Details

### Phase 1: Chain Readiness & Local Mint Rehearsal
**Goal**: The deployed contract, keys and backend wiring are verified correct, and a full check-in-to-mint run succeeds locally against the real Sepolia contract
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, DEPLOY-01, DEPLOY-05, DEPLOY-06
**Success Criteria** (what must be TRUE):
  1. The owner can see the actual holders of RELAY_ROLE, ADMIN_ROLE and DEFAULT_ADMIN_ROLE on the deployed contract, and a keep-or-redeploy decision is recorded
  2. The relay and admin-signer are separate testnet-only wallets, each holding its required role and funded with Base Sepolia ETH
  3. A check script fails when the contract address or ABI differs between `addresses.json`, backend and frontend
  4. The backend refuses to boot on a wrong chain ID, missing contract code or a relay without its role, and pings Redis at startup using `REDIS_URL`
  5. With Docker Postgres and Redis locally, a check-in produces a CONFIRMED row and a token on the real Sepolia contract, on Node 22
**Plans**: TBD

### Phase 2: Production Deploy & Live Mint Proof
**Goal**: The backend runs in production and a real member gets a gasless on-chain attendance token from a phone scan
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DEPLOY-02, DEPLOY-03, DEPLOY-04, SEC-01, SEC-02, SEC-03, MINT-01, MINT-02, MINT-03, MINT-04
**Success Criteria** (what must be TRUE):
  1. `/health` on the Railway backend reports DB, Redis and RPC status, and the Vercel frontend talks to it with Privy login working on the production domain
  2. An admin creates a session in the production UI and it reaches CONFIRMED with a transaction visible on Basescan
  3. A new member signing in with email or a passkey scans the QR on a phone, and `balanceOf(member, sessionId)` is 1 with the DB row CONFIRMED and a `txHash`
  4. A duplicate check-in returns 409 and an expired QR returns 400
  5. A burst of 20 or more check-ins all reach CONFIRMED with no nonce errors, and the drain time is recorded
  6. Browsers on other origins are rejected by CORS, security headers are present, and art images still load
**Plans**: TBD

### Phase 3: Reliability
**Goal**: Check-ins eventually become tokens even through outages, and the owner is alerted before anything breaks silently
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06
**Success Criteria** (what must be TRUE):
  1. With Redis down, a check-in still returns 202, and after Redis returns the sweeper mints it
  2. Check-ins stuck in PENDING are re-enqueued, and FAILED mints are retried up to a capped number of attempts, without duplicate mints
  3. An alert fires when the relay or admin-signer balance falls below the threshold
  4. Backend, mint-worker and frontend errors appear in Sentry with PII and auth headers scrubbed
  5. Restarting the service mid-mint does not lose or double-mint a token, and an external uptime monitor alerts when `/health` fails
**Plans**: TBD

### Phase 4: Member Experience & Live Meeting
**Goal**: Members always know what happened to their check-in, and anyone can watch a meeting fill up live
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MEM-01, MEM-02, MEM-03
**Success Criteria** (what must be TRUE):
  1. After checking in, a member sees pending, then confirmed with a BaseScan link, updating without a manual refresh
  2. A member whose mint failed sees an honest failure message and can retry
  3. Anyone can open a live meeting view of the open session and watch check-ins appear via polling
**Plans**: TBD
**UI hint**: yes

### Phase 5: Real-Data Pages
**Goal**: The Clubs, Explore and Rewards pages show only what is true, from real data
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. The Clubs page shows the club's real member, session and token counts
  2. The Explore page shows a recent-mints feed from real check-ins, identifying members only by username or truncated address
  3. The Rewards page shows Founding Member, Early Bird and Semester MVP derived from attendance, with nothing claimable and no level/XP anywhere in the UI
  4. Every real-data page shows honest empty, loading and error states and never falls back to mock data
  5. `frontend/lib/mock/*` is gone and CI fails if mock imports return
**Plans**: TBD
**UI hint**: yes

### Phase 6: Testing & CI Hardening
**Goal**: The auth/signing and admin flows that have regressed before are covered by tests that block merges
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Frontend tests (Vitest + Testing Library + msw) run in CI, and a failing test fails the build
  2. A `CheckInFlow` test fails if the signed-message format or POST payload diverges from what the backend expects
  3. Admin gate tests cover the loading, non-admin (403) and admin states, including capped retries
  4. A backend test confirms a signature from a viem local account passes check-in verification
  5. The backend CI test step fails hard with no `--if-present`
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Chain Readiness & Local Mint Rehearsal | 0/0 | Not started | - |
| 2. Production Deploy & Live Mint Proof | 0/0 | Not started | - |
| 3. Reliability | 0/0 | Not started | - |
| 4. Member Experience & Live Meeting | 0/0 | Not started | - |
| 5. Real-Data Pages | 0/0 | Not started | - |
| 6. Testing & CI Hardening | 0/0 | Not started | - |
