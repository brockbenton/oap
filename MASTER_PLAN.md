# MASTER_PLAN.md — Onchain Attendance Protocol

## Mission

Build an onchain attendance tracking system for a university blockchain club. Members check in at meetings and receive non-transferable attendance tokens (Soulbound Tokens / SBTs). These tokens power attendance statistics, member status tiers, and admin tooling — replacing error-prone Google Forms with a tamper-resistant, onchain alternative that doubles as a real-world Web3 onboarding experience.

---

## Why Not Real POAPs?

The POAP protocol requires manual approval per event from the POAP team, ties admin features to their dashboard, and makes programmatic querying of stats dependent on their API. Instead we use **custom soulbound ERC-1155 tokens** — same concept (non-transferable attendance badges with metadata), but we own the contract, admin roles, minting logic, and data. To members they are indistinguishable from POAPs. We call them **Attendance Tokens** or **ATs**.

---

## Core Design Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Token standard | ERC-1155 soulbound (non-transferable) | Each token type = one meeting. Batch mint support. Can't be sold/traded. |
| Chain | **Base** (Coinbase L2) | Cheap gas, EVM-compatible, strong onboarding story for new crypto users |
| Wallet UX | **Privy** (embedded wallets) | Email/Google/Discord login creates wallet under the hood — zero MetaMask required to start |
| Gas model | Backend sponsors gas (gasless for members) | Admin backend wallet pays gas. Members never touch ETH. |
| Anti-cheat | Time-windowed, admin-signed QR codes | Session payload signed by admin key, expires in N minutes, shown at physical meeting |
| Backend | Lightweight Node.js + PostgreSQL | Indexes on-chain events for fast stat queries. Sponsors gasless transactions. |
| Admin roles | On-chain `AccessControl` (OpenZeppelin) | Multiple admins, role-based, no single point of failure |

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** components
- **Privy** — wallet abstraction, social login, embedded wallets
- **viem** + **wagmi** — type-safe contract interaction
- **TanStack Query** — async state, caching

### Smart Contracts
- **Solidity ^0.8.24**
- **Foundry** — build, test, deploy
- **OpenZeppelin** — ERC-1155, AccessControl, ReentrancyGuard
- Deployed on **Base Sepolia** (testnet) → **Base Mainnet**

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Alchemy SDK** — RPC + event indexing
- **Bull** (Redis queue) — async on-chain write jobs
- Admin-signed QR payload generation + verification
- Gasless transaction relay (backend wallet sponsors mints)

### Infrastructure
- **Vercel** — frontend hosting
- **Railway** or **Render** — backend + PostgreSQL
- **Alchemy** — Base RPC + webhooks for event indexing

---

## Architecture Overview

```
Member (browser)
    │
    ├── Privy SDK (social login → embedded wallet)
    │
    ▼
Next.js Frontend
    │
    ├── /check-in       Scan QR → verify session → sign message → submit
    ├── /vault          View all attendance tokens
    ├── /stats          Personal attendance stats
    └── /admin          Admin dashboard (protected)
    │
    ▼
Node.js Backend API
    │
    ├── POST /sessions          Admin creates meeting session
    ├── GET  /sessions/:id/qr   Generate time-limited signed QR payload
    ├── POST /check-in          Verify QR sig + member sig → queue mint tx
    ├── GET  /members/:addr     Member stats (attendance %, streaks, tokens)
    ├── GET  /admin/members     All members with status
    └── GET  /admin/sessions    Session history + attendance lists
    │
    ├── Blockchain Event Indexer (Alchemy webhooks)
    │   └── Syncs TokenMinted events → PostgreSQL
    │
    └── Transaction Relay
        └── Backend wallet signs + sends mint txs to Base
    │
    ▼
AttendanceRegistry.sol (Base)
    │
    ├── createSession(sessionId, metadata)   Admin only
    ├── mint(to, sessionId)                  Relay only
    ├── balanceOf(address, sessionId)        Public read
    └── soulbound: _beforeTokenTransfer reverts on transfer
```

---

## Smart Contract Design

### `AttendanceRegistry.sol`

```
Roles (AccessControl):
  DEFAULT_ADMIN_ROLE  — can grant/revoke all roles
  ADMIN_ROLE          — can create sessions
  RELAY_ROLE          — can mint tokens (backend wallet only)

Storage:
  mapping(uint256 sessionId => Session) sessions
  struct Session { uint64 date; string name; string semester; bool active; }

Key functions:
  createSession(uint256 id, uint64 date, string name, string semester)
  closeSession(uint256 id)
  mint(address to, uint256 sessionId)           // RELAY_ROLE only
  uri(uint256 id) → IPFS JSON metadata
  _beforeTokenTransfer → revert if from != address(0)  // soulbound
```

Token metadata (IPFS):
```json
{
  "name": "Blockchain Club — April 3, 2026",
  "description": "Attendance token for meeting on April 3, 2026",
  "image": "ipfs://<club-art-cid>",
  "attributes": [
    { "trait_type": "Date", "value": "2026-04-03" },
    { "trait_type": "Semester", "value": "Spring 2026" },
    { "trait_type": "Meeting #", "value": 12 }
  ]
}
```

---

## Anti-Manipulation: QR Code Flow

```
1. Admin opens /admin/sessions → clicks "Start Check-In"
2. Backend creates session record, generates payload:
   { sessionId, expiresAt (now + 10min), nonce } signed by ADMIN_ROLE key
3. Frontend renders QR code from signed payload — displayed on projector
4. Member opens app → scans QR
5. Frontend sends payload to backend:
   - Backend verifies admin signature ✓
   - Backend verifies timestamp not expired ✓
   - Backend verifies member hasn't already checked in ✓
6. Backend asks member's Privy wallet to sign:
   "I am checking into session {sessionId} at {timestamp}"
7. Member signs (one tap — Privy handles UX)
8. Backend queues mint transaction: relay wallet → contract.mint(member, sessionId)
9. Token lands in member's wallet. Done.

Anti-cheat properties:
  - QR expires in ~10 minutes (configurable)
  - Each sessionId is single-use per address (contract enforces)
  - Payload is cryptographically signed — can't be forged
  - Admin must be physically present to generate the QR
  - Members must have a wallet tied to their identity (Privy account)
```

---

## Phases

### Phase 1 — MVP (Core Check-In)
**Goal**: Members can connect, scan a QR, and receive an attendance token.

- [x] Smart contract: `AttendanceRegistry.sol` with soulbound ERC-1155, roles, createSession, mint
- [x] Foundry tests + deploy to Base Sepolia
- [x] Backend: session management, QR generation/verification, transaction relay
- [ ] Frontend: Privy auth flow, QR scanner page, success/token confirmation screen
- [ ] Backend: basic PostgreSQL schema (sessions, check-ins, members)
- [ ] Deploy: Vercel + Railway

**Done when**: Admin creates session → QR displayed → member scans → token minted → visible in wallet.

---

### Phase 2 — Vault & Personal Stats
**Goal**: Members can see their attendance history and stats.

- [ ] `/vault` page: grid of earned attendance tokens with metadata (date, meeting name)
  - Sort by date, semester filter
  - Token card shows meeting name, date, semester badge
- [ ] `/stats` page: personal attendance statistics
  - All-time attendance %
  - Meetings attended last 30/90/180 days
  - Current streak
  - Member status tier (see Phase 3)
- [ ] Backend: aggregate queries from indexed events
- [ ] IPFS metadata upload pipeline for token images (per-semester art or generic club art)

---

### Phase 3 — Admin Dashboard
**Goal**: Admins can manage sessions, view all members, and track club health.

- [ ] `/admin/sessions` — create session, view past sessions, see who attended each one
- [ ] `/admin/members` — table of all members with:
  - Wallet address + linked social (from Privy)
  - Tokens earned
  - Attendance % (all-time, current semester)
  - Status tier
  - Last seen
- [ ] Member status tiers (configurable thresholds):
  - `General Member` — < 75% attendance
  - `Official Member` — ≥ 75% attendance
  - `Founding Member` — present for X% of all-time meetings (admin-granted)
- [ ] Export: CSV export of attendance data per session or per member
- [ ] Admin role management: grant/revoke ADMIN_ROLE on-chain from dashboard
- [ ] Attendance API endpoint: `GET /api/v1/members` → JSON of all members + stats (for future website integration)

---

### Phase 4 — Onboarding & Website Integration
**Goal**: Reduce learning curve, integrate with club website.

- [ ] Education onboarding track:
  - Step 1: Sign up with email (Privy embedded wallet — zero friction)
  - Step 2: Learn about wallets → optional: link MetaMask (earns onboarding badge)
  - Step 3: Attend first meeting → earn first AT
  - Each step earns a non-attendance badge (onboarding SBTs)
- [ ] Status symbols on club website:
  - API endpoint for website to query member status
  - Badge assets for General Member / Official Member
- [ ] Semester rollup: auto-calculate semester attendance %, display on profile
- [ ] Notification system (email via Privy): "You attended 3/4 meetings this month"

---

## Database Schema (PostgreSQL)

```sql
members        (id, wallet_address, privy_user_id, created_at)
sessions       (id, session_id_onchain, name, date, semester, created_by, closed_at)
check_ins      (id, member_id, session_id, tx_hash, checked_in_at)
token_events   (id, member_id, session_id, token_id, block_number, tx_hash, indexed_at)
admin_roles    (id, wallet_address, granted_by, granted_at, revoked_at)
```

---

## Security Considerations

- **QR payload** is signed by admin private key — never exposed to frontend
- **Relay wallet** has `RELAY_ROLE` only — cannot create sessions or change admin roles
- **Soulbound enforcement** is at contract level — not just frontend
- **Re-entrancy** guard on mint function
- **Rate limiting** on check-in endpoint (prevent spam)
- **Input validation** on all backend endpoints
- Member wallet address is their identity — Privy ties it to a real account (email/social)

---

## Open Questions / Decisions Pending

1. **QR expiry window** — 10 minutes default. Adjust based on how meetings run.
2. **Token art** — Generic club logo per semester, or unique art per meeting? (Unique is cooler but more work)
3. **Attendance % denominator** — All sessions ever, or only sessions during their membership period?
4. **What constitutes a "semester"** — Calendar-based or admin-defined?
5. **Public vs private stats** — Can anyone look up any member's attendance, or only admins + the member themselves?
6. **Mainnet timing** — Start on Base Sepolia, move to mainnet when? After semester 1?

---

## Success Metrics

- Members can check in within 30 seconds of scanning QR
- Zero duplicate check-ins per session (enforced by contract)
- Attendance stats load in < 1 second (indexed, not live chain queries)
- Admin can view full club roster with statuses in one view
- Zero gas cost to members

---

## Non-Goals (Explicitly Out of Scope)

- Token trading, marketplaces, or transferability
- Integration with any other attendance system (Google Forms, etc.)
- Mobile native app (PWA via Next.js is sufficient)
- DAO governance or token-weighted voting
- Paying members in tokens (no financial instrument)
