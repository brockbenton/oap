<!-- refreshed: 2026-10-27 -->
# Architecture

**Analysis Date:** 2026-10-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│        Frontend (Next.js 14 App Router, Privy auth)          │
│  member pages  │  organizer pages  │  admin pages  │ docs    │
│  `frontend/app/**`  `frontend/components/**`                 │
│  API client: `frontend/lib/api/*`                            │
└────────────────────────────┬────────────────────────────────┘
                             │ REST /api/v1  (Bearer Privy identity token)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│        Backend (Express 4 + TS)  `backend/src/app.ts`        │
│  routes/ → middleware (auth, admin, rateLimit, validate)     │
│          → services/ → lib/ (prisma, viem contract, queue)   │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │ Prisma            │ BullMQ/Redis      │ viem (relay + admin signer)
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐
│ PostgreSQL   │   │ mint queue       │   │ AttendanceRegistry (ERC1155)│
│ `backend/    │   │ `backend/src/    │   │ `smart-contract/src/        │
│ prisma/`     │   │ jobs/mint.job.ts`│   │ AttendanceRegistry.sol`     │
└──────────────┘   └──────────────────┘   │ Base Sepolia                │
                                          └─────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| AttendanceRegistry | Soulbound ERC1155; one token id per session; AccessControl (ADMIN_ROLE, RELAY_ROLE, DEFAULT_ADMIN_ROLE) | `smart-contract/src/AttendanceRegistry.sol` |
| IAttendanceRegistry | Structs, events, custom errors, external API | `smart-contract/src/interfaces/IAttendanceRegistry.sol` |
| Express app factory | Mounts routers, 404 + error handlers (no listener; testable) | `backend/src/app.ts` |
| Server bootstrap | Env validation, listen, starts mint worker | `backend/src/index.ts` |
| Auth middleware | Verifies Privy identity token, sets `req.user` (`privyUserId`, lowercase `walletAddress`) | `backend/src/middleware/auth.ts` |
| Admin middleware | Admin role check (DB `AdminRole`) | `backend/src/middleware/admin.ts` |
| QR service | Signs/verifies base64 QR envelope with admin signer (TTL `QR_TTL_MS`) | `backend/src/services/qr.service.ts` |
| Relay service | Sends on-chain txs (mint, createSession, closeSession, grant/revoke role, setBaseCid) | `backend/src/services/relay.service.ts` |
| Onchain service | Read-only chain queries (token balance) | `backend/src/services/onchain.service.ts` |
| Stats service | Attendance stats, member and admin overview aggregation | `backend/src/services/stats.service.ts` |
| IPFS / art services | Token art/badge generation and semester metadata publishing | `backend/src/services/ipfs.service.ts`, `backend/src/services/art.service.ts` |
| Mint worker | BullMQ worker; idempotent mint + DB reconcile | `backend/src/jobs/mint.job.ts` |
| Frontend providers | QueryClient + PrivyProvider (Base Sepolia, email/google/passkey, embedded wallets) | `frontend/components/providers/AppProviders.tsx` |
| Frontend API layer | `apiRequest<T>` wrapper, per-domain fetchers, query keys | `frontend/lib/api/client.ts`, `frontend/lib/api/*.ts` |
| Admin gate | Layout probing `GET /admin/me`; 403 surfaces error UI | `frontend/app/admin/layout.tsx` |

## Pattern Overview

**Overall:** Three-tier monorepo with gasless relayed minting. Layered Express backend (routes -> services -> lib), client-rendered Next.js frontend with TanStack Query, and a single Solidity contract.

**Key Characteristics:**
- Gasless: members never send txs; a relay wallet (`RELAY_ROLE`) mints after the backend verifies the check-in.
- Postgres `check_ins` is the source of truth for attendance; `TokenEvent` is reserved for a future indexer and unused.
- Mint is asynchronous (HTTP 202 + BullMQ job) and idempotent (reconciles against on-chain balance).
- Soulbound: transfers revert (`Soulbound`), `setApprovalForAll` disabled.

## Layers

**Routes:**
- Purpose: HTTP handling, zod validation, status codes
- Location: `backend/src/routes/` (`sessions.ts`, `check-in.ts`, `members.ts`, `admin.ts`, `art.ts`)
- Depends on: middleware, services, `lib/prisma`
- Used by: `backend/src/app.ts`

**Services:** business logic and chain/IPFS I/O in `backend/src/services/`.

**Lib:** singletons: `backend/src/lib/prisma.ts`, `contract.ts` (viem clients, `adminAccount`), `abi.ts`, `queue.ts`, `logger.ts`, `roles.ts`, `brand.ts`.

**Frontend pages:** `frontend/app/**/page.tsx` (App Router), feature components in `frontend/components/features/`, shared in `frontend/components/shared/`, primitives in `frontend/components/ui/` (barrel `index.ts`).

## Data Flow

### Check-in (primary path)

1. Admin creates session: `POST /api/v1/sessions` writes DB row and sends `createSession` on-chain; `onchainStatus` PENDING -> CONFIRMED (`backend/src/routes/sessions.ts`).
2. Admin requests QR (`GET /sessions/:id/qr`); `generateQR` signs payload `{sessionId, issuedAt, expiresAt, nonce}` (`backend/src/services/qr.service.ts`). Displayed at `frontend/app/admin/sessions/[sessionId]/qr/page.tsx`.
3. Member scans (`frontend/components/features/check-in/QrScanner.tsx`), signs message `I am checking into session {id} as {wallet} at {signedAt}` (`CheckInFlow.tsx`), calls `POST /api/v1/check-in`.
4. Backend (`backend/src/routes/check-in.ts`): authMiddleware -> checkInLimiter -> zod validate -> stale-signature check (60s) -> `verifyQR` -> recover signer and match Privy wallet -> session must exist, be open, and CONFIRMED -> upsert Member -> create CheckIn (unique `[memberId, sessionId]`, P2002 -> 409) -> `mintQueue.add('mint', ..., attempts 3, exponential backoff)` -> 202.
5. Worker (`backend/src/jobs/mint.job.ts` `runMintJob`): skip if CONFIRMED, reconcile if on-chain balance > 0, else `mintOnChain` and set `txHash`, `mintStatus=CONFIRMED`.

### Admin / member reads

Frontend fetchers (`frontend/lib/api/admin.ts`, `members.ts`, `check-in.ts`, `profile.ts`) get an identity token via `getIdentityToken()` from Privy and pass `token` to `apiRequest`. Stats come from `stats.service.ts` via `/members/:address/stats` and `/admin/overview`.

**State Management:** Server state via TanStack Query (`staleTime` 30s, keys in `frontend/lib/api/queryKeys.ts`); auth state via Privy; no global client store. Server state in Postgres + chain.

## Key Abstractions

**Session:** `Session` Prisma model (`sessionIdOnchain` unique) mirrors on-chain `Session` struct (token id = session id).
**AuthUser / QRPayload / QREnvelope:** `backend/src/types/index.ts`.
**MintJobData:** `backend/src/lib/queue.ts`.
**ApiRequestError:** `frontend/lib/api/client.ts` (code, message, status); `retryUnlessForbidden` bounds retries.

## Entry Points

**Backend:** `backend/src/index.ts` (listener + worker); `createApp()` in `backend/src/app.ts` for tests.
**Frontend:** `frontend/app/layout.tsx` (root), `frontend/app/page.tsx` (landing / member home).
**Contract deploy:** `smart-contract/script/Deploy.s.sol`; deployed address in `addresses.json` (base-sepolia).
**One-off script:** `backend/scripts/grant-admin.ts`; seed `backend/prisma/seed.ts`.

## Architectural Constraints

- **Threading:** Node single-threaded; mint worker runs in the same process as the HTTP server (`startMintWorker()` in `index.ts`).
- **Global state:** Module singletons: `backend/src/lib/prisma.ts`, `contract.ts`, `queue.ts` (lazyConnect Redis), Privy client in `middleware/auth.ts`; frontend `queryClient` in `AppProviders.tsx`.
- **Express 4:** async errors forwarded via `express-async-errors`, imported first in `app.ts`.
- **Wallet addresses:** stored lowercase from `req.user.walletAddress`; checksummed only for chain calls.
- **ABI duplicated:** `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts` must be kept in sync with the contract (see `.claude/commands/sync-abi.md`); address in `addresses.json` and `frontend/lib/contracts/addresses.ts`.
- **Required backend env:** DATABASE_URL, REDIS_URL, ALCHEMY_API_KEY, CONTRACT_ADDRESS, RELAY_PRIVATE_KEY, ADMIN_SIGNER_PRIVATE_KEY, PRIVY_APP_ID, PRIVY_APP_SECRET (process exits if missing).

## Anti-Patterns

### Mock data in production pages

**What happens:** `frontend/lib/mock/*` (clubs, explore, gamification, meeting, rewards) holds fabricated data for pages like `frontend/app/clubs`, `explore`, `rewards`.
**Why it's wrong:** Displays non-real data (recent commit replaced fabricated member data).
**Do this instead:** Back pages with real endpoints via `frontend/lib/api/*`, as `frontend/app/leaderboard` and `stats` do.

### Inline error-response literals

**What happens:** Routes hand-write `res.status(...).json({ error: { code, message } })`.
**Do this instead:** Keep the `{ error: { code, message } }` shape exactly; success is `{ data }`.

## Error Handling

**Strategy:** Early-return JSON errors in handlers; global handler in `app.ts` returns generic 500 without leaking internals; Prisma P2002 mapped to 409.

## Cross-Cutting Concerns

**Logging:** pino-style structured `logger.info({ msg, ... })` from `backend/src/lib/logger.ts`.
**Validation:** zod via `validate(schema)` in `backend/src/middleware/validate.ts`.
**Authentication:** Privy identity token (Bearer) -> `authMiddleware`; admin routes add `adminMiddleware` (`routes/admin.ts` applies both with `router.use`). Rate limiting in `middleware/rateLimit.ts`.
**CI:** `.github/workflows/ci.yml` runs forge tests, backend build+tests (Postgres service), frontend checks.

---

*Architecture analysis: 2026-10-27*
