# CHECKPOINT — 2026-03-31

## Current Phase
Phase 1 — Core MVP

## Last Completed
Phase 1 Item 4: **Frontend — Privy auth flow, QR scanner page, success/token confirmation screen**
- Next.js 14 project scaffolded in `frontend/` (App Router, TypeScript strict, Tailwind)
- Privy v3 + TanStack Query providers in `AppProviders.tsx`
- Home page (`/`) with connect button and sign-in CTA
- Check-in page (`/check-in`) with auth guard (redirects to `/` if unauthenticated)
- `QrScanner.tsx` — html5-qrcode camera scanner (lazy loaded, SSR-safe)
- `CheckInFlow.tsx` — full scan → sign → submit → success/error flow
- Typed API client (`lib/api/client.ts`) with `credentials: 'omit'`
- Check-in API call (`lib/api/check-in.ts`) — POST /api/v1/check-in
- `.env.example` with all required vars
- `tsc --noEmit` passes, `next build` passes clean

Phase 1 Item 5: **Backend PostgreSQL schema** — already completed as part of Item 3 (`prisma/schema.prisma`)

## Remaining Phase 1 Items
- [ ] Deploy: Vercel + Railway

## Frontend Files Created
```
frontend/
  .env.example
  app/
    layout.tsx                  Root layout with AppProviders
    page.tsx                    Home/landing page (Privy login CTA)
    globals.css                 Tailwind base styles (from create-next-app)
    check-in/
      page.tsx                  QR scanner page (auth-gated)
  components/
    providers/
      AppProviders.tsx          Privy + TanStack Query providers
    shared/
      ConnectButton.tsx         Sign-in/out button using usePrivy
    features/
      check-in/
        CheckInFlow.tsx         Full check-in state machine (scan→sign→submit→confirm)
        QrScanner.tsx           html5-qrcode camera scanner component
  lib/
    api/
      client.ts                 Base fetch wrapper (ApiRequestError, credentials: omit)
      check-in.ts               submitCheckIn() typed wrapper
      queryKeys.ts              TanStack Query key constants
    contracts/
      abi.ts                    AttendanceRegistry ABI (read-only subset)
      addresses.ts              getContractAddress() from env
  types/
    index.ts                    QRPayload, QREnvelope, Session, CheckInResponse, API wrappers
```

## Check-In Flow (user perspective)
1. User visits `/`, signs in via Privy (email / Google / Discord)
2. Privy creates embedded wallet automatically
3. User navigates to `/check-in`
4. Camera opens, user points at projected QR
5. QR decoded → sessionId validated (numeric string, max 78 chars)
6. Privy sign modal: `"I am checking into session {id} as {addr} at {ts}"`
7. POST `/api/v1/check-in` with `{ qrPayload, memberSignature, signedAt }` + Bearer identity token
8. Success screen: "You're checked in! Token minting..."

## In Progress
- `feat/backend-session-checkin-relay` branch (backend PR #2) still open, awaiting merge

## Decisions Made This Session
- **Privy v3 embeddedWallets config**: `ethereum.createOnLogin` (nested, not top-level `createOnLogin`)
- **SSR guard in AppProviders**: `typeof window === 'undefined'` check prevents Privy from initializing during SSR/static generation (Privy validates app ID at render time, throws on empty string)
- **`force-dynamic`** on `/` and `/check-in` pages: prevents static prerendering
- **sessionId validation**: `/^\d+$/` regex + max 78 chars before signing (prevents QR-injection into signed message)
- **`credentials: 'omit'`** on all API fetches: explicit, prevents cookie attachment if frontend/backend ever share origin
- **Error message truncation**: `slice(0, 200)` on all user-facing error strings from backend

## Security Issues Addressed (Frontend)
| Severity | Issue | Fix |
|---|---|---|
| LOW | Unvalidated sessionId from QR before signing | `/^\d+$/` regex + length check |
| LOW | No explicit credentials policy on fetch | `credentials: 'omit'` added |
| MEDIUM (defense-in-depth) | Raw server error message rendered | Truncated to 200 chars |

## Open Items (carry forward)
### Backend (non-blocking, from PR #2)
- LOW: `admin_roles.wallet_address` has no unique constraint
- INFO: `ADMIN_SIGNER_PRIVATE_KEY` used for both QR signing and on-chain txs — consider separate keys before mainnet

### Phase 1 Remaining
- **Deploy** (Phase 1 final item): Vercel (frontend) + Railway (backend + PostgreSQL)

## Next Up
Phase 1 Item 6: **Deploy — Vercel + Railway**

## Blockers
None. Frontend `tsc --noEmit` and `next build` both pass clean.

---

## Local Testing Setup

### Secrets Management
All secrets live outside the project directory in `~/secrets/`. Never fill in real values inside the project.

Files:
- `~/secrets/onchain-attendance-backend.env` — copied from `backend/.env.example`
- `~/secrets/onchain-attendance-frontend.env` — copied from `frontend/.env.example`
- `~/secrets/onchain-attendance-contract.env` — moved from `smart-contract/.env`

`~/secrets/` is added to `~/.gitignore_global` so it can never be committed.

### Running Locally
```bash
# Install dotenv-cli if needed
npm install -g dotenv-cli

# Terminal 1 — backend
cd ~/Projects/onchain-attendance/backend
dotenv -e ~/secrets/onchain-attendance-backend.env -- npm run dev

# Terminal 2 — frontend
cd ~/Projects/onchain-attendance/frontend
dotenv -e ~/secrets/onchain-attendance-frontend.env -- npm run dev

# Forge commands
cd ~/Projects/onchain-attendance/smart-contract
dotenv -e ~/secrets/onchain-attendance-contract.env -- ~/.foundry/bin/forge script ...
```

### API Keys Needed
| Key | File | Notes |
|---|---|---|
| `PRIVY_APP_ID` + `PRIVY_APP_SECRET` | backend + frontend | Rotate secret — was exposed in a conversation |
| `ALCHEMY_API_KEY` | backend + contract | Same key can be used for both; rotate as precaution |
| `ALCHEMY_WEBHOOK_SECRET` | backend | For webhook callbacks |
| `BASESCAN_API_KEY` | contract | For contract verification; no need to rotate |
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `REDIS_URL` | backend | Redis connection string (default: `redis://localhost:6379`) |

### Wallet Setup
Contract is already deployed at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` — no redeploy needed.

Two new wallets are required:
1. `RELAY_PRIVATE_KEY` — submits check-in transactions on-chain
2. `ADMIN_SIGNER_PRIVATE_KEY` — signs QR code payloads

Steps:
```bash
# Generate two new wallets
cast wallet new   # → RELAY wallet
cast wallet new   # → ADMIN wallet
```

- Fund both with Base Sepolia ETH (faucet) for gas
- Grant roles on the existing contract by calling role-granting functions from the deployer wallet
- TODO: look up exact `cast send` commands from contract source

### Infrastructure
- PostgreSQL must be running; run `npx prisma migrate dev` inside `backend/` on first setup
- Redis must be running locally
