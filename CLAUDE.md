**ALWAYS RESPOND IN ENGLISH**

## Rules
- Run independent tool calls in parallel
- Never create files unless strictly required; always prefer editing existing files
- Never proactively create `.md` or README files
- Do what was asked; nothing more, nothing less

## Stack
- Smart contract: Solidity/Foundry — use `~/.foundry/bin/forge` (`/usr/bin/forge` is an unrelated binary)
- Frontend: Next.js 14 (App Router) / TypeScript / Tailwind / Privy / viem+wagmi
- Backend: Node.js / Express / TypeScript / PostgreSQL / Prisma
- Chain: Base Sepolia (testnet) → Base Mainnet

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Onchain Attendance (OAP)**

Soulbound onchain attendance for a university blockchain club. Members scan a time-boxed, admin-signed QR code at a meeting and receive a non-transferable ERC-1155 attendance token on Base. A backend relay pays the gas, so members never send transactions. The tokens drive attendance stats, member tiers, a leaderboard and an admin dashboard. The code is mostly built, but the system has never run end to end. This round of work makes it deployable and puts it live on Base Sepolia for the club the owner runs.

**Core Value:** A member who scans the meeting QR code reliably ends up with an attendance token on-chain, without paying gas.

### Constraints

- **Tech stack**: Solidity/Foundry (use `~/.foundry/bin/forge`), Next.js 14 App Router + Privy + viem/wagmi, Express + Prisma + PostgreSQL + BullMQ/Redis. Keep the existing stack.
- **Chain**: Base Sepolia (84532) for this round. The contract is not upgradeable, so a redeploy means syncing the address and ABI across all layers.
- **Hosting**: frontend on Vercel (believed already deployed); the backend needs a host that provides Postgres and Redis.
- **Budget**: student club project, so prefer free or cheap tiers. Testnet gas is free from faucets, but the relay must stay funded.
- **Gasless UX**: members must never pay gas or send transactions themselves.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5 - frontend (`frontend/`) and backend (`backend/`); strict mode
- Solidity ^0.8.24 (compiled with solc 0.8.24) - `smart-contract/src/AttendanceRegistry.sol`
- SQL (Prisma-generated migrations) - `backend/prisma/migrations/`
## Runtime
- Node.js 20 (per CI `.github/workflows/ci.yml`); no `.nvmrc`
- Backend compiles to CommonJS (`backend/tsconfig.json`, target ES2022) and runs `node dist/index.js`
- EVM target chain: Base Sepolia (chain id 84532), planned Base Mainnet (8453)
- npm (separate `package.json` per package; no root workspace)
- Lockfiles: `backend/package-lock.json`, `frontend/package-lock.json` present
- Solidity deps are git-cloned into `smart-contract/lib/` (gitignored, not vendored)
## Frameworks
- Next.js 14.2.35 (App Router, `frontend/app/`) - frontend; `frontend/next.config.mjs` is empty config
- React ^18 - UI
- Express ^4.21.2 - REST API (`backend/src/app.ts`, routes under `/api/v1`)
- Prisma ^5.22.0 (`@prisma/client`) - ORM, `backend/prisma/schema.prisma`
- BullMQ ^5.34.0 - mint job queue (`backend/src/lib/queue.ts`, `backend/src/jobs/mint.job.ts`)
- Foundry (forge) - contract build/test/deploy; `smart-contract/foundry.toml`
- OpenZeppelin Contracts v5.1.0 (ERC1155, AccessControl, ReentrancyGuard, Strings)
- Vitest ^2.1.9 + supertest ^7.2.2 - backend (`backend/vitest.config.ts`, `backend/test/`)
- forge test (forge-std v1.9.4) - contracts (`smart-contract/test/`)
- Frontend: no test runner detected
- tsx ^4.19.2 - backend dev (`tsx watch src/index.ts`) and scripts
- Tailwind CSS ^3.4.1 + PostCSS (`frontend/tailwind.config.ts`, `frontend/postcss.config.mjs`)
- ESLint ^8 + eslint-config-next (`frontend/.eslintrc.json`)
- Nixpacks builder on Railway (`backend/railway.toml`)
## Key Dependencies
- `viem` ^2.23.11 (backend) / ^2.47.4 (frontend) - chain clients, signing, contract calls
- `@privy-io/react-auth` ^3.18.0 - frontend auth + embedded wallets
- `@privy-io/server-auth` ^1.18.0 - backend token verification
- `wagmi` ^3.6.0 - frontend contract hooks
- `@tanstack/react-query` ^5.96.0 - frontend data fetching
- `zod` ^3 - validation on both sides (`backend/src/middleware/validate.ts`)
- `pino` ^9.6.0 / `pino-pretty` - logging (`backend/src/lib/logger.ts`)
- `express-rate-limit` ^7.5.1 (`backend/src/middleware/rateLimit.ts`), `cors`, `express-async-errors`
- `html5-qrcode` ^2.3.8 (scan), `react-qr-code` ^2.0.18 (display)
- `@farcaster/mini-app-solana` ^1.1.3 (frontend dependency)
- `dotenv`, `uuid`
## Configuration
- Backend: `backend/.env.example` (copy to `.env`). Vars: `DATABASE_URL`, `REDIS_URL`, `ALCHEMY_API_KEY`, `ALCHEMY_WEBHOOK_SECRET`, `CONTRACT_ADDRESS`, `CHAIN_ID`, `RELAY_PRIVATE_KEY`, `ADMIN_SIGNER_PRIVATE_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `QR_TTL_MS`, `PORT`, `NODE_ENV`. Also read in code: `PINATA_JWT`, `CONTRACT_BASE_CID`, `DEFAULT_SEMESTER_ART_CID`, `SEMESTER_ART_CIDS`, `DEFAULT_ADMIN_PRIVATE_KEY`, `OFFICIAL_MEMBER_THRESHOLD`, `RELAY_MIN_BALANCE_ETH`, `PUBLIC_API_URL`
- Frontend: `frontend/.env.example` (and `.env.local` present, not read). Vars: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_API_URL`
- Contract tooling: `ALCHEMY_API_KEY`, `BASESCAN_API_KEY` (in `foundry.toml`)
- Deployed address recorded in `addresses.json`
- `backend/tsconfig.json`, `frontend/tsconfig.json`, `smart-contract/foundry.toml`
- Backend build: `prisma generate && tsc`; start: `npx prisma migrate deploy && node dist/index.js`
## Platform Requirements
- Node 20, PostgreSQL, Redis, Foundry at `~/.foundry/bin/forge` (`/usr/bin/forge` is an unrelated binary)
- Commands: backend `npm run dev|build|test|typecheck|db:migrate|db:seed|grant-admin`; frontend `npm run dev|build|typecheck|lint`; contracts `forge test -vvv`
- Backend on Railway (`backend/railway.toml`, healthcheck `/health`)
- Frontend hosting not detected (Next.js; likely Vercel)
- Contract on Base (Sepolia now, Mainnet planned)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Backend: `camelCase.ts` for lib/middleware/routes (`src/routes/check-in.ts` is kebab for multiword routes); services are `<name>.service.ts` (`src/services/art.service.ts`); jobs `<name>.job.ts`.
- Backend tests: `<subject>.test.ts` in `backend/test/`.
- Frontend components: `PascalCase.tsx` (`components/ui/Button.tsx`, `components/features/check-in/CheckInFlow.tsx`). Non-component modules are `camelCase.ts` (`lib/tokenArt.ts`) or kebab (`lib/api/check-in.ts`). Hooks are `useXxx.ts` in `frontend/hooks/`.
- Next.js App Router: `app/<route>/page.tsx`.
- Solidity: `PascalCase.sol`; interfaces prefixed `I` in `smart-contract/src/interfaces/`; tests `<Contract>.t.sol`.
## Code Style
- Frontend: ESLint `next/core-web-vitals` + `next/typescript` (`frontend/.eslintrc.json`); run `npm run lint`, `npm run typecheck`.
- Backend: no linter; `npm run typecheck` (`tsc --noEmit`). `strict: true` in both TS configs. Backend is CommonJS (`module: commonjs`); frontend ESM with `@/*` alias.
- Solidity: `forge lint` config in `smart-contract/foundry.toml`; solc 0.8.24.
## Import Organization
## Error Handling
- Uniform error envelope: `{ error: { code: 'UPPER_SNAKE', message: '...' } }`; success envelope `{ data: ... }`. Validation errors add `issues: [{field, message}]` with code `VALIDATION_ERROR` (`backend/src/middleware/validate.ts`).
- Validate bodies with zod via `validate(schema)` middleware; schema declared next to the route.
- Route handlers are `async (req: Request, res: Response): Promise<void>` and may throw: `express-async-errors` is imported first in `backend/src/app.ts`, and the final error middleware returns 500 `INTERNAL_ERROR`. Handle expected Prisma errors explicitly (e.g. `P2002` unique violation in `routes/members.ts`).
- Auth: `authMiddleware` (`middleware/auth.ts`) sets `req.user = { privyUserId, walletAddress }` (wallet lowercased); admin authorization is the on-chain role (`middleware/admin.ts`). Use `req.user!` in authenticated handlers.
- Unknown routes return 404 `NOT_FOUND`.
## Logging
## Comments
- Explain WHY and non-obvious constraints, not what. Section banners in routes: `// ── GET /api/v1/members/me ───...`; Solidity uses `// ----` banner blocks and NatSpec `/// @dev`.
- JSDoc used sparingly on exported builders (`/** Builds the Express app ... */`).
- `eslint-disable-next-line` only with a specific rule.
## Function Design
- Keep route handlers thin; put business logic in `backend/src/services/*.service.ts` and job logic in `src/jobs/`.
- Factory over singleton for testability (`createApp()` in `backend/src/app.ts`; lazy `getPrivy()`).
- Return explicit `Promise<void>` from handlers; `return` after sending a response.
## Module Design
- Tailwind class composition via `cn()` from `frontend/lib/cn.ts`; variant maps as `Record<Variant, string>` constants (`components/ui/Button.tsx`).
- Client components start with `'use client'`. API calls live in `frontend/lib/api/*.ts` (one function per endpoint, token passed explicitly); query keys in `lib/api/queryKeys.ts`.
- Placeholder data lives in `frontend/lib/mock/` (do not present fabricated data as real).
## Project Rules (CLAUDE.md)
- Use `~/.foundry/bin/forge` (not `/usr/bin/forge`).
- Prefer editing existing files; don't create docs/README unprompted; run independent tool calls in parallel.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Gasless: members never send txs; a relay wallet (`RELAY_ROLE`) mints after the backend verifies the check-in.
- Postgres `check_ins` is the source of truth for attendance; `TokenEvent` is reserved for a future indexer and unused.
- Mint is asynchronous (HTTP 202 + BullMQ job) and idempotent (reconciles against on-chain balance).
- Soulbound: transfers revert (`Soulbound`), `setApprovalForAll` disabled.
## Layers
- Purpose: HTTP handling, zod validation, status codes
- Location: `backend/src/routes/` (`sessions.ts`, `check-in.ts`, `members.ts`, `admin.ts`, `art.ts`)
- Depends on: middleware, services, `lib/prisma`
- Used by: `backend/src/app.ts`
## Data Flow
### Check-in (primary path)
### Admin / member reads
## Key Abstractions
## Entry Points
## Architectural Constraints
- **Threading:** Node single-threaded; mint worker runs in the same process as the HTTP server (`startMintWorker()` in `index.ts`).
- **Global state:** Module singletons: `backend/src/lib/prisma.ts`, `contract.ts`, `queue.ts` (lazyConnect Redis), Privy client in `middleware/auth.ts`; frontend `queryClient` in `AppProviders.tsx`.
- **Express 4:** async errors forwarded via `express-async-errors`, imported first in `app.ts`.
- **Wallet addresses:** stored lowercase from `req.user.walletAddress`; checksummed only for chain calls.
- **ABI duplicated:** `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts` must be kept in sync with the contract (see `.claude/commands/sync-abi.md`); address in `addresses.json` and `frontend/lib/contracts/addresses.ts`.
- **Required backend env:** DATABASE_URL, REDIS_URL, ALCHEMY_API_KEY, CONTRACT_ADDRESS, RELAY_PRIVATE_KEY, ADMIN_SIGNER_PRIVATE_KEY, PRIVY_APP_ID, PRIVY_APP_SECRET (process exits if missing).
## Anti-Patterns
### Mock data in production pages
### Inline error-response literals
## Error Handling
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
