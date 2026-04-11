# CHECKPOINT — 2026-04-10

## Current Phase
Phase 2 — Admin Dashboard (7/7 done — Phase 2 complete)

## Last Completed
Phase 2 Item 6: **Admin role management — grant/revoke ADMIN_ROLE on-chain from dashboard**

### Code changes
- `backend/src/lib/abi.ts` — added `grantRole` and `revokeRole` function entries
- `backend/src/lib/contract.ts` — added optional `defaultAdminAccount` / `defaultAdminWalletClient` (null if `DEFAULT_ADMIN_PRIVATE_KEY` not set)
- `backend/src/services/relay.service.ts` — added `grantAdminRoleOnChain` and `revokeAdminRoleOnChain`
- `backend/src/routes/admin.ts` — added `GET /admin/roles`, `POST /admin/roles`, `DELETE /admin/roles/:walletAddress`
  - 503 if `DEFAULT_ADMIN_PRIVATE_KEY` not configured
  - Self-revoke prevention (400)
  - Desync-logging if on-chain tx succeeds but DB write fails
- `frontend/types/index.ts` — added `AdminRole` interface
- `frontend/lib/api/admin.ts` — added `listAdminRoles`, `grantAdminRole`, `revokeAdminRole`
- `frontend/lib/api/queryKeys.ts` — added `adminRoles` query key
- `frontend/app/admin/roles/page.tsx` — roles management page:
  - Grant form (wallet address input → POST /admin/roles)
  - Table of active admins with granted-by, granted-at, revoke button (own row hidden)
  - 503-aware: shows configuration notice if `DEFAULT_ADMIN_PRIVATE_KEY` not set

### Security: findings addressed
- MEDIUM: wrapped post-chain DB writes in try/catch with desync logging (both grant and revoke paths)
- MEDIUM: made self-revoke guard explicitly `.toLowerCase()` on both sides

## Phase 2 Items 3–5 (members, tiers, CSV export)
- `backend/prisma/schema.prisma` — added `foundingMember Boolean @default(false)`
- `backend/prisma/migrations/20260410120000_add_founding_member/migration.sql`
- `backend/src/routes/admin.ts` — `GET /admin/members`, `PATCH /admin/members/:id/founding-member`, `GET /export/sessions/:sessionId`, `GET /export/members`; shared `buildMemberStats()` helper
- `backend/src/middleware/auth.ts` — exported `getPrivy()` for use in admin routes
- `frontend/types/index.ts` — added `MemberStats`, `MembersListResponse` types
- `frontend/lib/api/admin.ts` — `listAdminMembers`, `toggleFoundingMember`, `downloadSessionCSV`, `downloadMembersCSV`
- `frontend/lib/api/queryKeys.ts` — `adminMembers` query key
- `frontend/app/admin/members/page.tsx` — members table with tier badges, attendance %, founding toggle, CSV export
- `frontend/app/admin/sessions/page.tsx` — added CSV export button per confirmed session

## Phase 2 Items 1–2 (sessions page + QR page)
- `backend/src/routes/admin.ts` — `GET /admin/sessions`, `GET /admin/sessions/:id/attendees`
- `backend/src/index.ts` — registered `adminRouter` at `/api/v1/admin`
- `frontend/package.json` — added `react-qr-code`
- `frontend/types/index.ts` — fixed `Session.sessionId`, added `SessionWithCount`, `Attendee`
- `frontend/lib/api/admin.ts` — `listAdminSessions`, `getSessionAttendees`, `createSession`, `getSession`, `getSessionQR`
- `frontend/lib/api/queryKeys.ts` — `adminSessions`, `sessionAttendees`, `sessionQR` keys
- `frontend/components/features/admin/CreateSessionForm.tsx` — name/date/semester form
- `frontend/app/admin/sessions/page.tsx` — sessions list, expandable attendees, create form
- `frontend/app/admin/sessions/[sessionId]/qr/page.tsx` — live QR with countdown + auto-refresh

## Phase 2 Item 7 (just completed)
`GET /api/v1/members` — public attendance API for website integration

### Code changes
- `backend/src/services/stats.service.ts` — extracted `buildMemberStats()` and `MemberStat` type from `admin.ts` into a shared service
- `backend/src/routes/admin.ts` — replaced local `buildMemberStats` with import from `stats.service`; removed now-unused `getPrivy` import
- `backend/src/routes/members.ts` — new public router: `GET /` calls `buildMemberStats()` and returns `{ data: { members, totalSessions, currentSemester } }`
- `backend/src/index.ts` — registered `membersRouter` at `/api/v1/members`

Response shape matches `GET /api/v1/admin/members` exactly (same `buildMemberStats()` result). No auth required — public endpoint.

## Next Phase
Phase 3 — Vault & Personal Stats

---

## Remaining manual steps (user action required)

### Railway (Backend + PostgreSQL)
1. Create a Railway project at railway.app
2. Add a **PostgreSQL** plugin — copy the `DATABASE_URL` into env vars
3. Add a **Redis** plugin — copy the `REDIS_URL` into env vars
4. Connect the GitHub repo, set root dir to `backend/`
5. Set environment variables:
   ```
   DATABASE_URL             # From Railway PostgreSQL plugin
   REDIS_URL                # From Railway Redis plugin
   ALCHEMY_API_KEY
   ALCHEMY_WEBHOOK_SECRET
   CONTRACT_ADDRESS         # 0x7bEf8C32157C0A40A51b9bebeb7B36f236316192
   RELAY_PRIVATE_KEY        # Wallet with RELAY_ROLE on contract
   ADMIN_SIGNER_PRIVATE_KEY # Wallet that signs QR payloads
   PRIVY_APP_ID
   PRIVY_APP_SECRET
   QR_TTL_MS                # Optional, default 600000 (10 min)
   CHAIN_ID                 # 84532 (Base Sepolia testnet)
   PORT                     # Railway sets this automatically
   DEFAULT_ADMIN_PRIVATE_KEY # Optional — enables grant/revoke from dashboard
   ```
6. Deploy — Railway will run `npm ci && npm run build` then `npx prisma migrate deploy && node dist/index.js`
7. Note the Railway backend URL (e.g. `https://onchain-attendance-backend.up.railway.app`)

### Vercel (Frontend)
1. Import GitHub repo at vercel.com/new
2. Set **Root Directory** to `frontend/`
3. Set environment variables:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID       # Privy app ID
   NEXT_PUBLIC_CONTRACT_ADDRESS   # 0x7bEf8C32157C0A40A51b9bebeb7B36f236316192
   NEXT_PUBLIC_CHAIN_ID           # 84532 (Base Sepolia testnet)
   NEXT_PUBLIC_API_URL            # Railway backend URL from step above
   ```
4. Deploy — Vercel auto-detects Next.js, no vercel.json needed

---

## Phase 1 — All Items Complete
- [x] Smart contract: `AttendanceRegistry.sol` — soulbound ERC-1155, roles, createSession, mint
- [x] Foundry tests + deploy to Base Sepolia
- [x] Backend: session management, QR generation/verification, transaction relay
- [x] Frontend: Privy auth flow, QR scanner page, success/token confirmation screen
- [x] Backend: PostgreSQL schema (sessions, check-ins, members)
- [x] Deploy: Vercel + Railway

## Open Items (carry forward)
### Backend (non-blocking)
- LOW: `admin_roles.wallet_address` has no unique constraint
- INFO: `ADMIN_SIGNER_PRIVATE_KEY` used for both QR signing and on-chain txs — consider separate keys before mainnet
- INFO: CORS is currently open (`app.use(cors())`); restrict to Vercel domain before mainnet
- INFO: Admin middleware is DB-only; direct on-chain grants via Etherscan bypass backend gate — acceptable while DEFAULT_ADMIN_KEY is tightly held

## Local Testing Setup

### Secrets Management
All secrets live outside the project directory in `~/secrets/`. Never fill in real values inside the project.

Files:
- `~/secrets/onchain-attendance-backend.env`
- `~/secrets/onchain-attendance-frontend.env`
- `~/secrets/onchain-attendance-contract.env`

`~/secrets/` is added to `~/.gitignore_global` so it can never be committed.

### Running Locally
```bash
# Terminal 1 — backend
cd ~/Projects/onchain-attendance/backend
dotenv -e ~/secrets/onchain-attendance-backend.env -- npm run dev

# Terminal 2 — frontend
cd ~/Projects/onchain-attendance/frontend
dotenv -e ~/secrets/onchain-attendance-frontend.env -- npm run dev
```

### Wallet Setup
Contract deployed at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` (Base Sepolia)

Two wallets needed:
1. `RELAY_PRIVATE_KEY` — holds `RELAY_ROLE` on contract
2. `ADMIN_SIGNER_PRIVATE_KEY` — signs QR payloads

```bash
cast wallet new   # RELAY wallet
cast wallet new   # ADMIN wallet
```
Fund both with Base Sepolia ETH. Grant roles from deployer wallet.
