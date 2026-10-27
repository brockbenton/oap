# Technology Stack

**Analysis Date:** 2026-10-27

## Languages

**Primary:**
- TypeScript ^5 - frontend (`frontend/`) and backend (`backend/`); strict mode
- Solidity ^0.8.24 (compiled with solc 0.8.24) - `smart-contract/src/AttendanceRegistry.sol`

**Secondary:**
- SQL (Prisma-generated migrations) - `backend/prisma/migrations/`

## Runtime

**Environment:**
- Node.js 20 (per CI `.github/workflows/ci.yml`); no `.nvmrc`
- Backend compiles to CommonJS (`backend/tsconfig.json`, target ES2022) and runs `node dist/index.js`
- EVM target chain: Base Sepolia (chain id 84532), planned Base Mainnet (8453)

**Package Manager:**
- npm (separate `package.json` per package; no root workspace)
- Lockfiles: `backend/package-lock.json`, `frontend/package-lock.json` present
- Solidity deps are git-cloned into `smart-contract/lib/` (gitignored, not vendored)

## Frameworks

**Core:**
- Next.js 14.2.35 (App Router, `frontend/app/`) - frontend; `frontend/next.config.mjs` is empty config
- React ^18 - UI
- Express ^4.21.2 - REST API (`backend/src/app.ts`, routes under `/api/v1`)
- Prisma ^5.22.0 (`@prisma/client`) - ORM, `backend/prisma/schema.prisma`
- BullMQ ^5.34.0 - mint job queue (`backend/src/lib/queue.ts`, `backend/src/jobs/mint.job.ts`)
- Foundry (forge) - contract build/test/deploy; `smart-contract/foundry.toml`
- OpenZeppelin Contracts v5.1.0 (ERC1155, AccessControl, ReentrancyGuard, Strings)

**Testing:**
- Vitest ^2.1.9 + supertest ^7.2.2 - backend (`backend/vitest.config.ts`, `backend/test/`)
- forge test (forge-std v1.9.4) - contracts (`smart-contract/test/`)
- Frontend: no test runner detected

**Build/Dev:**
- tsx ^4.19.2 - backend dev (`tsx watch src/index.ts`) and scripts
- Tailwind CSS ^3.4.1 + PostCSS (`frontend/tailwind.config.ts`, `frontend/postcss.config.mjs`)
- ESLint ^8 + eslint-config-next (`frontend/.eslintrc.json`)
- Nixpacks builder on Railway (`backend/railway.toml`)

## Key Dependencies

**Critical:**
- `viem` ^2.23.11 (backend) / ^2.47.4 (frontend) - chain clients, signing, contract calls
- `@privy-io/react-auth` ^3.18.0 - frontend auth + embedded wallets
- `@privy-io/server-auth` ^1.18.0 - backend token verification
- `wagmi` ^3.6.0 - frontend contract hooks
- `@tanstack/react-query` ^5.96.0 - frontend data fetching
- `zod` ^3 - validation on both sides (`backend/src/middleware/validate.ts`)

**Infrastructure:**
- `pino` ^9.6.0 / `pino-pretty` - logging (`backend/src/lib/logger.ts`)
- `express-rate-limit` ^7.5.1 (`backend/src/middleware/rateLimit.ts`), `cors`, `express-async-errors`
- `html5-qrcode` ^2.3.8 (scan), `react-qr-code` ^2.0.18 (display)
- `@farcaster/mini-app-solana` ^1.1.3 (frontend dependency)
- `dotenv`, `uuid`

## Configuration

**Environment:**
- Backend: `backend/.env.example` (copy to `.env`). Vars: `DATABASE_URL`, `REDIS_URL`, `ALCHEMY_API_KEY`, `ALCHEMY_WEBHOOK_SECRET`, `CONTRACT_ADDRESS`, `CHAIN_ID`, `RELAY_PRIVATE_KEY`, `ADMIN_SIGNER_PRIVATE_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `QR_TTL_MS`, `PORT`, `NODE_ENV`. Also read in code: `PINATA_JWT`, `CONTRACT_BASE_CID`, `DEFAULT_SEMESTER_ART_CID`, `SEMESTER_ART_CIDS`, `DEFAULT_ADMIN_PRIVATE_KEY`, `OFFICIAL_MEMBER_THRESHOLD`, `RELAY_MIN_BALANCE_ETH`, `PUBLIC_API_URL`
- Frontend: `frontend/.env.example` (and `.env.local` present, not read). Vars: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_API_URL`
- Contract tooling: `ALCHEMY_API_KEY`, `BASESCAN_API_KEY` (in `foundry.toml`)
- Deployed address recorded in `addresses.json`

**Build:**
- `backend/tsconfig.json`, `frontend/tsconfig.json`, `smart-contract/foundry.toml`
- Backend build: `prisma generate && tsc`; start: `npx prisma migrate deploy && node dist/index.js`

## Platform Requirements

**Development:**
- Node 20, PostgreSQL, Redis, Foundry at `~/.foundry/bin/forge` (`/usr/bin/forge` is an unrelated binary)
- Commands: backend `npm run dev|build|test|typecheck|db:migrate|db:seed|grant-admin`; frontend `npm run dev|build|typecheck|lint`; contracts `forge test -vvv`

**Production:**
- Backend on Railway (`backend/railway.toml`, healthcheck `/health`)
- Frontend hosting not detected (Next.js; likely Vercel)
- Contract on Base (Sepolia now, Mainnet planned)

---

*Stack analysis: 2026-10-27*
