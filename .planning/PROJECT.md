# Onchain Attendance (OAP)

## What This Is

Soulbound onchain attendance for a university blockchain club. Members scan a time-boxed, admin-signed QR code at a meeting and receive a non-transferable ERC-1155 attendance token on Base. A backend relay pays the gas, so members never send transactions. The tokens drive attendance stats, member tiers, a leaderboard and an admin dashboard. The code is mostly built, but the system has never run end to end. This round of work makes it deployable and puts it live on Base Sepolia for the club the owner runs.

## Core Value

A member who scans the meeting QR code reliably ends up with an attendance token on-chain, without paying gas.

## Requirements

### Validated

<!-- Exists in code. "Validated" here means implemented and unit-tested, NOT proven live (the backend has never run with real keys). -->

- ✓ Soulbound ERC-1155 `AttendanceRegistry` with AccessControl (ADMIN/RELAY/DEFAULT_ADMIN), one token id per session, transfers revert. Deployed to Base Sepolia at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` (45 Foundry tests). Existing
- ✓ Admin creates a session (DB + on-chain `createSession`) and displays a signed, TTL-bound QR code. Existing
- ✓ Member check-in: QR scan, then an embedded-wallet signature, then backend verification, a DB CheckIn row, a BullMQ mint job, and a 202 response. Existing (code only)
- ✓ Idempotent mint worker that reconciles against on-chain `balanceOf`. Existing (code only)
- ✓ Privy auth (email/google/passkey, embedded wallets) and the backend bearer-token middleware. Existing
- ✓ Member stats, leaderboard, admin overview and CSV export backed by real data. Existing
- ✓ IPFS art/metadata publishing via `setBaseCid`. Existing
- ✓ Frontend deployed on Vercel (per owner; to be confirmed). Existing

### Active

- [ ] Prove gasless minting works end to end on Base Sepolia: a real check-in produces a token visible on-chain
- [ ] Backend hosted and running in production (API + mint worker + Postgres + Redis) with all required env and keys, wired to the Vercel frontend
- [ ] Relay wallet holds RELAY_ROLE on the deployed contract and is funded; contract/ABI/address consistent across layers
- [ ] Clubs, explore and rewards pages backed by real data (replace `frontend/lib/mock/*`)
- [ ] Reliability: sweeper for check-ins stuck in PENDING (e.g. Redis down at enqueue), relay gas-balance monitoring/alerting, error tracking
- [ ] Frontend tests: test runner set up, covering the check-in signing flow and the admin gate
- [ ] Minimal security for a public deployment: CORS restricted to the frontend origin, helmet, `trust proxy`

### Out of Scope

- Base Mainnet deployment: this round targets a live testnet with one club; mainnet comes later
- External contract audit: deferred to mainnet
- Full security hardening (key separation, multisig for role ops, shareable-QR presence binding, global rate limiting): owner chose minimal security for the testnet launch
- Multi-club onboarding: the first users are one club the owner runs
- On-chain event indexer (`TokenEvent`): `check_ins` stays the source of truth; reconciliation is covered by the sweeper
- Education onboarding track and email notifications (from MASTER_PLAN.md): not needed to go live
- Express 5 migration and large-file refactors: tech debt that doesn't block deployment

## Context

- Monorepo with three packages (`smart-contract/`, `backend/`, `frontend/`), each with its own npm/forge setup and no root workspace. The codebase map is in `.planning/codebase/`.
- The backend has **never run fully**: there's no `backend/.env`, and the process exits unless DATABASE_URL, REDIS_URL, ALCHEMY_API_KEY, CONTRACT_ADDRESS, RELAY_PRIVATE_KEY, ADMIN_SIGNER_PRIVATE_KEY, PRIVY_APP_ID and PRIVY_APP_SECRET are all set. `backend/railway.toml` exists (Nixpacks), so Railway is the likely backend host.
- The deploy script (`smart-contract/script/Deploy.s.sol`) reads `RELAY_WALLET` to set up the minter. It's unknown whether the relay holding RELAY_ROLE on the deployed contract is a wallet the owner controls.
- The ABI is duplicated in `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts`. The address lives in `addresses.json` and `frontend/lib/contracts/addresses.ts`.
- Mint pipeline weak spots: two-phase write (chain, then DB), a single relay wallet (nonce contention), and the worker running in the same process as the API.
- Recent frontend work patched Privy session wedging and hydration (PRs #40, #41). Login methods must stay email/google/passkey or `CheckInFlow.tsx` signing breaks.
- AUDIT.md is stale: L1 and L3 are already fixed.

## Constraints

- **Tech stack**: Solidity/Foundry (use `~/.foundry/bin/forge`), Next.js 14 App Router + Privy + viem/wagmi, Express + Prisma + PostgreSQL + BullMQ/Redis. Keep the existing stack.
- **Chain**: Base Sepolia (84532) for this round. The contract is not upgradeable, so a redeploy means syncing the address and ABI across all layers.
- **Hosting**: frontend on Vercel (believed already deployed); the backend needs a host that provides Postgres and Redis.
- **Budget**: student club project, so prefer free or cheap tiers. Testnet gas is free from faucets, but the relay must stay funded.
- **Gasless UX**: members must never pay gas or send transactions themselves.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Target live Base Sepolia for one club before mainnet | Prove the system works with real users at low risk | Pending |
| Back the mock pages with real data instead of hiding them | Owner wants the full product experience at launch | Pending |
| Minimal security only (CORS, helmet, trust proxy) | Testnet with a single known club; full hardening deferred to mainnet | Pending |
| Include frontend tests this round | The auth and signing flows have regressed before (PRs #40, #41) with no tests | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-27 after initialization*
