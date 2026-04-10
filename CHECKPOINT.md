# CHECKPOINT — 2026-04-08

## Current Phase
Phase 1 — Core MVP ✅ COMPLETE

## Last Completed
Phase 1 Item 6: **Deploy — Vercel + Railway**

### Code changes
- `backend/package.json` — build script now runs `prisma generate && tsc` (generates Prisma client before compiling, required on Railway since node_modules aren't cached)
- `backend/railway.toml` — Railway deployment config:
  - Build: `npm ci && npm run build`
  - Start: `npx prisma migrate deploy && node dist/index.js` (runs migrations before server starts)
  - Healthcheck: `GET /health` (already implemented in `src/index.ts`)

### Remaining manual steps (user action required)

#### Railway (Backend + PostgreSQL)
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
   ```
6. Deploy — Railway will run `npm ci && npm run build` then `npx prisma migrate deploy && node dist/index.js`
7. Note the Railway backend URL (e.g. `https://onchain-attendance-backend.up.railway.app`)

#### Vercel (Frontend)
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

#### Post-deploy smoke test
1. Visit the Vercel URL — home page should load with Privy login
2. `GET /health` on Railway URL — should return `{"status":"ok"}`
3. Admin: create a session → get QR → scan with phone → check-in → confirm token minted

## Phase 1 — All Items Complete
- [x] Smart contract: `AttendanceRegistry.sol` — soulbound ERC-1155, roles, createSession, mint
- [x] Foundry tests + deploy to Base Sepolia
- [x] Backend: session management, QR generation/verification, transaction relay
- [x] Frontend: Privy auth flow, QR scanner page, success/token confirmation screen
- [x] Backend: PostgreSQL schema (sessions, check-ins, members)
- [x] Deploy: Vercel + Railway

## Next Phase
Phase 2 — Vault & Personal Stats
- `/vault` page: grid of earned attendance tokens with metadata
- `/stats` page: personal attendance statistics
- Backend aggregate queries from indexed events
- IPFS metadata upload pipeline

## Open Items (carry forward)
### Backend (non-blocking)
- LOW: `admin_roles.wallet_address` has no unique constraint
- INFO: `ADMIN_SIGNER_PRIVATE_KEY` used for both QR signing and on-chain txs — consider separate keys before mainnet
- INFO: CORS is currently open (`app.use(cors())`); restrict to Vercel domain before mainnet

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
