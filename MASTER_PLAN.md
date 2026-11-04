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
**Goal**: The quickest path to a **working** onchain club DAO for **our club only**, still branded OCP. Showing up earns non-transferable **Rep**, Rep is voting power, members vote for free, and officers are chosen by governance. Participation-earned, gradually decaying Rep is **required in v1**. Multi-club and approval-voting elections remain **Phase 6 (v2)**. v1 is designed so v2 can add clubs without reworking the contracts or data model.

> "No transferability" and "no financial instrument" still hold (see **Non-Goals**): Rep is soulbound, cannot be delegated, and has no market.

> **Revision 3.3 (owner decision, 2026-11-03): Colony-inspired participation reputation.** Each verified eligible attendance earns **10 Rep**, after two-officer sign-off. Current influence gradually decays; continued participation maintains it. This supersedes Revision 3's "no decay in v1" and Revision 3.1/3.2's supply-based session cap, per-member weekly cap, club-wide weekly budget and deferred claims. Those limits are removed. QR validity (5 minutes), open-session warnings (6 h), organizer-set attendee caps, two-officer minimum, and governance-only role changes remain. A **180-day half-life is a provisional engineering default**, to validate during 5a, not a separately approved final numeric policy. See #50, #61, #68 and tracker #77.

#### Participation reputation (v1)

- **Earn:** each unique, eligible attendee on a confirmed session list earns `REP_PER_CHECKIN = 10` Rep. AT minting alone creates no voting power. There is no pro-rata reduction, supply-based award cap, weekly issuance budget, per-member weekly cap, or deferred-credit balance. `maxAttendees` still bounds each session; a 300-attendee session awards 3,000 nominal Rep in full.
- **Decay:** contribution `r` recognized at time `t0` has current weight `r × 2^(-(t - t0) / H)` at `t ≥ t0`. Sum the decayed contributions for current influence. `H = 180 days` is the provisional half-life (100 → 50 → 25 Rep after 0/180/360 days without new credit). Decay is gradual and independent of semesters, officer actions, keeper jobs or scheduled epoch rollovers. Participation adds influence; inactivity reduces it without erasing history.
- **Policy:** Rep is nontransferable, non-purchasable, nondelegable and has no cash redemption entitlement. Treasury payments or future financial rewards require a separate budget; Rep issuance is not treasury spending. This borrows Colony's participation/decay principle, not its entire protocol or token-payment mechanism.
- **History:** lifetime attendance and ATs never decay. Show lifetime contribution history separately from current voting influence; pending officer approval has zero voting power.
- **Growth:** issuance follows verified attendance rather than a fixed club-size ceiling. Scale transaction work through bounded pages. Revisit the 300-attendee implementation limit through a reviewed contract change if actual events outgrow it; never silently reduce the promised 10 Rep because the club grew. More participants can dilute existing members' share of total influence. Repeated equal participation approaches a steady balance rather than increasing influence forever.
- **Trust:** decay is not Sybil resistance. Two colluding officers can approve fabricated sessions repeatedly, so there is **no club-wide issuance-rate bound**. Preserve attendee verification, distinct-officer sign-off, public review lists, anomaly alerts, and governance revoke/blocklist. Do not claim a quantitative weekly collusion limit. This changed threat model must be reviewed before deployment (#50).

#### Roles (only two human roles)

| Role | Who | Power |
|---|---|---|
| **Member** | Anyone holding ≥1 Attendance Token (AT) | Earns Rep, votes for free (relayed signature), can propose once over the proposal threshold (needs a little ETH). Ranked by current decayed Rep, with lifetime attendance shown separately — **no other tiers** (the General / Official Member split is retired). |
| **Officer** | Wallets holding `ADMIN_ROLE` on the registry (**at least 2 at all times**) | Runs meetings from their own Privy wallet (create session, close it with the attendee list), **confirms or rejects another officer's attendee list** (two-officer Rep sign-off), sets token metadata, can pause minting for 14 days. **No extra voting power, no Rep grants.** |

System roles (not people):

| Role | Holder | Purpose |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` (registry, Rep) | `ClubTimelock` only — set in the constructors; **cannot be revoked, renounced or granted to anyone else** | Officer appointments/removals, relay rotation, parameter changes, Rep grants/revokes — all via passed proposals. Locked so governance can't lock itself out. |
| `RELAY_ROLE` (registry) | Backend relay wallet | `mint` / `mintBatch` ATs only. **Cannot create Rep.** Also submits members' signed votes (anyone may). |
| `MINTER_ROLE` (Rep) | The registry contract | Credits Rep after two-officer confirmation |
| Timelock `PROPOSER_ROLE` | Governor only (granted by the deployer during `DeployClub`) | Queue passed proposals. The guardian **never** gets PROPOSER. |
| Timelock `CANCELLER_ROLE` | Governor + **guardian** (bootstrap only; granted to the guardian by the `ClubTimelock` constructor) | Guardian veto until the first election; auto-expires (see Bootstrap) |
| Timelock `EXECUTOR_ROLE` | `address(0)` (anyone) | Execute ready operations; OZ `GovernorTimelockControl` tracks state correctly |
| Timelock admin | Timelock itself; the **deployer is a temporary admin during `DeployClub` only** and renounces as the last step | OZ `TimelockController` only grants PROPOSER/CANCELLER to `proposers[]` at construction, and the Governor is deployed after the Timelock, so a temporary admin is needed to grant the Governor its roles (audit B1). |

The backend holds **no admin key** in v1: its only on-chain power is `RELAY_ROLE` (mint ATs), and its QR signer has **no role at all**.

#### Contracts (plain deploys via `forge script` — no factory, no clones, no proxies)

```
ClubRep              decay-aware IVotes (not ERC-20): soulbound Rep, no delegation, timestamp clock + historical checkpoints
AttendanceRegistry2  soulbound ERC-1155 ATs; officer-run sessions (no time limits); 10 Rep per eligible attendance after two-officer sign-off
ClubGovernor         OZ Governor + Settings + CountingSimple + Votes + QuorumFraction (reachable floor) + TimelockControl, bounded setters
ClubTimelock         OZ TimelockController + guardian CANCELLER in constructor + bounded updateDelay + expireGuardian()
```

| Decision | Choice | Rationale |
|---|---|---|
| Deploy model | Constructors + one `forge script` (`DeployClub.s.sol`) taking club params | Quickest; nothing to initialize or front-run. Phase 6 wraps the same contracts in a factory. |
| Rep token base | Decay-aware `IVotes` implementation using reviewed checkpoint/math components, **not** `ERC20Votes` | Ordinary OZ `Votes` checkpoints do not decay automatically. Implement and audit current and historical account/total queries together; no transfer/approve surface. Read-only `balanceOf` / `totalSupply` mean current decayed influence. |
| Delegation | Disabled: `delegates(a)` returns `a`; `delegate` / `delegateBySig` revert | Votes count from the first credit with no "self-delegate first" step; no vote-buying via delegation. |
| Clock | ERC-6372 **timestamp** (`clock() = uint48(block.timestamp)`, `CLOCK_MODE() = "mode=timestamp"`) | Two small overrides; every governance duration is in seconds and maps 1:1 to UI countdowns, independent of Base block time. Not used for access control. |
| Decay | **Gradual exponential decay in v1**; provisional half-life 180 days | Maintains influence through participation and reduces inactive influence. Fixed half-life per deployment; validate precision and governance liveness in 5a (#61, #68). |
| Rep per check-in | `REP_PER_CHECKIN = 10` nominal Rep (v1 constant, fixed-point internally) | Full award per eligible attendance; no supply-dependent reduction. |
| Rep sign-off | **Two officers** (one closes with the list, a different one confirms); permissionless paged credit | No single backend or officer key can create attendance Rep. No weekly Rep budget or deferral. |
| Session timing | **No time limits** on creating sessions or QR codes; a session stays open until an officer closes it (never auto-closes on-chain). Off-chain warning after N hours open (default 6 h) | Owner decisions 2026-11-03. Attendance integrity relies on attendee caps, distinct-officer review and monitoring; no club-wide issuance-rate limit is claimed. |
| Weighting | Linear | Keeps quorum-fraction math exact. |

**AttendanceRegistry2 rules (#50, #52, #59, #60):**
- `createSession(id, date, name, semester, maxAttendees, metadataCid)` — `ADMIN_ROLE`, sent from the officer's own wallet. **No timing restrictions**: sessions can be created at any time and stay open until an officer closes them. `1 ≤ maxAttendees ≤ MAX_ATTENDEES` (300) caps the number of ATs in the session (a count, not a time limit). **The organizer chooses `maxAttendees` when creating each session** (the UI pre-fills a suggestion from recent attendance).
- **Minting:** `mint` / `mintBatch` revert after close, at the `maxAttendees` cap, or while paused. ATs mint instantly and **carry no Rep**.
- `mint(to, id)` reverts on duplicates (unchanged); `mintBatch(to[], id)` (≤ 200 addresses) **skips** duplicates and emits per-recipient events, so one bad entry never reverts the batch. Mints call `_update` directly (no ERC-1155 receiver hook), so a contract recipient can't brick a batch.
- **Two-officer Rep sign-off (owner decision 2026-11-03, #50):**
  1. `closeSession(id, address[] attendees)` — officer A. Stops minting, stores only `keccak256(abi.encode(attendees))` and `count` (one slot, no per-address storage) and emits the full list in `SessionClosed`. Addresses strictly increasing (cheap uniqueness), each must hold the session's AT, `count ≤` ATs minted. Rep state → **Pending**. Nothing is credited; pending Rep has **zero voting power** and **never expires**.
  2. `confirmSessionRep(id)` — a **different** officer B (`msg.sender != closer`), or the Timelock (governance override). Fixes `perAttendee = REP_PER_CHECKIN` and a common `repRecognizedAt = block.timestamp` for the whole list. State → **Confirmed**. No budget check, reservation or pro-rata math. Empty lists complete with zero credit.
  3. `creditSessionRep(id, attendees, from, to)` — **anyone** (normally the relay or an officer). Re-submits the full list (checked against the hash), credits the approved 10 nominal Rep per attendee with decay measured from `repRecognizedAt`, and advances a sequential, non-overlapping cursor. State → **Credited** when the cursor reaches `count`. Replays cannot double-credit. Until a page lands its attendees have zero additional power; delayed pages receive only the remaining decayed weight and never rewrite earlier vote snapshots. Expose awaiting-credit status separately from awaiting approval.
  4. `rejectSessionRep(id)` — **any** officer (or the Timelock) while Pending. State → **Rejected**: no Rep for that session, ever. ATs stay.
  - *Why hash + cursor:* storing 300 addresses costs ~6.6M gas in SSTOREs and a single-tx credit of 300 attendees is ~15–18M gas (audit estimate). The hash is one slot, the list lives in calldata and the event log, and the expensive Rep checkpoints are paginated (~100 per tx).
- **Attendance eligibility:** keep unique AT ownership, sorted/unique final attendee lists, `maxAttendees`, and two distinct officers. Review suspicious sessions and repeated/fake accounts. Do not introduce session-spacing or earning limits silently; any additional anti-farming policy must be explicit and must not create a hidden award backlog.
- **Metadata:** `setBaseCid` and `setSessionMetadata(id, cid)` — `ADMIN_ROLE` (no proposal needed).
- **Pause:** `pauseMinting()` — any officer; sets `pausedUntil = now + 14 days`; each officer can pause at most once per 30 days. `unpauseMinting()` needs **two distinct officers** (or the Timelock). Pause only blocks AT minting; close/confirm/reject/credit still work.
- **Officer floor (2):** `AccessControlEnumerable`; the `_revokeRole` override (covers both `revokeRole` and `renounceRole`) reverts if `ADMIN_ROLE` would drop below **2** holders. `DeployClub` requires ≥ 2 founding officers. Proposal templates **grant the new officer before revoking the old one**.
- **Locked Timelock admin:** `_grantRole(DEFAULT_ADMIN_ROLE, x)` reverts unless `x == timelock` (immutable); `_revokeRole(DEFAULT_ADMIN_ROLE, timelock)` reverts. Same on `ClubRep`.
- **Retired Rep parameters:** remove `repFloor`, `capBps`, `memberWeeklyCap`, `weeklyFloor`, `weeklyBps`, weekly counters, deferred balances and `claimDeferredRep` from the v1 design and implementation checklist. Attendee-count and transaction-page limits remain.

**ClubRep rules (#51, #68):**
- Constructor `(timelock, legacyRegistry, importer)`: the Timelock is `DEFAULT_ADMIN_ROLE` from the start (locked, as on the registry); `setRegistry(registry)` is a one-time importer call that grants the registry `MINTER_ROLE`.
- Attendance credit is `MINTER_ROLE` (registry) only, called from `creditSessionRep`, carrying nominal amount and the session's immutable recognition timestamp. It must not reset the age of an account's existing Rep. The implementation API is finalized with #68.
- `grant(to, amount, reasonURI)` / `revoke(account, reasonURI)` — Timelock only. Grants decay from execution and do not refresh existing Rep. `revoke` removes the account's remaining decayed balance (total power updates at the same timestamp; past snapshots stay unchanged) and flags the account so it can't be credited again unless the Timelock clears the flag. Clearing the flag does not restore revoked Rep. Paged credit must skip-and-emit for blocked recipients without stalling other attendees, and advance the cursor so a blocked award cannot be replayed after clearing.
- **Import (one-time, derived on-chain):** `importLegacy(address[] accounts, uint256[] legacySessionIds)` — deployer only, before `finalizeImport()`. Nominal Rep per account = `REP_PER_CHECKIN × Σ legacy.balanceOf(account, id)` over the given legacy session IDs (strictly increasing; each must exist on the legacy registry **and be closed** — `getSession(id).active == false`, checked on-chain, so no further legacy ATs can be minted into an imported session). Each account imports once. All imported credits share a fixed migration recognition timestamp set at deployment (not the transaction time of each import batch), then decay like new credits. This is a one-time bootstrap recognition of legacy attendance, not reconstructed historical voting power. Lifetime AT history remains unchanged. The legacy registry is frozen **before** the import (Bootstrap step 0). **The backend supplies no balances**: the import can't exceed 10 × legacy ATs by construction, and anyone can recompute it from the legacy contract.
- `finalizeImport()` — deployer only, irreversible. **`ClubGovernor.propose` reverts until the import is finalized.**
- **Historical voting contract:** implement `IVotes` and ERC-6372 timestamp semantics. `getVotes(a)` / `balanceOf(a)` return current decayed power; `getPastVotes(a, t)` evaluates the state at historical timestamp `t`; `getPastTotalSupply(t)` uses the same decay, precision and recognition rules for all accounts. `totalSupply()` is current decayed power, not lifetime awards. Proposal threshold uses past decayed power at `clock()-1`; voting weight and quorum use the proposal snapshot. Later decay, credit, grants, revokes or blocklist changes cannot alter an earlier snapshot.
- **Precision and performance:** represent Rep in fixed-point units (proposed 18 decimals; 10 Rep means `10 × 10^18` units) so decay does not immediately floor small balances away. Define deterministic rounding, dust-to-zero, overflow/underflow and long-inactivity behavior. Account and total power must agree within an explicitly tested rounding tolerance; quorum/threshold values use the same units. Current/historical reads and credits must not iterate over all members or unbounded attendance history. A normalized accumulator/checkpoint design is a candidate, not an already audited implementation.
- **Decay configuration:** fix `H` in each deployment for v1; no mutable setter that could reinterpret historical votes. A later change needs a reviewed migration or a separately specified piecewise schedule preserving history. Semester labels and officer elections do not reset decay.
- **Events and indexing:** emit `DelegateVotesChanged`-compatible events for explicit credit/grant/revoke changes plus recognition timestamps and nominal amounts for reconstruction. Passive decay produces no transaction or per-second event. Indexers must compute or read power at a timestamp; an event-only cached balance is stale. Do not promise generic Tally/indexer support until tested.
- **Implementation gates (#61, #68):** unit, fuzz and reference-model tests cover half-life examples, continuous/monotone inactivity decay, old Rep retaining its age on new credit, delayed pages, same-timestamp updates, import batches, revocation/blocking, historical totals and fixed snapshots. Test gas bounds after long inactivity. Resolve proposal-threshold recovery when all members fall below the configured threshold, and zero/dust supply quorum behavior, before deployment; the current 30/100 Rep settings are provisional, not a proof of governance liveness.

#### Governance parameters (set in constructors; governance can change them only within on-chain bounds)

Every setter OZ exposes to governance is overridden with bounds (audit B3) — e.g. `updateQuorumNumerator(100)` would otherwise make quorum unreachable.

| Param | Default | On-chain bounds (where enforced) | Notes |
|---|---|---|---|
| Voting delay | `86400` s (1 day) | [1 h, 7 d] (`_setVotingDelay` override) | Time to notice a proposal before the snapshot. |
| Voting period | `604800` s (7 days) | [3 d, 14 d] (`_setVotingPeriod` override) | Spans a weekly meeting — officers can announce "vote now". |
| Timelock min delay | `172800` s (2 days) | [1 d, 7 d] (`ClubTimelock.updateDelay` override) | Window to react; guardian can cancel during bootstrap. |
| Proposal threshold | **30 Rep**, provisional | [10, 1,000] Rep (`_setProposalThreshold` override; scaled units) | Uses decayed power at `clock()-1`; 3 check-ins may be below 30 after decay. Inactivity recovery must be resolved in 5a (#52, #61). |
| Quorum numerator | 10% | [5%, 30%] (`_updateQuorumNumerator` override) | |
| Quorum | `max(numerator × supply(t), min(minQuorum, 50% × supply(t)))`, `minQuorum` = **100 Rep** (immutable, provisional) | `minQuorum` fixed; scaled fixed-point units | `supply(t)` is decayed total at the proposal snapshot. Clamp keeps the floor ≤50% for positive supply; test rounding/dust and define zero-supply handling. This alone does not guarantee proposal-threshold liveness. |
| `REP_PER_CHECKIN` | 10 nominal Rep | v1 constant; fixed-point internally | Every eligible attendance receives the full award, then decays. |
| Decay half-life `H` | **180 days, provisional** | Positive immutable deployment parameter; validate value and numeric range in 5a | Owner approved gradual decay, not a final half-life. No retrospective decay-policy setter. |
| `MAX_ATTENDEES` / `mintBatch` / credit page | 300 / 200 / ~100 | constants | Credit pages sized to stay well under 10M gas. |
| Pause | 14 days; 1 per officer per 30 days; 2-officer unpause | constants | Longer than a full proposal cycle (1 + 7 + 2 = 10 days), so a relay-rotation proposal fits inside one pause. |
| Officer floor | 2 | constant | |
| Guardian expiry | Deploy + 120 days | immutable | Backstop if the guardian doesn't renounce. |

#### Voting and proposals
- **Votes are free:** members sign EIP-712 `castVoteBySig` with their Privy wallet; the relay submits **one tx per vote** (no Multicall in v1, so one failure can't revert other votes) after validating the signature and simulating with `eth_call`.
- **Anyone can submit a signed vote.** The frontend checks `hasVoted` over **public RPC** (wagmi), not via the backend; if a vote hasn't landed, any officer's funded wallet can submit the member's signed vote from the UI.
- **Proposals need gas:** officers (and members who choose to fund their wallet) call `propose` directly. Templates: appoint/remove officer (**grant the new officer before revoking the old one**, so the 2-officer floor never blocks a swap), grant/revoke Rep, rotate relay, change parameters within bounds, custom call. Queue/execute are also sent from funded wallets.
- **Officer elections in v1 are proposals** calling `grantRole` / `revokeRole(ADMIN_ROLE, …)` on the registry through the Timelock. Terms are one semester **by convention** (a "new term" proposal each semester). Approval voting with seat counts is Phase 6.
- **Readable signing:** the UI shows the proposal title and For/Against/Abstain before the Privy prompt; Privy confirmation prompts stay on. **Never enable Privy delegated actions / session signers** — the backend must never be able to sign for members.

#### Bootstrap (#51, #62) — order matters
0. **Freeze the legacy registry first** (legacy admin key): close every open legacy session, revoke all `RELAY_ROLE` and `ADMIN_ROLE` holders, renounce `DEFAULT_ADMIN_ROLE`. After this nobody can mint legacy ATs, so the "≤ 10× legacy ATs" import bound actually holds (audit B2). Reads keep working.
1. **`DeployClub.s.sol`:**
   - `ClubTimelock(minDelay, proposers = [], executors = [address(0)], admin = deployer, guardian, guardianExpiry)` — the constructor grants the guardian **`CANCELLER_ROLE` only**.
   - `ClubRep(timelock, legacyRegistry, importer = deployer)`; `AttendanceRegistry2(timelock, rep, foundingOfficers ≥ 2, relay, params)`; `rep.setRegistry(registry)` (one-time).
   - `ClubGovernor(rep, timelock, params)`; the deployer (temporary Timelock admin) grants the Governor `PROPOSER_ROLE` + `CANCELLER_ROLE`.
2. **`ImportLegacy.s.sol`:** `importLegacy` in batches (each legacy session must be closed, checked on-chain), then `finalizeImport()`. `ClubGovernor.propose` reverts until then.
3. **Handoff (last):** the deployer renounces Timelock `DEFAULT_ADMIN_ROLE`. The registry and Rep never had a deployer admin (Timelock from the constructor); the importer right ends at `finalizeImport`.
4. **Tests:** a deploy-script test asserts the order (legacy frozen → import finalized → deployer renounces), and afterwards: the deployer holds **no role** on the Timelock, registry or Rep; only the Timelock holds `DEFAULT_ADMIN_ROLE` on registry + Rep and can't lose it; PROPOSER = Governor only; CANCELLER = Governor + guardian; EXECUTOR = `address(0)`; the guardian has no PROPOSER.
5. **Guardian** = a Safe held by founders — never a backend env key. It can only cancel. It renounces `CANCELLER` after the first officer-election proposal executes; as a backstop, `ClubTimelock.expireGuardian()` lets **anyone** revoke it after `guardianExpiry` (deploy + 120 days), so a malicious guardian can't veto its own removal forever.
6. The frontend shows a "Bootstrap — founders can veto" banner until the guardian is gone.

#### Keys and check-in hardening (#55, #56, #69, #72)
- **Retire** `DEFAULT_ADMIN_PRIVATE_KEY` and its code paths (`/admin/roles` grant/revoke, `setBaseCidOnChain`, `defaultAdmin*` in `lib/contract.ts`). Role changes are proposals; metadata is an officer tx.
- **New QR signing key with no on-chain role**, separate per environment. `ADMIN_SIGNER_PRIVATE_KEY` is no longer used for sessions (officers send `createSession` themselves).
- **Legacy registry:** frozen **before** the import (Bootstrap step 0): close all sessions, revoke `RELAY_ROLE` / `ADMIN_ROLE`, renounce `DEFAULT_ADMIN_ROLE` (reads keep working; history stays visible).
- **EIP-712 QR and member check-in signatures**, domain `{name: "OCP Check-In", version, chainId, verifyingContract: registry}`, with the session ID and member address in the struct — no replay across chains (Sepolia ↔ mainnet) or registries (legacy ↔ v2, future clubs).
- **Each QR is valid for 5 minutes** (`QR_TTL_MS` = 300000) and the admin QR page **auto-refreshes it before it expires** (owner decision 2026-11-03). This is how long one QR image stays valid, **not** a limit on when QR codes or sessions can be created. **Trade-off:** a photo of the QR shared in a group chat works remotely for up to 5 minutes. Mitigated by the organizer-set `maxAttendees`, the two-officer Rep sign-off (officers see the attendee list and anomaly flags) and attendance verification. There is no weekly Rep issuance cap.
- **Live officer checks:** sensitive routes (QR, sessions, exports, PII) read `hasRole(ADMIN_ROLE)` on-chain per request (cache TTL ≤ 30 s), so a removed officer loses access immediately.

#### Backend changes
- **Relay sender (#59):** one sender with a nonce manager that sends without waiting, replaces stuck txs (gas bump / cancel) and reconciles receipts; check-ins coalesced into `mintBatch` per session; statuses `PENDING → SUBMITTED → CONFIRMED` (after N confirmations) / `FAILED`.
- **Schema (v2-ready, single club):** add `Session.registryAddress` with `@@unique([registryAddress, sessionIdOnchain])`, `maxAttendees`, `repStatus` (`NONE / PENDING / CONFIRMED / REJECTED / CREDITED`), `attendeesHash`, `closedBy`, `confirmedBy`; new indexed tables `Proposal`, `Vote` (`@@unique([proposalId, voter])`), `RepEvent`; populate `TokenEvent`; drop `AdminRole` (the chain is the truth). Contract addresses come from config (Phase 6 moves them to a `Club` row). Reviewed by `db-schema-reviewer`.
- **Indexer:** one worker, single cursor, confirmation depth; indexes registry, Rep, Governor and Timelock events.
- **Open-session warning (owner decision 2026-11-03):** a backend job flags sessions still open after `OPEN_SESSION_WARN_HOURS` (default **6 h**, env-configurable, off-chain only) and alerts the officers. It's a nudge — sessions never auto-close on-chain.
- **Rep sign-off support:** an API returns the session's confirmed attendees (sorted addresses) for officer A's `closeSession`; a **pending-review queue** for the other officers with **anomaly flags** (attendance far above the trailing median of recent sessions, many first-time wallets, wallets created in the last 24 h, list differs from the backend's confirmed check-ins); an **alert to all officers** when a session is anomalous; after confirmation the relay submits `creditSessionRep` pages, with their common recognition timestamp; retries must preserve decay age and avoid duplicate credit. No deferred-claim job exists.
- **Stats:** remove `tierFor` / `OFFICIAL_MEMBER_THRESHOLD`; current influence ranked by decayed Rep at a common as-of timestamp, with lifetime attendance stats separate. Cached Rep must be timestamped and recomputed/read as time passes even if no events arrive. Real Rep/rank/leaderboard replace `frontend/lib/mock/gamification.ts`.
- **Funding:** keep the relay balance small with alerts (exists); runbook for topping up the relay and officer wallets.

#### Frontend changes
- **Officer meeting flow:** "Start meeting" asks the organizer for **`maxAttendees`** (pre-filled from recent attendance) and sends `createSession` from the officer's Privy wallet (showing the ETH balance and a top-up link), then the auto-refreshing 5-minute QR; "End meeting" shows the attendee list → `closeSession(id, attendees)` (Rep pending). Other officers get a **review queue** (list, anomaly flags) → `confirmSessionRep` / `rejectSessionRep`. Pause / unpause buttons.
- **Organizer dashboard:** a list of **open sessions** with how long each has been open, and a warning badge after 6 h (configurable) — "still open, close it?".
- **Member view:** after a meeting, the AT shows immediately with "**Rep pending**" (officer confirmation), then "approved — credit processing" if pages are outstanding, then current decayed Rep. Explain "+10 Rep per verified attendance" and gradual decay with an as-of time; show lifetime attendance separately. Do not show deferred-weekly-credit states.
- **Governance UI:** proposal list/detail, templates, create (funded wallets), vote buttons (`signTypedData` → relay), live tally, quorum ("TBD" while Pending — `quorum(snapshot)` reverts before the snapshot), timelock countdown, queue/execute, "your vote hasn't landed — have an officer submit it" from public-RPC `hasVoted`.
- **Officer roster** (from `RoleGranted` / `RoleRevoked`), bootstrap banner, Rep on profile and leaderboard.
- **Replace mocks:** `gamification.ts` → Rep/rank; `rewards.ts` → drop or rebuild from real data; `meeting.ts` → real sessions.

#### Risks & honest guarantees

**Attendance is attested off-chain.** The backend (QR + relay) decides who gets an AT, and **two officers** decide whose AT earns Rep. The contracts enforce per-session counts and distinct-officer approval; they do not prove presence or bound aggregate issuance across sessions.

| Risk | v1 mitigation | Residual |
|---|---|---|
| Leaked relay key | Can only mint ATs into open sessions, up to each session's `maxAttendees`; ATs carry no Rep. **Cannot create Rep.** Officers pause minting, reject that session's pending Rep, and rotate the relay by proposal (fits inside one 14-day pause). | Fake ATs (cosmetic) until paused. |
| Single rogue officer | Alone can only close a session with a list (Pending) or reject one. Rep needs a **different** officer's confirmation. | Can grief by rejecting honest sessions → removal by proposal; the Timelock can `grant` Rep to affected members. |
| **Two colluding officers** | Each approved attendee needs the session AT; each session is bounded by `maxAttendees` (≤300) × 10 nominal Rep. Public lists and anomaly alerts aid detection; governance can remove officers and revoke/block fraudulent Rep, and the bootstrap guardian can cancel proposals. | **No aggregate issuance-rate bound:** repeated fabricated sessions can create enough fresh Rep to capture governance before removal. Decay does not prevent this. Two colluders can unpause each other; pause blocks AT minting only, not already-pending confirmations. Threat-model review required before deployment (#50). |
| Compromised backend | No admin key; the QR key has no role; the relay can't create Rep or forge votes. | Can censor or delay relayed votes (any officer can submit a member's signed vote instead) and can issue QRs. |
| Malicious guardian | Cancel only; auto-expires after 120 days. | Can veto proposals during bootstrap. |
| Sybil / farming | Unique check-in per account/session; two-officer attendee verification, anomaly flags; Timelock revoke/blocklist. | Privy accounts do not prove unique people. No weekly earning cap; decay does not stop active farming. `.edu` gating is Phase 6. |
| Remote check-in via QR photo | Organizer-set `maxAttendees`; two-officer attendee review and anomaly flags. | A shared photo works for up to 5 minutes (QR TTL); presence remains an off-chain attestation. |
| Inactive-member influence | Gradual decay in v1 (provisional 180-day half-life); AT history is permanent. | Influence decreases rather than disappearing immediately; a long break can also make the proposal threshold unreachable. Review liveness and tune before deployment. |
| Low turnout | 7-day votes spanning a meeting; quorum uses decayed snapshot supply with a reachable floor for positive supply. | Proposal-threshold recovery and zero/dust-supply behavior are explicit 5a gates (#52, #61). |

#### Review traceability (tracker #77)

| Issue | v1 / v2 | How v1 handles it |
|---|---|---|
| #50 Rep mass-mint | **v1** | Two-officer approval, unique AT holders and organizer-set `maxAttendees`; full 10 nominal Rep per eligible attendance. Supply-based session/weekly caps and deferred claims removed; review unbounded cross-session collusion risk. |
| #51 Guardian import | **v1** | Legacy registry frozen first; `importLegacy` derives Rep from legacy balances on-chain over **closed** sessions only (≤ 10× ATs), deployer-only, then `finalizeImport` before the handoff; `propose` gated; guardian = Safe, CANCELLER only (constructor), auto-expiry. |
| #52 Deadlock | **v1** | 14-day mint pause (2-officer unpause); positive-supply snapshot quorum clamp; immutable `minQuorum`. Inactivity/zero-supply proposal recovery must be resolved in 5a. Pause does not block pending confirmations. |
| #53 Election hardening | v2 | v1 elections are plain proposals; approval voting, seats and nominations are Phase 6. |
| #54 Optimizer / size | **v1** | Optimizer on (200 runs); `forge build --sizes` in 5a. |
| #55 Legacy keys / QR signer | **v1** | `DEFAULT_ADMIN_PRIVATE_KEY` paths removed; role-less QR key; legacy roles revoked/renounced. |
| #56 EIP-712 check-in binding | **v1** | QR + member signatures bound to `chainId` + registry; `Session.registryAddress`. |
| #57 Per-club PII | v2 | Single club; current admin gating stays. |
| #58 Relay censorship | **v1** | Public-RPC `hasVoted`; officers can submit members' signed votes; a paymaster is Phase 6. |
| #59 Batching / sender | **v1** | `mintBatch` skips duplicates; no Multicall; nonce manager with replacement; SUBMITTED status. |
| #60 Officer-set integrity | **v1** | `AccessControlEnumerable`; `_revokeRole` guard keeps **≥ 2 officers**; templates grant before revoke; changes only via the Timelock. No Elections contract. |
| #61 Gradual decay | **v1** | Continuous, time-based decay; immutable provisional half-life, fixed historical snapshots, no officer-controlled epoch rollover. Semester/election scheduling stays separate. |
| #62 Timelock roles | **v1** | Deployer is a temporary Timelock admin that grants the Governor PROPOSER + CANCELLER and renounces last; guardian gets CANCELLER in the constructor; Timelock admin locked on registry + Rep; handoff test asserts the deployer holds no role. |
| #63 `proposeBySig` | v2 | Proposals need gas in v1. |
| #64 Officer-signed ops replay | v2 | Moot in v1 — officers send their own txs. |
| #65 Clone / factory safety | v2 | No factory in v1. |
| #66 Parameters table | **v1** | Bounded governance setters; retired Rep caps removed; half-life and fixed-point units documented; defaults and inactivity recovery validated in 5a. |
| #67 `smart-contract/CLAUDE.md` | **v1** | Amended in this PR (owner-approved). |
| #68 ClubRep spec | **v1** | Decay-aware IVotes, consistent historical account/total power, no transfer surface, revoke/blocklist, timestamped indexing. Ordinary OZ Votes is insufficient by itself. |
| #69 Live officer checks | **v1** | Per-request `hasRole` on sensitive routes. |
| #70 Readable signing | **v1** | Readable vote UI before the prompt, Privy prompts on, no delegated/session signers. |
| #71 `.edu` gating | v2 | Phase 6. |
| #72 QR validity | **v1** | Owner decision: each QR valid **5 minutes** (`QR_TTL_MS` = 300000), auto-refreshed before expiry; trade-off stated in Keys and check-in hardening. |
| #73 Gas budgets | v2 | v1 keeps relay balance alerts + a top-up runbook. |
| #74 Low-severity hardening | **v1** | Metadata CID preview before the officer tx; identity pinned to the embedded wallet. Slug reservation is Phase 6. |
| #75 Gas optimizations | v2 | Not needed for a working product. |
| #76 Plan text fixes | **v1** | This revision. |

#### Sub-phases (implementation order)

**5a — Contracts**
- [x] Amend `smart-contract/CLAUDE.md` for Phase 5 v1 (owner-approved, #67); optimizer on in `foundry.toml`
- [ ] `ClubRep` (decay-aware IVotes, soulbound, no delegation, timestamp clock + historical account/total checkpoints, reviewed fixed-point decay math, locked Timelock admin, minter/grant/revoke, common-timestamp legacy import + finalize)
- [ ] `AttendanceRegistry2` (sessions with `maxAttendees` and no time limits, `mint`/`mintBatch` without the receiver hook, two-officer sign-off `closeSession` → `confirmSessionRep` / `rejectSessionRep` → paged `creditSessionRep`, full 10 nominal Rep per attendee with common recognition timestamp, officer metadata, pause/2-officer unpause, 2-officer floor, locked Timelock admin, bounded params)
- [ ] `ClubGovernor` (reachable quorum floor, bounded setters, `propose` gated on import) + `ClubTimelock` (guardian CANCELLER in constructor, bounded `updateDelay`, `expireGuardian`)
- [ ] `DeployClub.s.sol` + `ImportLegacy.s.sol` (freeze legacy → deploy → import → finalize → deployer renounces); handoff/order test
- [ ] Tests: unit + fuzz + reference model (AT cap, pause rules, sign-off state machine incl. same-officer confirm revert, full 10-Rep awards regardless of supply/session size, replay-safe paging and delayed-page decay, half-life/precision/history/total invariants, new credit preserves old age, common-timestamp legacy import, revoke/blocklist, snapshot quorum, long-inactivity recovery, zero/dust supply, setter bounds, 2-officer floor, locked admin); **gas test: close + confirm + paged credit for 300 attendees and historical vote reads after long inactivity; every tx < 10M gas**; `forge build --sizes` on all four contracts
- [ ] `contract-auditor` + `security-reviewer` pass on the code
- [ ] Deploy to Base Sepolia; `addresses.json` + ABI sync

**5b — Backend**
- [ ] Relay sender (nonce manager, replacement, SUBMITTED), `mintBatch` coalescing
- [ ] EIP-712 QR + check-in signatures, role-less QR key, 5-min TTL with auto-refresh, live officer checks; open-session warning job (`OPEN_SESSION_WARN_HOURS`, default 6)
- [ ] Remove `DEFAULT_ADMIN_PRIVATE_KEY` paths; officer-tx flows replace the backend's `createSession` / `closeSession`
- [ ] Schema migration (`registryAddress`, session caps, `Proposal` / `Vote` / `RepEvent`, drop `AdminRole`) — `db-schema-reviewer`
- [ ] Indexer for registry/Rep/Governor/Timelock events; attendee API for close; pending-review queue + anomaly flags + officer alerts; `creditSessionRep` paging after confirmation; decay-aware timestamped reads/cache refresh; vote relay endpoint (validate + simulate)
- [ ] Remove General/Official tiers; Rep/rank/leaderboard APIs

**5c — Frontend**
- [ ] Officer meeting flow (organizer sets `maxAttendees`, create tx, auto-refreshing 5-min QR, close tx with attendee list, second-officer review queue with confirm/reject, pause/unpause, ETH balance); open-sessions list with 6 h warning; member pending-approval / approved-awaiting-credit states; current decayed influence + separate lifetime attendance
- [ ] Governance UI (proposals, templates, gasless voting, public-RPC `hasVoted`, queue/execute, officer-submit fallback)
- [ ] Officer roster, bootstrap banner, real Rep/leaderboard; remove `lib/mock/*`

**5d — Sepolia pilot**
- [ ] Freeze the legacy registry, then `DeployClub` + `importLegacy` + `finalizeImport`, then the deployer renounces
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
- **Rep decay is in v1**, tracked by #61/#68. The earlier `2·current + previous` epoch model is superseded; do not reintroduce officer-controlled rollover or semester resets. Future decay-policy migrations require a separately reviewed design.
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

- **Attendance is attested off-chain.** The backend (QR signer + relay) decides who gets an AT; **two different officers** decide whose AT earns Rep. The contracts enforce attendee counts and two-officer sign-off, but do not prove presence or cap issuance across repeated sessions.
- **No backend admin key.** The Timelock is the only `DEFAULT_ADMIN_ROLE` holder on the registry and Rep, and that role can't be revoked or transferred. Every governance-changeable parameter has on-chain bounds. `DEFAULT_ADMIN_PRIVATE_KEY` and its code paths are removed, and legacy-registry roles are revoked/renounced after the import.

| Key / holder | On-chain role (v1) | If leaked / malicious |
|---|---|---|
| Relay (`RELAY_PRIVATE_KEY`, backend) | `RELAY_ROLE`: mint ATs only | ATs into open sessions only, up to each session's `maxAttendees`. **Cannot create Rep** (ATs carry none). Can delay or drop relayed votes (anyone, e.g. an officer, can submit a member's signed vote). Officers pause minting (14 days) and reject affected pending Rep; a proposal rotates the relay. |
| QR signer (new key, backend) | **None** | Can forge QR codes for open sessions; only matters combined with the relay, and still bounded by the cap and officer sign-off. |
| One officer (Privy wallet) | `ADMIN_ROLE` | Create sessions any time, close with an attendee list (Pending), reject pending lists, set metadata, pause. **Cannot create Rep alone.** Removed by proposal. |
| Two colluding officers | `ADMIN_ROLE` ×2 | Can approve 10 nominal Rep per listed AT holder, up to `maxAttendees` per session, repeatedly with **no weekly issuance bound**; can unpause each other. Decay does not stop capture by fresh fraudulent Rep. Pause does not block pending confirmations. Review this residual risk before deployment (#50). |
| Guardian (founders' Safe) | Timelock `CANCELLER` only | Veto during bootstrap; auto-expires after 120 days. |
| Deployer | Temporary Timelock admin during `DeployClub` only; none after handoff | Grants the Governor its Timelock roles; runs the one-time `importLegacy` (closed legacy sessions only, derived on-chain), finalized before it renounces. |

- **Votes can't be forged** by the backend: they are member-signed EIP-712 messages. Privy delegated actions / session signers must never be enabled.
- **Check-in signatures are EIP-712**, bound to `chainId` and the registry — no replay across chains or registries. Each QR is valid for **5 minutes** (auto-refreshed): a photo of it works remotely for up to 5 minutes, bounded by `maxAttendees`, the two-officer sign-off and attendee verification (not a club-wide Rep budget).
- **Rep reflects participation:** 10 nominal Rep per eligible attendance after two-officer approval, with gradual time decay and fixed proposal snapshots. No supply-based session reduction, weekly Rep budgets, deferred balances or claims. Treasury spending is separate. Decay is not anti-Sybil protection.
- **Officer access is checked live** on-chain on sensitive backend routes.
- **Soulbound** ATs and Rep: no transfer, approval or delegation surface.
- **Not in v1:** `.edu`/sybil gating beyond Privy accounts, multi-club isolation (Phase 6).
- Run `contract-auditor` + `security-reviewer` on the 5a code; external review before mainnet if budget allows.

---

## Open Questions / Decisions Pending

1. **QR expiry window** — ✅ **Resolved (owner, 2026-11-03):** each QR is valid for 5 minutes (`QR_TTL_MS` = 300000) and auto-refreshes before expiry; remote use of a photo is bounded by `maxAttendees`, two-officer sign-off and attendee verification (not a club-wide Rep budget).
2. **Token art** — ✅ **Resolved:** Generic club logo per semester for MVP (Phase 3). Unique per-meeting art is a post-launch stretch goal, revisit for semester 2.
3. **Attendance % denominator** — ✅ **Resolved:** All confirmed sessions to date (club-wide), so every member is measured against the same meeting count and the vault / stats / admin views never disagree. Chosen over membership-period to keep a single shared definition; revisit if it unfairly penalizes mid-semester joiners.
4. **What constitutes a "semester"** — ✅ **Resolved:** Admin-defined free-text label set per session (the `semester` field); the "current" semester is the most recent session's label. Not calendar-derived, so summer/irregular terms just work. Rep decays continuously by elapsed time in v1; semester labels and election terms do not reset or roll over balances.
5. **Public vs private stats** — ✅ **Resolved:** A member's vault and stats are public by wallet address but carry no PII — email / linked social is never exposed on public endpoints (stripped from `GET /members`; served only behind the admin gate). On-chain attendance is already public, so this adds no disclosure.
6. **Mainnet timing** — ✅ **Decided (pending owner sign-off):** Stay on Base Sepolia for the pilot; migrate to Base Mainnet after semester 1, once check-in volume and relay-gas costs are validated. Requires an explicit go-ahead before the mainnet deploy.
7. **DAO pivot (Phase 5)** — ✅ **Decided:** On-chain governance (Rep-weighted voting, officer elections via proposals) is in scope for **our club** in v1; multi-club is Phase 6. Revision 3 applies the review tracker (#77).
8. **Phase 5 v1 reputation** — ✅ **Decided (owner, 2026-11-03):** Colony-inspired participation-earned influence with gradual decay in **v1**; full 10 nominal Rep per verified eligible attendance; two-officer sign-off; no supply-based session cap, per-member weekly cap, club-wide weekly budget or deferred claims. Keep 2 officers minimum, QR TTL 5 min, 6 h off-chain open-session warning and organizer-set `maxAttendees`. **Provisional for 5a validation:** half-life 180 days (immutable per deployment), fixed-point implementation/rounding, proposal threshold 30 Rep, `minQuorum` 100 Rep, inactivity/zero-supply recovery and collusion threat model. Guardian Safe signers and officer-wallet funding remain to be settled before deployment.

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

