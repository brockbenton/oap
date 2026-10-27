# Phase 1: Chain Readiness & Local Mint Rehearsal - Context

**Gathered:** 2026-10-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify who holds roles on the deployed `AttendanceRegistry`, decide keep-or-redeploy, set up separate funded relay and admin-signer wallets, enforce address/ABI consistency across layers, make the backend fail fast on misconfiguration (chain ID, contract code, relay role, Redis ping via `REDIS_URL`), pin Node 22, and run one full check-in → mint locally (Docker Postgres + Redis) against the real Base Sepolia contract.

Covers: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, DEPLOY-01, DEPLOY-05, DEPLOY-06. No production deploy (that's Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Ownership context
- **D-01:** This codebase was written by the owner's friend. The owner runs the club and is now taking it live. The owner does **not** want to handle key or role details by hand. The plan must make these steps as close to copy-paste as possible, with one short human action per step (for example "fund this address from the faucet"), and no key-management decisions pushed back to the owner.

### Keep-or-redeploy policy
- **D-02:** The owner says they have the deployer key, but that is unconfirmed, because a friend deployed the contract. Treat it as unverified. The first task derives the address from the available key(s) and runs `hasRole` for DEFAULT_ADMIN_ROLE, ADMIN_ROLE and RELAY_ROLE against `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192`.
- **D-03:** Decision rule: if an available key holds DEFAULT_ADMIN_ROLE → **keep** the contract, grant RELAY_ROLE to the new relay and ADMIN_ROLE to the new admin-signer, and revoke stale holders. Otherwise → **redeploy** with `smart-contract/script/Deploy.s.sol`, keep the broadcast record, and sync the address and ABI everywhere. Record the outcome and the evidence (`hasRole` output) in the phase summary.
- **D-04:** Assume the deployed bytecode matches the current `AttendanceRegistry.sol`. No Basescan source comparison. The ABI consistency check (CHAIN-03) is the guard.

### Wallets & key custody
- **D-05:** DEFAULT_ADMIN_ROLE key is **backend-held**: set `DEFAULT_ADMIN_PRIVATE_KEY` in backend env so the dashboard can grant and revoke roles. On a redeploy, the deployer key becomes this key. The owner accepts the hot-key tradeoff for testnet.
- **D-06:** Relay and admin-signer are fresh, separate, testnet-only wallets (CHAIN-02). Generation method, funding amounts and faucet choice are Claude's discretion.

### Secrets hygiene (found during discussion)
- **D-07:** The root `/.env` is **not gitignored** (only per-package `.gitignore`s exist) and holds three unlabeled secrets (`backend`, `frontend`, `contract`) in a non-dotenv format (label on one line, value on the next). Phase 1 must: (a) add `.env` to a root `.gitignore` before any commit, (b) identify each value's type by its format or a harmless probe without printing it, and move it into the correct `KEY=value` entry in `backend/.env` / `smart-contract/.env` / `frontend/.env.local`, (c) never echo secret values in logs or output. Two of these values were accidentally printed in the discussion session. Recommend the owner rotate them (the `frontend` and `contract` entries) if they turn out to be live secrets.
- **D-08:** `frontend/.env.local` has `NEXT_PUBLIC_PRIVY_APP_ID` empty. It must be filled in (likely one of the root `.env` values) for the local rehearsal.

### Claude's Discretion
- Rehearsal driver (real frontend + Privy vs scripted check-in signed by a viem local account), and whether to commit a `docker-compose.yml` for local Postgres and Redis. Prefer the cheapest route that proves a CONFIRMED row and a token on-chain.
- Drift check design (generate from a single source vs check-only script; CI wiring).
- Boot-guard strictness and how tests bypass the guards (the `createApp()` factory already has no listener, so checks belong in `index.ts` bootstrap).
- Wallet generation (e.g. `cast wallet new`), funding amounts, faucet.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria
- `.planning/REQUIREMENTS.md` — CHAIN-01..04, DEPLOY-01, DEPLOY-05, DEPLOY-06
- `.planning/PROJECT.md` — constraints (Base Sepolia, gasless, budget)
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/INTEGRATIONS.md`

### Contract & sync
- `smart-contract/src/AttendanceRegistry.sol` — constructor grants DEFAULT_ADMIN_ROLE + ADMIN_ROLE to `msg.sender` and RELAY_ROLE to `relayWallet`
- `smart-contract/script/Deploy.s.sol` — reads `RELAY_WALLET`, `BASE_CID`
- `addresses.json`, `frontend/lib/contracts/addresses.ts`, `frontend/lib/contracts/abi.ts`, `backend/src/lib/abi.ts`
- `.claude/commands/sync-abi.md` — existing ABI sync procedure

### Backend wiring
- `backend/src/index.ts` — env presence check + listen + `startMintWorker()` (boot guards go here)
- `backend/src/lib/contract.ts` — viem clients; `CHAIN_ID` defaults to 84532 (must become required)
- `backend/src/lib/queue.ts`, `backend/src/jobs/mint.job.ts` — both build `{ url }` Redis connections (DEPLOY-01 bug)
- `backend/.env.example`, `frontend/.env.example`
- `.github/workflows/ci.yml` — Node 20 today (DEPLOY-05 → 22)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/lib/contract.ts`: `publicClient`, `relayAccount`, `adminAccount`, optional `defaultAdminAccount`. Reuse these for the `hasRole` and boot checks.
- `backend/src/services/relay.service.ts`: grant/revoke role helpers already exist.
- `backend/scripts/grant-admin.ts`: pattern for a tsx-run ops script.

### Established Patterns
- Required-env loop in `index.ts` with `process.exit(1)`. Extend it with chain/code/role/Redis checks.
- `createApp()` factory keeps tests free of boot side effects.

### Integration Points
- Redis connection is duplicated in `queue.ts` and `mint.job.ts`. Consolidate into one module (DEPLOY-01).
- No Foundry broadcast record exists locally, so the original `RELAY_WALLET` is unknown.

</code_context>

<specifics>
## Specific Ideas

- Owner wants minimal manual involvement in keys and roles. Give exact commands and say what each one does, in plain language.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 01-chain-readiness-local-mint-rehearsal*
*Context gathered: 2026-10-27*
