# CHECKPOINT — 2026-03-31

## Current Phase
Phase 1 — Core MVP

## Last Completed
Phase 1 Item 3: **Backend — session management, QR generation/verification, transaction relay**

### What was built
Full backend scaffold from scratch. All TypeScript compiles clean (`tsc --noEmit`).

**Files created:**
- `backend/package.json`, `tsconfig.json`, `.env.example`
- `backend/prisma/schema.prisma` — members, sessions, check_ins, token_events, admin_roles
- `backend/src/lib/logger.ts` — pino singleton
- `backend/src/lib/prisma.ts` — Prisma client singleton
- `backend/src/lib/abi.ts` — compact AttendanceRegistry ABI (functions + events used by backend)
- `backend/src/lib/contract.ts` — viem public/wallet clients (relay + admin), typed `Chain`
- `backend/src/lib/queue.ts` — BullMQ `mint` queue + `MintJobData` type
- `backend/src/types/index.ts` — shared types (`AuthUser`, `QRPayload`, `QREnvelope`)
- `backend/src/middleware/auth.ts` — Privy JWT verification via `getUser({idToken})`; sets `req.user.{privyUserId,walletAddress}`
- `backend/src/middleware/admin.ts` — DB admin role check using Privy-verified wallet
- `backend/src/middleware/validate.ts` — Zod schema validation wrapper
- `backend/src/services/qr.service.ts` — QR payload sign (admin key) + verify (signature + expiry)
- `backend/src/services/relay.service.ts` — `createSessionOnChain`, `closeSessionOnChain`, `mintOnChain` via viem + Alchemy RPC
- `backend/src/jobs/mint.job.ts` — BullMQ Worker; concurrency=1 to avoid nonce collisions; updates check_in on success/failure
- `backend/src/routes/sessions.ts` — `POST /`, `GET /:id`, `POST /:id/close`, `GET /:id/qr`
- `backend/src/routes/check-in.ts` — `POST /` — verifies QR + member sig + freshness, queues mint
- `backend/src/index.ts` — Express app with env validation, routes, error handler, starts worker

### Security issues addressed
- CRITICAL: Admin auth now uses Privy-verified wallet (not client-supplied header)
- HIGH: Check-in message includes `privyWalletAddress` to bind sig to identity; recovered address verified against Privy wallet
- HIGH: `signedAt` freshness check (±60s window) added
- MEDIUM: Nonce removed from `@unique` on `check_ins` — multiple members can scan same QR; duplicate prevention is `@@unique([memberId, sessionId])`
- MEDIUM: Worker concurrency set to 1 (prevents on-chain nonce collisions)
- LOW: `isAddress()` validation in admin middleware
- LOW: `waitForTransactionReceipt` timeout (120s) on all relay calls

## Next Up
Phase 1 Item 4: **Frontend — Privy auth flow, QR scanner page, success/token confirmation screen**

## In Progress
Nothing. Working tree is dirty (new `backend/` files, `MASTER_PLAN.md` update).

## Decisions Made This Session
- **`@types/express`**: Using v4 (`^4.17.21`) — app runs Express 4, v5 types have incompatible `req.params` typing
- **Admin identity source**: Privy `getUser({idToken})` overload used in auth middleware — avoids rate limits; wallet comes from Privy, not client header
- **QR nonce**: NOT globally unique in DB. Multiple members scan the same QR (nonce is same for all). Duplicate prevention is via `@@unique([memberId, sessionId])` on check_ins. Nonce stored for audit trail only.
- **Mint worker concurrency = 1**: Single relay wallet on-chain; concurrent nonce racing avoided by serializing BullMQ job processing
- **`createSession` / `closeSession` on-chain**: Called directly from route handler (blocking until confirmed). Admin action, infrequent, acceptable UX. `RELAY_ROLE`-only mint goes through queue.
- **`ADMIN_SIGNER_PRIVATE_KEY`**: Used for both QR payload signing AND on-chain `createSession`/`closeSession` (both are ADMIN_ROLE operations). This key must have ADMIN_ROLE on the contract.

## Foundry PATH Note
`/usr/bin/forge` is a ZOE music library binary — NOT Foundry. Always use `~/.foundry/bin/forge` for all forge commands.

## Open Items (carry forward)
### Contract (non-blocking)
- SHOULD CHANGE: cache `s_sessions[sessionId]` in memory in `mint()` and `closeSession()` to avoid redundant SLOADs
- SHOULD CHANGE: add explicit `address(0)` guard on `mint()`'s `to` param
- LOW: transfer `DEFAULT_ADMIN_ROLE` to a multisig before mainnet
- LOW: add empty-string guard to `setBaseCid()`

### Backend (non-blocking, carry forward)
- LOW: `adminRole.walletAddress` has no unique constraint — duplicate active rows possible. Add app-level uniqueness enforcement when admin role management is built (Phase 3)
- INFO: `ADMIN_SIGNER_PRIVATE_KEY` is used for on-chain transactions AND QR signing. Key compromise = both attack surfaces. Consider separating roles before mainnet.

## Blockers
None. Backend install + `tsc --noEmit` pass. Needs `DATABASE_URL` + `REDIS_URL` + other env vars to run (`prisma migrate dev`, then `npm run dev`).
