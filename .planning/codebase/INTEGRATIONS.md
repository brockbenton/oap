# External Integrations

**Analysis Date:** 2026-10-27

## APIs & External Services

**Blockchain RPC:**
- Alchemy (Base Sepolia / Base Mainnet, selected by `CHAIN_ID`) - RPC for public/wallet clients
  - SDK/Client: `viem` `http(rpcUrl)` in `backend/src/lib/contract.ts`
  - Auth: `ALCHEMY_API_KEY`
  - Also used by Foundry `[rpc_endpoints]` in `smart-contract/foundry.toml`

**Contract verification:**
- Basescan / Etherscan API (`api-sepolia.basescan.org`, `api.basescan.org`) - `forge verify`
  - Auth: `BASESCAN_API_KEY`

**IPFS pinning:**
- Pinata (`https://api.pinata.cloud/pinning/pinFileToIPFS`) - pins token metadata JSON directory
  - Implementation: raw HTTP in `backend/src/services/ipfs.service.ts`
  - Auth: `PINATA_JWT`; art CIDs via `DEFAULT_SEMESTER_ART_CID`, `SEMESTER_ART_CIDS`, `CONTRACT_BASE_CID`
  - Dry-run staging dir: `ipfs-staging/`

**On-chain contract:**
- `AttendanceRegistry` (ERC1155, AccessControl) on Base Sepolia at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` (`addresses.json`)
  - Backend ABI: `backend/src/lib/abi.ts`; frontend ABI/address: `frontend/lib/contracts/abi.ts`, `frontend/lib/contracts/addresses.ts`
  - Roles: relay wallet (`RELAY_PRIVATE_KEY`, RELAY_ROLE) mints; admin signer (`ADMIN_SIGNER_PRIVATE_KEY`) manages sessions and signs QR payloads (`backend/src/services/qr.service.ts`, `relay.service.ts`, `onchain.service.ts`)

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` (CI uses `TEST_DATABASE_URL`)
  - Client: Prisma (`backend/src/lib/prisma.ts`, schema `backend/prisma/schema.prisma`; models Member, Session, CheckIn, TokenEvent; migrations in `backend/prisma/migrations/`)

**File Storage:**
- IPFS via Pinata (metadata and art); local `ipfs-staging/` for dry-run

**Caching / Queue:**
- Redis via BullMQ (`REDIS_URL`) - mint queue `backend/src/lib/queue.ts`, worker `backend/src/jobs/mint.job.ts`

## Authentication & Identity

**Auth Provider:**
- Privy
  - Frontend: `PrivyProvider` in `frontend/components/providers/AppProviders.tsx` (login methods email, google, passkey; default chain Base Sepolia; embedded wallets); `NEXT_PUBLIC_PRIVY_APP_ID`
  - Backend: `@privy-io/server-auth` token verification in `backend/src/middleware/auth.ts`; `PRIVY_APP_ID`, `PRIVY_APP_SECRET`
  - Admin gating: `backend/src/middleware/admin.ts`, `backend/src/lib/roles.ts`, `backend/scripts/grant-admin.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- pino structured logging (`backend/src/lib/logger.ts`), pino-pretty in dev

## CI/CD & Deployment

**Hosting:**
- Backend: Railway, Nixpacks (`backend/railway.toml`); runs `prisma migrate deploy` on start
- Frontend: not configured in repo

**CI Pipeline:**
- GitHub Actions `.github/workflows/ci.yml`: contract (forge test, OZ v5.1.0 + forge-std v1.9.4 cloned), backend (postgres:14 service, build + test), frontend (typecheck + build)

## Environment Configuration

**Required env vars:**
- Backend: `DATABASE_URL`, `REDIS_URL`, `ALCHEMY_API_KEY`, `CONTRACT_ADDRESS`, `CHAIN_ID`, `RELAY_PRIVATE_KEY`, `ADMIN_SIGNER_PRIVATE_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`
- Frontend: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_API_URL`

**Secrets location:**
- Local `.env` / `frontend/.env.local` (present, gitignored); production secrets in Railway env. Private keys must never be committed.

## Webhooks & Callbacks

**Incoming:**
- None implemented. `ALCHEMY_WEBHOOK_SECRET` is declared in `backend/.env.example` but no webhook route exists in `backend/src/routes/`.

**Outgoing:**
- None

---

*Integration audit: 2026-10-27*
