# Walking Skeleton — Onchain Attendance (OAP)

**Phase:** 1
**Generated:** 2026-10-27

> Brownfield adaptation: the app scaffold (Next.js frontend, Express backend, Foundry contract) already exists. This skeleton does not scaffold new routes. It proves the existing thinnest slice runs end to end and fixes the architectural decisions later phases build on.

## Capability Proven End-to-End

A member's signed check-in to an admin-created session becomes a CONFIRMED `check_ins` row and a soulbound ERC-1155 token (`balanceOf(member, sessionId) == 1`) on the real Base Sepolia contract, with the relay paying gas, run locally under Node 22 against Docker Postgres and Redis (`cd backend && npx tsx scripts/rehearse.ts` prints `REHEARSAL PASSED`).

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Contract | `AttendanceRegistry` (OZ v5.1.0 ERC1155 + AccessControl, soulbound), one token id per session, on Base Sepolia (84532) | Existing contract; not upgradeable, so address + ABI sync is a hard rule (check-sync.ts + CI) |
| Role model | DEFAULT_ADMIN_ROLE key held by the backend (`DEFAULT_ADMIN_PRIVATE_KEY`, D-05); RELAY_ROLE on a dedicated relay wallet; ADMIN_ROLE on a separate admin-signer wallet that also signs QRs (D-06) | Gasless UX and dashboard role management; relay != admin-signer enforced at boot |
| Keep vs redeploy | Decided at runtime by `hasRole` probe (D-02/D-03); recorded in 01-03/01-04 SUMMARY | Original deployer key unverified |
| Backend | Express 4 + Prisma 5 + BullMQ 5, API and mint worker in one process, one replica | Single relay nonce source; worker `concurrency: 1` |
| Data layer | PostgreSQL (`check_ins` is the attendance source of truth) | Existing schema and migrations |
| Queue | Redis via a single module `backend/src/lib/redis.ts` that reads `REDIS_URL` (ioredis), `noeviction` | Fixes the ignored `{ url }` bug (DEPLOY-01) |
| Boot policy | `index.ts main()` fails fast: required env (incl. `CHAIN_ID`) -> chain ID match -> contract code -> relay RELAY_ROLE -> relay != admin-signer -> Redis PING; no bypass flag | Misconfiguration must stop the process, not surface as failed mints |
| Auth | Privy identity token verified server-side (`getUser({ idToken })`); admin = on-chain ADMIN_ROLE | Unchanged; the rehearsal patches `PrivyClient.prototype.getUser` in its own process only |
| Runtime | Node 22 (`.nvmrc`, `backend/.nvmrc`, `engines >=22 <23`, CI `node-version-file`) | DEPLOY-05; same runtime locally, in CI, on Railway and Vercel |
| Local full-stack run | `docker compose up -d --wait` (postgres:16, redis:7 noeviction) + `prisma migrate deploy` + `npx tsx scripts/rehearse.ts` | Documented, repeatable local run against the real chain |
| Ops scripts | `backend/scripts/*.ts` run with tsx, never compiled into dist (`tsconfig include: src/**`), typechecked via `tsconfig.scripts.json`; print addresses/statuses only, never secrets | Keeps test-only patches and key handling out of production code |
| Deployment target (next) | Backend on Railway (single replica, managed Postgres + Redis), frontend on Vercel | Phase 2 |

## Stack Touched in Phase 1

- [x] Project scaffold: existing; adds Node 22 pin, docker-compose.yml, scripts typecheck config, CI sync-check job
- [x] Routing: real routes `POST /api/v1/sessions`, `GET /api/v1/sessions/:id/qr`, `POST /api/v1/check-in`
- [x] Database: real write (session, member upsert, check-in PENDING -> CONFIRMED) and real read (poll check-in)
- [ ] UI: not exercised in Phase 1. The rehearsal drives the API with a viem-signed message identical to `CheckInFlow`'s; the real phone + Privy path is Phase 2 (MINT-02). Claude's discretion per CONTEXT: cheapest route that proves a CONFIRMED row and a token.
- [x] Deployment: documented local full-stack run command (above) against real Base Sepolia

## Out of Scope (Deferred to Later Slices)

- Production deploy on Railway/Vercel, Privy allowed origins, CORS/helmet/trust proxy (Phase 2)
- Real phone check-in via the frontend and burst testing (Phase 2)
- Health endpoint checking DB/Redis/RPC (Phase 2, DEPLOY-03)
- Sweeper, balance alerts, Sentry, graceful shutdown (Phase 3)
- Mint status UI, live meeting view (Phase 4); real-data pages (Phase 5); frontend tests and hard-failing backend CI tests (Phase 6)
- Multisig / separate QR key for mainnet (SEC-V2-01)

## Subsequent Slice Plan

- Phase 2: A real member scans the QR on a phone and receives a gasless token from the production deployment
- Phase 3: Check-ins still become tokens through outages, and the owner is alerted first
- Phase 4: Members see pending/confirmed/failed mint status; anyone can watch a live meeting
- Phase 5: Clubs, Explore and Rewards pages show real data only
- Phase 6: Signing and admin flows are locked in by blocking tests
