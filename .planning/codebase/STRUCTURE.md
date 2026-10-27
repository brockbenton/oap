# Codebase Structure

**Analysis Date:** 2026-10-27

## Directory Layout

```
oap/
├── smart-contract/         # Foundry project (Solidity ^0.8.24, OpenZeppelin 5.x)
│   ├── src/                # AttendanceRegistry.sol, interfaces/IAttendanceRegistry.sol
│   ├── script/             # Deploy.s.sol
│   ├── test/               # AttendanceRegistry.t.sol, helpers/BaseTest.sol
│   └── foundry.toml        # lib/ is gitignored; deps installed in CI
├── backend/                # Express + TypeScript + Prisma
│   ├── src/
│   │   ├── index.ts        # bootstrap (env check, listen, worker)
│   │   ├── app.ts          # createApp() router mounting
│   │   ├── routes/         # one router per domain
│   │   ├── middleware/     # auth, admin, rateLimit, validate
│   │   ├── services/       # *.service.ts business/chain logic
│   │   ├── jobs/           # mint.job.ts (BullMQ worker)
│   │   ├── lib/            # prisma, contract, abi, queue, logger, roles, brand
│   │   └── types/          # index.ts shared types
│   ├── prisma/             # schema.prisma, migrations/, seed.ts
│   ├── scripts/            # grant-admin.ts
│   ├── test/               # vitest suites + globalSetup/testEnv
│   └── railway.toml        # deploy config
├── frontend/               # Next.js 14 App Router
│   ├── app/                # routes (page.tsx per route), layout.tsx, globals.css, fonts/
│   ├── components/
│   │   ├── features/       # admin/, check-in/, marketing/, member/
│   │   ├── shared/         # navs, footer, TokenCard, SessionRecoveryGate...
│   │   ├── providers/      # AppProviders.tsx
│   │   └── ui/             # primitives + index.ts barrel
│   ├── hooks/              # useProfile.ts
│   ├── lib/                # api/, contracts/, docs/, mock/, cn.ts, constants.ts, address.ts, tokenArt.ts
│   └── types/index.ts
├── addresses.json          # deployed contract addresses by network
├── .github/workflows/ci.yml
├── .claude/                # agents/ and commands/ for Claude Code
├── MASTER_PLAN.md, AUDIT.md, README.md, CLAUDE.md
└── .planning/codebase/     # these docs
```

Each package has its own `CLAUDE.md` (`backend/CLAUDE.md`, `frontend/CLAUDE.md`, `smart-contract/CLAUDE.md`) with rules.

## Directory Purposes

**`backend/src/routes/`:** Express routers: `sessions.ts` (CRUD, QR), `check-in.ts`, `members.ts`, `admin.ts` (overview, members, roles, exports, ipfs publish), `art.ts` (token art, badges).
**`backend/src/services/`:** `qr`, `relay`, `onchain`, `stats`, `ipfs`, `art` services.
**`frontend/app/`:** Route groups by role: member (`wallet`, `vault`, `rewards`, `check-in`, `account`, `settings`, `leaderboard`, `stats`, `explore`, `clubs`), `organizer/` (`new`, `run`, `members`), `admin/` (`sessions`, `members`, `roles`, `sessions/[sessionId]/qr`), public (`protocol`, `docs`).
**`frontend/lib/api/`:** `client.ts` (apiRequest), per-domain fetchers, `queryKeys.ts`.
**`frontend/lib/contracts/`:** ABI and addresses for viem.

## Key File Locations

**Entry Points:** `backend/src/index.ts`, `frontend/app/layout.tsx`, `smart-contract/script/Deploy.s.sol`
**Configuration:** `backend/.env.example`, `frontend/.env.example`, `smart-contract/foundry.toml`, `frontend/next.config.mjs`, `frontend/tailwind.config.ts`, `backend/tsconfig.json`, `frontend/tsconfig.json` (alias `@/`), `backend/railway.toml`
**Core Logic:** `smart-contract/src/AttendanceRegistry.sol`, `backend/src/routes/check-in.ts`, `backend/src/services/relay.service.ts`, `backend/src/jobs/mint.job.ts`, `backend/prisma/schema.prisma`
**Testing:** `smart-contract/test/*.t.sol`, `backend/test/*.test.ts` (vitest, `vitest.config.ts`)

## Naming Conventions

**Files:**
- Backend routes: lowercase kebab/single word `check-in.ts`; services `<name>.service.ts`; jobs `<name>.job.ts`; middleware lowercase `auth.ts`.
- Backend tests: `<subject>.test.ts` in `backend/test/`.
- Frontend: Next routes `page.tsx`/`layout.tsx` in lowercase dirs; components PascalCase `.tsx` (`CheckInFlow.tsx`); lib modules camelCase (`queryKeys.ts`); hooks `useX.ts`.
- Solidity: PascalCase contracts, tests `X.t.sol`, scripts `X.s.sol`.
- Prisma: camelCase fields with `@map("snake_case")`, models `@@map("plural_snake")`.

**Directories:** lowercase; dynamic Next segments `[sessionId]`.

## Where to Add New Code

**New API endpoint:** router in `backend/src/routes/<domain>.ts` (mount in `backend/src/app.ts` under `/api/v1/...`); logic in `backend/src/services/<name>.service.ts`; test in `backend/test/`. Use `authMiddleware` (+ `adminMiddleware` for admin), `validate(zodSchema)`, respond `{ data }` / `{ error: { code, message } }`.
**New DB field/model:** edit `backend/prisma/schema.prisma` and add a migration under `backend/prisma/migrations/<timestamp>_<name>/`.
**Contract change:** `smart-contract/src/` (+ interface), tests in `smart-contract/test/`; then sync ABI to `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts`, and update `addresses.json` after deploy.
**New frontend page:** `frontend/app/<route>/page.tsx`; feature UI in `frontend/components/features/<area>/`; reusable bits in `components/shared/`; primitives in `components/ui/` and export from `index.ts`.
**New API call from UI:** fetcher in `frontend/lib/api/<domain>.ts` using `apiRequest`, key in `queryKeys.ts`, consume with `useQuery`; shared types in `frontend/types/index.ts`.
**Utilities:** frontend `frontend/lib/`; backend `backend/src/lib/`.

## Special Directories

**`smart-contract/lib/`:** forge dependencies; Generated: yes; Committed: no (gitignored).
**`backend/prisma/migrations/`:** Generated by Prisma; Committed: yes.
**`frontend/lib/mock/`:** hand-written placeholder data; Committed: yes.
**`.planning/`:** GSD planning artifacts; `.claude/`: agent/command definitions.

---

*Structure analysis: 2026-10-27*
