# MASTER_PLAN.md — Onchain Club Protocol (OCP)

## Mission

Build an onchain protocol for running clubs, starting with a university blockchain club. Members check in at meetings and receive non-transferable attendance tokens (Soulbound Tokens / SBTs). These tokens power attendance statistics, member status tiers, and admin tooling — replacing error-prone Google Forms with a tamper-resistant, onchain alternative that doubles as a real-world Web3 onboarding experience.

---

## Why Not Real POAPs?

The POAP protocol requires manual approval per event from the POAP team, ties admin features to their dashboard, and makes programmatic querying of stats dependent on their API. Instead we use **custom soulbound ERC-1155 tokens** — same concept (non-transferable attendance badges with metadata), but we own the contract, admin roles, minting logic, and data. To members they are indistinguishable from POAPs. We call them **Attendance Tokens** or **ATs**.

---

## Core Design Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Token standard | ERC-1155 soulbound (non-transferable) | Each token type = one meeting. Batch mint support. Can't be sold/traded. |
| Chain | **Base** (Coinbase L2) | Cheap gas, EVM-compatible, strong onboarding story for new crypto users |
| Wallet UX | **Privy** (embedded wallets) | Email, Google, or passkey login creates wallet under the hood — zero MetaMask required to start |
| Gas model | Backend sponsors gas (gasless for members) | Admin backend wallet pays gas. Members never touch ETH. |
| Anti-cheat | Time-windowed, admin-signed QR codes | Session payload signed by admin key, expires in N minutes, shown at physical meeting |
| Backend | Lightweight Node.js + PostgreSQL | Records check-ins for fast stat queries. Sponsors gasless transactions. |
| Admin roles | On-chain `AccessControl` (OpenZeppelin) | Multiple admins, role-based, no single point of failure |

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (plain — no component library)
- **Privy** — wallet abstraction, embedded wallets; supported login methods: **email**, **Google**, and **passkey**
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
- **Alchemy** — Base RPC endpoint (via viem)
- **Bull** (Redis queue) — async on-chain write jobs
- Admin-signed QR payload generation + verification
- Gasless transaction relay (backend wallet sponsors mints)

### Infrastructure
- **Vercel** — frontend hosting
- **Railway** or **Render** — backend + PostgreSQL
- **Alchemy** — Base RPC

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
    └── Transaction Relay
        └── Records confirmed check-ins (source of truth) + signs & sends mint txs to Base
    │
    ▼
AttendanceRegistry.sol (Base)
    │
    ├── createSession(sessionId, metadata)   Admin only
    ├── mint(to, sessionId)                  Relay only
    ├── balanceOf(address, sessionId)        Public read
    └── soulbound: _update reverts on transfer
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
  _update → revert if from != address(0)  // soulbound
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
- [x] Frontend: Privy auth flow, QR scanner page, success/token confirmation screen
- [x] Backend: basic PostgreSQL schema (sessions, check-ins, members)
- [x] Deploy: Vercel + Railway

**Done when**: Admin creates session → QR displayed → member scans → token minted → visible in wallet.

---

### Phase 2 — Admin Dashboard
**Goal**: Admins can manage sessions, display QR codes, view all members, and track club health.

**Overview**
- [x] `/admin` overview page:
  - Attendance rate over time (chart)
  - Per-session headcount
  - Week-over-week attendance delta

**Sessions & Members**
- [x] `/admin/sessions` — create session, view past sessions, see who attended each one
- [x] `/admin/sessions/:id/qr` — display live QR code for active session (auto-refreshes before expiry)
- [x] `/admin/members` — table of all members with:
  - Wallet address + linked social (from Privy)
  - Tokens earned
  - Attendance % (all-time, current semester)
  - Status tier
  - Last seen
- [x] Member status tiers (configurable thresholds):
  - `General Member` — < 75% attendance
  - `Official Member` — ≥ 75% attendance
  - `Founding Member` — present for X% of all-time meetings (admin-granted)
- [x] Export: CSV export of attendance data per session or per member
- [x] Admin role management: grant/revoke ADMIN_ROLE on-chain from dashboard
- [x] Attendance API endpoint: `GET /api/v1/members` → JSON of all members + stats

---

### Phase 3 — Vault & Personal Stats
**Goal**: Members can see their attendance history and stats.

- [x] `/vault` page: grid of earned attendance tokens with metadata (date, meeting name)
  - Sort by date, semester filter
  - Token card shows meeting name, date, semester badge
- [x] `/stats` page: personal attendance statistics
  - All-time attendance %
  - Meetings attended last 30/90/180 days
  - Current streak
  - Member status tier
- [x] Backend: aggregate queries from indexed events
- [x] IPFS metadata upload pipeline for token images (generic per-semester club art)

---

### Phase 4 — Onboarding & Member Status
**Goal**: Reduce the learning curve for new crypto users and surface member status.

- [ ] ~~Education onboarding track~~ — **Deferred (2026-11-03)**:
  - Step 1: Sign up with email (Privy embedded wallet — zero friction)
  - Step 2: Learn about wallets → optional: link MetaMask (earns onboarding badge)
  - Step 3: Attend first meeting → earn first AT
  - Each step earns a non-attendance badge (onboarding SBTs)
  - _(Stretch / post-MVP — do not pull into earlier phases without explicit approval.)_
- [x] Member status badges:
  - Badge assets for General Member / Official Member
- [x] Semester rollup: auto-calculate semester attendance %, display on profile
- [ ] ~~Notification system (email via Privy): "You attended 3/4 meetings this month"~~ — **Deferred (2026-11-03)**

---

### Phase 5 — Club DAO v1 (our club)
**Goal**: The quickest path to a **working** onchain club DAO for **our club only**, still branded OCP. Showing up earns non-transferable **Rep**, Rep is voting power, members vote for free, and officers are chosen by governance. Multi-club, approval-voting elections and Rep decay are **Phase 6 (v2)**. v1 is designed so v2 can add clubs without reworking the contracts or data model.

> "No transferability" and "no financial instrument" still hold (see **Non-Goals**): Rep is soulbound, cannot be delegated, and has no market.

> **Revision 3 (2026-11-03):** scope cut to a club-only v1 after the security review and contract audit of Revision 2 (tracker #77). Owner decisions: club-only v1; quickest path to a working product; `smart-contract/CLAUDE.md` amended; Rep protection = per-session attendee cap + officer sign-off at close.

#### Roles (only two human roles)

| Role | Who | Power |
|---|---|---|
| **Member** | Anyone holding ≥1 Attendance Token (AT) | Earns Rep, votes for free (relayed signature), can propose once over the proposal threshold (needs a little ETH). Ranked by attendance stats — **no other tiers** (the General / Official Member split is retired). |
| **Officer** | Wallets holding `ADMIN_ROLE` on the registry | Runs meetings from their own Privy wallet (create session, close + sign off attendees), sets token metadata, can pause minting for 14 days. **No extra voting power, no Rep grants.** |

System roles (not people):

| Role | Holder | Purpose |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` (registry, Rep) | `ClubTimelock` only | Officer appointments/removals, relay rotation, parameter changes, Rep grants/revokes — all via passed proposals |
| `RELAY_ROLE` (registry) | Backend relay wallet | `mint` / `mintBatch` ATs only. **Cannot create Rep.** Also submits members' signed votes (anyone may). |
| `MINTER_ROLE` (Rep) | The registry contract | Credits Rep at session close |
| Timelock `PROPOSER_ROLE` | Governor | Queue passed proposals |
| Timelock `CANCELLER_ROLE` | Governor + **guardian** (bootstrap only) | Guardian veto until the first election; auto-expires (see Bootstrap) |
| Timelock `EXECUTOR_ROLE` | `address(0)` (anyone) | Execute ready operations; OZ `GovernorTimelockControl` tracks state correctly |
| Timelock self-admin | Timelock itself (constructor `admin = address(0)`) | No external admin over the Timelock |

The backend holds **no admin key** in v1: its only on-chain power is `RELAY_ROLE` (mint ATs), and its QR signer has **no role at all**.

#### Contracts (plain deploys via `forge script` — no factory, no clones, no proxies)

```
ClubRep              OZ Votes base (not ERC-20): soulbound Rep, delegation disabled (delegates(a) == a), timestamp clock
AttendanceRegistry2  soulbound ERC-1155 ATs; officer-run sessions with attendee caps; Rep credited only at officer close
ClubGovernor         OZ Governor + Settings + CountingSimple + Votes + QuorumFraction (reachable floor) + TimelockControl
ClubTimelock         OZ TimelockController + expireGuardian()
```

| Decision | Choice | Rationale |
|---|---|---|
| Deploy model | Constructors + one `forge script` (`DeployClub.s.sol`) taking club params | Quickest; nothing to initialize or front-run. Phase 6 wraps the same contracts in a factory. |
| Rep token base | OZ `Votes` with an internal balance mapping, **not** `ERC20Votes` | No transfer/approve surface at all (wallets won't treat it as a tradable ERC-20); `getVotes` / `getPastVotes` / `getPastTotalSupply` come from audited OZ code. Read-only `balanceOf` / `totalSupply` for explorers. |
| Delegation | Disabled: `delegates(a)` returns `a`; `delegate` / `delegateBySig` revert | Votes count from the first credit with no "self-delegate first" step; no vote-buying via delegation. |
| Clock | ERC-6372 **timestamp** (`clock() = uint48(block.timestamp)`, `CLOCK_MODE() = "mode=timestamp"`) | Two small overrides; every governance duration is in seconds and maps 1:1 to UI countdowns, independent of Base block time. Not used for access control. |
| Decay | **None in v1** | Accepted risk: alumni keep voting power. Mitigated by the Timelock-only `revoke` and the club's size; epochs/decay are Phase 6. |
| Rep per check-in | Constant `REP_PER_CHECKIN = 10` | Simple, predictable thresholds. |
| Weighting | Linear | Keeps quorum-fraction math exact. |

**AttendanceRegistry2 rules (#50, #52, #59, #60):**
- `createSession(id, date, name, semester, maxAttendees, metadataCid)` — `ADMIN_ROLE`, sent from the officer's own wallet. Records `openedAt = block.timestamp`. `1 ≤ maxAttendees ≤ MAX_ATTENDEES` (300).
- **Spacing:** reverts if `openedAt < lastOpenedAt + minSessionSpacing` (default 72 h).
- **Mint window:** `mint` / `mintBatch` revert after `openedAt + mintWindow` (default 12 h), after close, or while paused.
- **AT cap:** minting stops at `maxAttendees` ATs for the session, so a leaked relay key can't flood a session beyond the cap the officer chose.
- `mint(to, id)` reverts on duplicates (unchanged); `mintBatch(to[], id)` (≤ 200 addresses) **skips** duplicates and emits per-recipient events, so one bad entry never reverts the batch. Mints call `_update` directly (no ERC-1155 receiver hook), so a contract recipient can't brick a batch.
- **Close sign-off (Rep):** `closeSession(id, address[] attendees)` — `ADMIN_ROLE`, once per session. Credits `REP_PER_CHECKIN` to each listed address that holds that session's AT; addresses must be strictly increasing (cheap uniqueness); length ≤ ATs minted. **No Rep exists until an officer signs off.** The dashboard shows the attendee list (from confirmed check-ins) for review before the officer signs.
- **Metadata:** `setBaseCid` and `setSessionMetadata(id, cid)` — `ADMIN_ROLE` (no proposal needed).
- **Pause:** `pauseMinting()` — any officer; sets `pausedUntil = now + 14 days`; each officer can pause at most once per 30 days. `unpauseMinting()` needs **two distinct officers** (or the Timelock). Pause only blocks AT minting; close/sign-off still works.
- **Officer set never empty:** `AccessControlEnumerable`; `renounceRole` / `revokeRole` on `ADMIN_ROLE` revert if they would leave zero officers.
- **Timelock-changeable params** (bounded): `minSessionSpacing` ∈ [1 h, 14 d], `mintWindow` ∈ [1 h, 48 h].

**ClubRep rules (#51, #68):**
- `mint(to, amount)` — `MINTER_ROLE` (registry) only.
- `grant(to, amount, reasonURI)` / `revoke(account, reasonURI)` — Timelock only. `revoke` burns the account's full balance (total supply updates) and flags the account so it can't be credited again unless the Timelock clears the flag.
- **Import (one-time, derived on-chain):** `importLegacy(address[] accounts, uint256[] legacySessionIds)` — deployer only, before `finalizeImport()`. Rep per account = `REP_PER_CHECKIN × Σ legacy.balanceOf(account, id)` over the given legacy session IDs (strictly increasing; each must exist on the legacy registry). Each account imports once. **The backend supplies no balances**: the import can't exceed 10 × legacy ATs by construction, and anyone can recompute it from the legacy contract.
- `finalizeImport()` — deployer only, irreversible. **`ClubGovernor.propose` reverts until the import is finalized.**
- Every balance change emits OZ's `DelegateVotesChanged`, so standard indexers (and Tally) can read it.

#### Governance parameters (constructor; changeable only by deploying a new Governor in v1)

| Param | Value | Notes |
|---|---|---|
| Voting delay | `86400` s (1 day) | Time to notice a proposal before the snapshot. |
| Voting period | `604800` s (7 days) | Always spans a weekly meeting — officers can announce "vote now". |
| Timelock min delay | `172800` s (2 days) | Window to react; guardian can cancel during bootstrap. |
| Proposal threshold | **30 Rep** (3 check-ins) | Any engaged member (or officer) with a little ETH can propose. |
| Quorum | `max(10% × supply(t), min(minQuorum, 50% × supply(t)))`, `minQuorum` = **100 Rep** (immutable) | The floor stops one member passing proposals in a tiny club; `min(…, 50%)` keeps it **always reachable**, so the club can't deadlock. Immutable, so live proposals never see a retroactive change. |
| `REP_PER_CHECKIN` | 10 (constant) | |
| `MAX_ATTENDEES` / `mintBatch` cap | 300 / 200 | |
| `minSessionSpacing` / `mintWindow` | 72 h / 12 h | Timelock-changeable within the bounds above. |
| Pause | 14 days; 1 per officer per 30 days; 2-officer unpause | Longer than a full proposal cycle (1 + 7 + 2 = 10 days), so a relay-rotation proposal fits inside one pause. |
| Guardian expiry | Deploy + 120 days | Backstop if the guardian doesn't renounce. |

#### Voting and proposals
- **Votes are free:** members sign EIP-712 `castVoteBySig` with their Privy wallet; the relay submits **one tx per vote** (no Multicall in v1, so one failure can't revert other votes) after validating the signature and simulating with `eth_call`.
- **Anyone can submit a signed vote.** The frontend checks `hasVoted` over **public RPC** (wagmi), not via the backend; if a vote hasn't landed, any officer's funded wallet can submit the member's signed vote from the UI.
- **Proposals need gas:** officers (and members who choose to fund their wallet) call `propose` directly. Templates: appoint/remove officer, grant/revoke Rep, rotate relay, change registry params, custom call. Queue/execute are also sent from funded wallets.
- **Officer elections in v1 are proposals** calling `grantRole` / `revokeRole(ADMIN_ROLE, …)` on the registry through the Timelock. Terms are one semester **by convention** (a "new term" proposal each semester). Approval voting with seat counts is Phase 6.
- **Readable signing:** the UI shows the proposal title and For/Against/Abstain before the Privy prompt; Privy confirmation prompts stay on. **Never enable Privy delegated actions / session signers** — the backend must never be able to sign for members.

#### Bootstrap (#51, #62)
1. `DeployClub.s.sol` (one broadcast): deploy Rep → registry → Timelock (`PROPOSER` = Governor, `CANCELLER` = Governor + guardian, `EXECUTOR` = `address(0)`, `admin = address(0)`) → Governor; grant the registry `MINTER_ROLE` on Rep; grant founding officers `ADMIN_ROLE`; grant the relay `RELAY_ROLE`.
2. Run `importLegacy` in batches against the legacy registry, then `finalizeImport()`.
3. Hand `DEFAULT_ADMIN_ROLE` on registry + Rep to the Timelock; the **deployer renounces everything**. A test asserts that afterwards only the Timelock holds `DEFAULT_ADMIN_ROLE`, only the Governor holds `PROPOSER`, and only Governor + guardian hold `CANCELLER`.
4. **Guardian** = a Safe held by founders — never a backend env key. It can only cancel. It renounces `CANCELLER` after the first officer-election proposal executes; as a backstop, `ClubTimelock.expireGuardian()` lets **anyone** revoke it after `guardianExpiry` (deploy + 120 days), so a malicious guardian can't veto its own removal forever.
5. The frontend shows a "Bootstrap — founders can veto" banner until the guardian is gone.

#### Keys and check-in hardening (#55, #56, #69, #72)
- **Retire** `DEFAULT_ADMIN_PRIVATE_KEY` and its code paths (`/admin/roles` grant/revoke, `setBaseCidOnChain`, `defaultAdmin*` in `lib/contract.ts`). Role changes are proposals; metadata is an officer tx.
- **New QR signing key with no on-chain role**, separate per environment. `ADMIN_SIGNER_PRIVATE_KEY` is no longer used for sessions (officers send `createSession` themselves).
- **Legacy registry:** close all sessions, revoke `RELAY_ROLE` / `ADMIN_ROLE`, and renounce `DEFAULT_ADMIN_ROLE` after the import (reads keep working; history stays visible).
- **EIP-712 QR and member check-in signatures**, domain `{name: "OCP Check-In", version, chainId, verifyingContract: registry}`, with the session ID and member address in the struct — no replay across chains (Sepolia ↔ mainnet) or registries (legacy ↔ v2, future clubs).
- **The QR rotates every 30–60 s** (`QR_TTL_MS` = 60000); the admin QR page already auto-refreshes.
- **Live officer checks:** sensitive routes (QR, sessions, exports, PII) read `hasRole(ADMIN_ROLE)` on-chain per request (cache TTL ≤ 30 s), so a removed officer loses access immediately.

#### Backend changes
- **Relay sender (#59):** one sender with a nonce manager that sends without waiting, replaces stuck txs (gas bump / cancel) and reconciles receipts; check-ins coalesced into `mintBatch` per session; statuses `PENDING → SUBMITTED → CONFIRMED` (after N confirmations) / `FAILED`.
- **Schema (v2-ready, single club):** add `Session.registryAddress` with `@@unique([registryAddress, sessionIdOnchain])`, `maxAttendees`, `openedAt`, `repCreditedAt`; new indexed tables `Proposal`, `Vote` (`@@unique([proposalId, voter])`), `RepEvent`; populate `TokenEvent`; drop `AdminRole` (the chain is the truth). Contract addresses come from config (Phase 6 moves them to a `Club` row). Reviewed by `db-schema-reviewer`.
- **Indexer:** one worker, single cursor, confirmation depth; indexes registry, Rep, Governor and Timelock events.
- **Close sign-off API:** returns the session's confirmed attendees (sorted addresses) for the officer to review and pass to `closeSession`.
- **Stats:** remove `tierFor` / `OFFICIAL_MEMBER_THRESHOLD`; members ranked by attendance % then Rep. Real Rep/rank/leaderboard replace `frontend/lib/mock/gamification.ts`.
- **Funding:** keep the relay balance small with alerts (exists); runbook for topping up the relay and officer wallets.

#### Frontend changes
- **Officer meeting flow:** "Start meeting" sends `createSession` from the officer's Privy wallet (showing the ETH balance and a top-up link), then the rotating QR; "End meeting" shows the attendee list → `closeSession(id, attendees)`. Pause / unpause buttons.
- **Governance UI:** proposal list/detail, templates, create (funded wallets), vote buttons (`signTypedData` → relay), live tally, quorum ("TBD" while Pending — `quorum(snapshot)` reverts before the snapshot), timelock countdown, queue/execute, "your vote hasn't landed — have an officer submit it" from public-RPC `hasVoted`.
- **Officer roster** (from `RoleGranted` / `RoleRevoked`), bootstrap banner, Rep on profile and leaderboard.
- **Replace mocks:** `gamification.ts` → Rep/rank; `rewards.ts` → drop or rebuild from real data; `meeting.ts` → real sessions.

#### Risks & honest guarantees

**Attendance is attested off-chain.** The backend (QR + relay) decides who gets an AT, and an officer decides whose AT earns Rep. The contracts **bound** the damage; they don't prove presence.

| Risk | v1 mitigation | Residual |
|---|---|---|
| Leaked relay key | Can only mint ATs into an open session, within its 12 h window and `maxAttendees` cap. **Cannot create Rep** — Rep needs an officer's close sign-off. Officers pause minting; a proposal rotates the relay within one 14-day pause. | Fake ATs (cosmetic) up to the cap until paused. |
| Rogue officer | Can sign off only addresses holding that session's AT, ≤ `maxAttendees`, one session per 72 h. Removal by proposal; guardian veto during bootstrap. | Can credit Rep to friends who got ATs in their session. Social + governance remedy. |
| Compromised backend | No admin key; the QR key has no role; the relay can't create Rep or forge votes. | Can censor or delay relayed votes (any officer can submit a member's signed vote instead) and can issue QRs. |
| Malicious guardian | Cancel only; auto-expires after 120 days. | Can veto proposals during bootstrap. |
| Sybil | One Privy account per member; officers review attendees at close; Timelock `revoke`. | No `.edu` gating in v1 (Phase 6). |
| Alumni power (no decay) | Small club; Timelock `revoke`. | Accepted for v1. |
| Low turnout | 7-day votes spanning a meeting; quorum floor always reachable. | Tune after the pilot. |

#### Review traceability (tracker #77)

| Issue | v1 / v2 | How v1 handles it |
|---|---|---|
| #50 Rep mass-mint | **v1** | `maxAttendees` caps ATs and Rep; Rep only via the officer's `closeSession(id, attendees)`. |
| #51 Guardian import | **v1** | `importLegacy` derives Rep from legacy balances on-chain (≤ 10× ATs by construction), deployer-only, then `finalizeImport`; `propose` gated; guardian = Safe, cancel-only, auto-expiry. |
| #52 Deadlock | **v1** | 14-day pause (2-officer unpause) instead of a revoke; quorum floor always reachable; immutable `minQuorum`; relay rotation fits inside one pause. |
| #53 Election hardening | v2 | v1 elections are plain proposals; approval voting, seats and nominations are Phase 6. |
| #54 Optimizer / size | **v1** | Optimizer on (200 runs); `forge build --sizes` in 5a. |
| #55 Legacy keys / QR signer | **v1** | `DEFAULT_ADMIN_PRIVATE_KEY` paths removed; role-less QR key; legacy roles revoked/renounced. |
| #56 EIP-712 check-in binding | **v1** | QR + member signatures bound to `chainId` + registry; `Session.registryAddress`. |
| #57 Per-club PII | v2 | Single club; current admin gating stays. |
| #58 Relay censorship | **v1** | Public-RPC `hasVoted`; officers can submit members' signed votes; a paymaster is Phase 6. |
| #59 Batching / sender | **v1** | `mintBatch` skips duplicates; no Multicall; nonce manager with replacement; SUBMITTED status. |
| #60 Officer-set integrity | **v1** | `AccessControlEnumerable`; never zero officers; changes only via the Timelock. No Elections contract. |
| #61 Epoch scheduling | v2 | No epochs in v1. |
| #62 Timelock roles | **v1** | Specified above, plus the handoff test. |
| #63 `proposeBySig` | v2 | Proposals need gas in v1. |
| #64 Officer-signed ops replay | v2 | Moot in v1 — officers send their own txs. |
| #65 Clone / factory safety | v2 | No factory in v1. |
| #66 Parameters table | **v1** | Table above, with bounds. |
| #67 `smart-contract/CLAUDE.md` | **v1** | Amended in this PR (owner-approved). |
| #68 ClubRep spec | **v1** | OZ `Votes` base, no transfer surface, `revoke` burns + flags, standard events. |
| #69 Live officer checks | **v1** | Per-request `hasRole` on sensitive routes. |
| #70 Readable signing | **v1** | Readable vote UI before the prompt, Privy prompts on, no delegated/session signers. |
| #71 `.edu` gating | v2 | Phase 6. |
| #72 QR rotation | **v1** | 30–60 s, `QR_TTL_MS` = 60000. |
| #73 Gas budgets | v2 | v1 keeps relay balance alerts + a top-up runbook. |
| #74 Low-severity hardening | **v1** | Metadata CID preview before the officer tx; identity pinned to the embedded wallet. Slug reservation is Phase 6. |
| #75 Gas optimizations | v2 | Not needed for a working product. |
| #76 Plan text fixes | **v1** | This revision. |

#### Sub-phases (implementation order)

**5a — Contracts**
- [x] Amend `smart-contract/CLAUDE.md` for Phase 5 v1 (owner-approved, #67); optimizer on in `foundry.toml`
- [ ] `ClubRep` (OZ `Votes`, soulbound, no delegation, timestamp clock, minter/grant/revoke, `importLegacy` + `finalizeImport`)
- [ ] `AttendanceRegistry2` (sessions with `maxAttendees`, spacing, mint window, `mint`/`mintBatch` without the receiver hook, `closeSession(id, attendees)` Rep credit, officer metadata, pause/2-officer unpause, never-zero officers, bounded params)
- [ ] `ClubGovernor` (reachable quorum floor, `propose` gated on import) + `ClubTimelock` (`expireGuardian`)
- [ ] `DeployClub.s.sol` + `ImportLegacy.s.sol`; handoff role-assertion test
- [ ] Tests: unit + fuzz (caps, windows, pause rules, close sign-off, import math, quorum floor, zero-officer guard); `forge build --sizes` on all four contracts
- [ ] `contract-auditor` + `security-reviewer` pass on the code
- [ ] Deploy to Base Sepolia; `addresses.json` + ABI sync

**5b — Backend**
- [ ] Relay sender (nonce manager, replacement, SUBMITTED), `mintBatch` coalescing
- [ ] EIP-712 QR + check-in signatures, role-less QR key, 60 s TTL, live officer checks
- [ ] Remove `DEFAULT_ADMIN_PRIVATE_KEY` paths; officer-tx flows replace the backend's `createSession` / `closeSession`
- [ ] Schema migration (`registryAddress`, session caps, `Proposal` / `Vote` / `RepEvent`, drop `AdminRole`) — `db-schema-reviewer`
- [ ] Indexer for registry/Rep/Governor/Timelock events; close sign-off attendee API; vote relay endpoint (validate + simulate)
- [ ] Remove General/Official tiers; Rep/rank/leaderboard APIs

**5c — Frontend**
- [ ] Officer meeting flow (create tx, rotating QR, attendee review + close tx, pause/unpause, ETH balance)
- [ ] Governance UI (proposals, templates, gasless voting, public-RPC `hasVoted`, queue/execute, officer-submit fallback)
- [ ] Officer roster, bootstrap banner, real Rep/leaderboard; remove `lib/mock/*`

**5d — Sepolia pilot**
- [ ] `DeployClub` + `importLegacy` against the legacy registry; retire legacy roles
- [ ] Run real meetings on v2; at least one proposal and one officer-election proposal end to end; the guardian renounces after the election

**5e — Audit**
- [ ] Fix pilot findings; external review if budget allows

**5f — Mainnet**
- [ ] Mainnet deploy + import (explicit owner go-ahead, as Open Question 6)

---

### Phase 6 — Multi-club + v2 governance (backlog)
**Goal**: Open OCP to other clubs and upgrade governance once v1 has run a real semester. Not started until the owner approves.

- [ ] **ClubFactory** deploying the per-club set (OZ `*Upgradeable` bases used non-upgradeably, `_disableInitializers`, `isClub` registry, backend trusts only factory events, selector allowlist) — #65
- [ ] **Multi-tenant backend**: `Club` / `ClubMember` tables, `clubId` (expand → backfill → contract), `/clubs/:slug` scoping with a Prisma extension or RLS, per-club PII scoping — #57
- [ ] **Approval-voting `ClubElections`** (stored seat count, nomination threshold, one nomination per address, deterministic tiebreak, max officers, holdover) — #53
- [ ] **Epochs + Rep decay** (`2·current + previous`, scheduled rollover with notice, 60/180-day bounds, no mid-election rollover) — #61
- [ ] **Gasless proposals** (`proposeBySig`, separate nonce spaces) and replay-safe officer-signed ops — #63, #64
- [ ] **Independent vote sponsor** (paymaster) for self-submits — #58 (remainder)
- [ ] **`.edu` gating** with a per-club unique email hash — #71
- [ ] **Per-club gas budgets**, founder-signed `createClub`, allowlist owner off the backend — #73
- [ ] Club creation wizard, directory, per-club branding, slug reservation — #74 (remainder)
- [ ] Gas optimizations — #75

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

### Current (Phases 1–4)

The backend holds three keys. Only the relay key is mint-only:

| Env var | On-chain role | Used for | Blast radius if leaked |
|---|---|---|---|
| `RELAY_PRIVATE_KEY` | `RELAY_ROLE` | `mint` (check-in queue) | Can mint ATs into any session that is still open — sessions an admin forgets to close stay mintable indefinitely |
| `ADMIN_SIGNER_PRIVATE_KEY` | `ADMIN_ROLE` | `createSession` / `closeSession`, **and** signing QR payloads | Can create sessions and forge valid QR codes; combined with the relay key, can fabricate attendance |
| `DEFAULT_ADMIN_PRIVATE_KEY` (optional) | `DEFAULT_ADMIN_ROLE` | `grantRole` / `revokeRole(ADMIN_ROLE)` from the dashboard, `setBaseCid` on IPFS publish | **Full control of the contract** — can grant itself or anyone every role, including `RELAY_ROLE` |

- All three keys live only in backend env — never exposed to the frontend. If `DEFAULT_ADMIN_PRIVATE_KEY` is unset, role management and metadata publishing are disabled and must be done from the deployer wallet.
- **Soulbound enforcement** is at contract level (`_update` reverts on transfer; `setApprovalForAll` reverts) — not just frontend
- **One token per member per session** enforced on-chain and by the `check_ins` unique constraint
- **Re-entrancy** guard on mint
- **Rate limiting** on the check-in endpoint (`checkInLimiter`)
- **Input validation** on all backend endpoints
- Member wallet address is their identity — Privy ties it to a real account (email/Google/passkey). Nothing currently prevents one person from holding multiple accounts.
- **Known gaps:** no on-chain mint deadline (see relay row); the backend is a single trusted operator for attendance — it mints without on-chain proof of presence.

### Phase 5 (v1) target

Rep is voting power, so these guarantees matter. What v1 actually guarantees (details in Phase 5):

- **Attendance is attested off-chain.** The backend (QR signer + relay) decides who gets an AT; an officer decides whose AT earns Rep. The contracts bound the damage — they do not prove presence.
- **No backend admin key.** The Timelock is the only `DEFAULT_ADMIN_ROLE` holder on the registry and Rep. `DEFAULT_ADMIN_PRIVATE_KEY` and its code paths are removed, and legacy-registry roles are revoked/renounced after the import.

| Key / holder | On-chain role (v1) | If leaked / malicious |
|---|---|---|
| Relay (`RELAY_PRIVATE_KEY`, backend) | `RELAY_ROLE`: mint ATs only | ATs into open sessions only, within the 12 h window and the officer-set `maxAttendees` cap. **Cannot create Rep.** Can delay or drop relayed votes (anyone, e.g. an officer, can submit a member's signed vote). Officers pause minting (14 days); a proposal rotates the relay. |
| QR signer (new key, backend) | **None** | Can forge QR codes for open sessions; only matters combined with the relay, and still bounded by the cap and officer sign-off. |
| Officer (Privy wallet) | `ADMIN_ROLE` | Create sessions (≥ 72 h apart), credit Rep to holders of that session's AT (≤ cap), set metadata, pause. Removed by proposal. |
| Guardian (founders' Safe) | Timelock `CANCELLER` only | Veto during bootstrap; auto-expires after 120 days. |
| Deployer | None after handoff | One-time `importLegacy` derived from legacy balances on-chain, finalized before any proposal. |

- **Votes can't be forged** by the backend: they are member-signed EIP-712 messages. Privy delegated actions / session signers must never be enabled.
- **Check-in signatures are EIP-712**, bound to `chainId` and the registry — no replay across chains or registries. QR codes rotate every 30–60 s.
- **Officer access is checked live** on-chain on sensitive backend routes.
- **Soulbound** ATs and Rep: no transfer, approval or delegation surface.
- **Not in v1:** `.edu`/sybil gating beyond one Privy account per member, Rep decay, multi-club isolation (Phase 6).
- Run `contract-auditor` + `security-reviewer` on the 5a code; external review before mainnet if budget allows.

---

## Open Questions / Decisions Pending

1. **QR expiry window** — ✅ **Resolved (Phase 5):** QR rotates every 30–60 s (`QR_TTL_MS` = 60000) because ATs now lead to voting power.
2. **Token art** — ✅ **Resolved:** Generic club logo per semester for MVP (Phase 3). Unique per-meeting art is a post-launch stretch goal, revisit for semester 2.
3. **Attendance % denominator** — ✅ **Resolved:** All confirmed sessions to date (club-wide), so every member is measured against the same meeting count and the vault / stats / admin views never disagree. Chosen over membership-period to keep a single shared definition; revisit if it unfairly penalizes mid-semester joiners.
4. **What constitutes a "semester"** — ✅ **Resolved:** Admin-defined free-text label set per session (the `semester` field); the "current" semester is the most recent session's label. Not calendar-derived, so summer/irregular terms just work. v1 has no on-chain epochs (Rep doesn't decay); on-chain epochs are a Phase 6 item.
5. **Public vs private stats** — ✅ **Resolved:** A member's vault and stats are public by wallet address but carry no PII — email / linked social is never exposed on public endpoints (stripped from `GET /members`; served only behind the admin gate). On-chain attendance is already public, so this adds no disclosure.
6. **Mainnet timing** — ✅ **Decided (pending owner sign-off):** Stay on Base Sepolia for the pilot; migrate to Base Mainnet after semester 1, once check-in volume and relay-gas costs are validated. Requires an explicit go-ahead before the mainnet deploy.
7. **DAO pivot (Phase 5)** — ✅ **Decided:** On-chain governance (Rep-weighted voting, officer elections via proposals) is in scope for **our club** in v1; multi-club is Phase 6. Revision 3 applies the review tracker (#77).
8. **Phase 5 v1 defaults to confirm during 5a** — Pending: `minSessionSpacing` 72 h (blocks a second Rep-earning meeting in the same week — raise to allow workshops?); `mintWindow` 12 h; proposal threshold 30 Rep; `minQuorum` 100 Rep; guardian Safe signers; who funds officer wallets (club or founders) and the top-up amount.

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
- Transferable or purchasable governance power — voting power (Rep) is earned only, never bought, sold, or delegated for money
- Paying members in tokens (no financial instrument)
