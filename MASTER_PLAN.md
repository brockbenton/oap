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

- [ ] Education onboarding track:
  - Step 1: Sign up with email (Privy embedded wallet — zero friction)
  - Step 2: Learn about wallets → optional: link MetaMask (earns onboarding badge)
  - Step 3: Attend first meeting → earn first AT
  - Each step earns a non-attendance badge (onboarding SBTs)
  - _(Stretch / post-MVP — do not pull into earlier phases without explicit approval.)_
- [x] Member status badges:
  - Badge assets for General Member / Official Member
- [x] Semester rollup: auto-calculate semester attendance %, display on profile
- [ ] Notification system (email via Privy): "You attended 3/4 meetings this month"

---

### Phase 5 — Multi-Club DAO (Onchain Club Protocol)
**Goal**: Turn the single-club app into **Onchain Club Protocol (OCP)** — any club can deploy its own onchain org where showing up earns non-transferable **Rep**, Rep is voting power, and officers are elected onchain. Members stay gasless end to end.

> "No transferability" and "no financial instrument" still hold (see **Non-Goals**): Rep is soulbound, cannot be delegated, and has no market.

> **Revision 2 (2026-11-02):** this section has been rewritten to apply the architect review. Every finding is mapped below.

#### Architect review (2026-11-02) — changes applied

| ID | Finding | Where / how addressed |
|---|---|---|
| **B1** | Guardian as Timelock PROPOSER = full, persistent control | *Bootstrap → handoff*: guardian is **CANCELLER only** + a guardian-only `importRep` disabled at handoff. `endBootstrap()` lives in `ClubTimelock`. Test: after handoff no address but the Timelock holds an admin role on any of the 5 contracts. |
| **B2** | `startEpoch` snapshot manipulation | *Rep → Epochs*: epoch start is always `block.timestamp`; `now ≥ lastStart + minEpochLength` enforced onchain (default 90 days, Timelock-only to change, floor 60 days). |
| **B3** | Unlimited Rep via session spam | *Registry v2*: `minSessionSpacing` (default 12 h) between Rep-bearing sessions per club + per-session mint deadline `openedAt + mintWindow` (default 24 h); `mint` reverts after. |
| **B4** | `setBaseCid` becomes a 10-day proposal | *Registry v2*: `metadataCid` per session (officer-signed at creation) + `setBaseCid` callable by `ADMIN_ROLE` (direct or relayed sig). |
| **B5** | Shared relay nonce collisions / throughput | *Relay*: one sender service with a nonce manager (fire-and-reconcile) for all queues; `mintBatch(address[], sessionId)` on registry v2; OZ `Multicall` on `ClubGovernor` + `ClubElections`. |
| **S1** | Elections would need `DEFAULT_ADMIN_ROLE` | *Roles*: `_setRoleAdmin(ADMIN_ROLE, OFFICER_MANAGER_ROLE)`, held by Elections + Timelock. Elections owns the officer set; registry uses `AccessControlEnumerable`. |
| **S2** | Election failure modes / incumbents dodging | *Officer elections*: `open()` permissionless once per epoch after `epochStart + electionOpenAfter`; min-approval threshold; holdover rule (never zero officers); candidate cap 16; bitmap ballots; ballot sig binds election id + nonce. |
| **S3** | Tiny-supply quorum | *Governance params*: `quorum(t) = max(10% × totalPower(t), minQuorum)`. |
| **S4** | `floor(x/2)` breaks Σ invariant | *Rep → Voting power*: power = `2·current + previous` (integers only); thresholds rescaled. |
| **S5** | Past-epoch lookup rules | *Rep → Implementation rules*: `upperLookup(t)` for previous epoch; mints/grants write current epoch only; credited to epoch of mint; `uint48` timestamp clock; delegation functions revert. |
| **S6** | Backend `OPERATOR_ROLE` can fabricate Rep | `OPERATOR_ROLE` **removed**. `createSessionBySig` / `closeSessionBySig` verify an EIP-712 sig from an `ADMIN_ROLE` holder; relay submits. |
| **S7** | Shared nonces across `proposeBySig` / `castVoteBySig` | *Gasless governance*: backend assigns `onchainNonce + pendingCount` and submits in order; full `proposeBySig` spec. |
| **S8** | Relay censorship | *Gasless governance*: signed payload returned to member; indexer flags unlanded votes 24 h before deadline; self-submit path. Relay documented as trusted for liveness only. |
| **S9** | Migration safety / source of truth | *Backend*: expand → backfill → contract migrations; `Session.registryAddress`; drop `AdminRole` + global `Member.foundingMember`; new indexes; single indexer worker; CONFIRMED-only rankings; source-of-truth table. |
| **S10** | Docs alignment | 5a checklist item to amend `smart-contract/CLAUDE.md` (owner approval); Open Question 4 re-resolved; Non-Goal line removed. |
| **S11** | Wrong implementation order | *Sub-phases*: own-club migration on Sepolia (5d) before governance; opening to other clubs is last, after audit (5h). |
| **S12** | Import re-mints duplicate ATs | *Migrating the existing club*: legacy ATs stay on the legacy registry (`Club.legacyRegistryAddress`); only Rep is seeded via `importRep(accounts, prev, curr)`. |
| **Nice-to-haves** | Clone hardening, Rep revoke, bytecode size, Pending-quorum UI | Checklist items in 5a / 5e. |
| **OQ1–7** | Open questions | All resolved — see *Design decisions (resolved)* at the end of this phase. |

#### Roles (only two human roles)

| Role | Who | Power |
|---|---|---|
| **Member** | Anyone holding ≥1 Attendance Token in the club | Earns Rep, votes, can propose once over the proposal threshold, can nominate for office. Ranked by attendance stats — **no other tiers** (the General / Official Member split is retired). |
| **Officer** | Elected wallets holding `ADMIN_ROLE` on the club's registry | Runs meetings (signs session create/close), sets token metadata, can **revoke** (not grant) the relay as an emergency brake. **No extra voting power, no Rep grants.** |

System roles (not people):

| Role | Holder | Purpose |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | The club's `ClubTimelock` only | Everything else, via proposals |
| `OFFICER_MANAGER_ROLE` | `ClubElections` + `ClubTimelock` | Role admin of `ADMIN_ROLE` — rotates officers without holding `DEFAULT_ADMIN_ROLE` |
| `RELAY_ROLE` | Shared OCP relay wallet (granted per club) | `mint` / `mintBatch`; submits signed votes, proposals, ballots, session ops |
| Guardian (bootstrap only) | Founder wallet or Safe | Timelock `CANCELLER` (veto) + one-shot `importRep`; both removed by `endBootstrap()` |

The backend holds **no** admin key on v2 clubs. The factory ends up with no role anywhere (Timelock is initialized with `admin = address(0)`).

#### Contract architecture

```
ClubFactory (one per chain, allowlisted createClub until audit)
  └─ createClub(params) → deploys ERC-1167 clones (Clones.clone / CREATE) in one tx:
       AttendanceRegistry   soulbound ERC-1155, officer-signed sessions, mint/mintBatch (+ Rep mint)
       ClubRep              soulbound, epoch-scoped IVotes (voting power), timestamp clock
       ClubGovernor         OZ Governor + CountingSimple + VotesQuorumFraction (+ floor) + TimelockControl + proposeBySig + Multicall
       ClubTimelock         OZ TimelockController — DEFAULT_ADMIN_ROLE on registry + Rep; endBootstrap()
       ClubElections        approval-voting officer elections, holds OFFICER_MANAGER_ROLE, Multicall
```

| Decision | Choice | Rationale |
|---|---|---|
| Deploy model | **ERC-1167 minimal clones** of immutable implementations, initialized in the same tx | A factory embedding creation code for 5 contracts blows past the 24 KB limit; clones make club creation one cheap tx and every club runs identical audited code. **Not upgradeable** — v2 = new implementations + new factory + opt-in migration (same import path as below). No upgrade-admin key, which would contradict governance. |
| Clone hardening | Implementation constructors call `_disableInitializers()`; `Clones.clone` (CREATE, not predictable CREATE2 salts); init params validated (non-empty officer list, bounded params) | No initializer front-running or address squatting. |
| Registry changes | Keep session/mint/soulbound logic; convert to initializer (OZ `contracts-upgradeable` bases used non-upgradeably); `mint`/`mintBatch` also mint Rep atomically; add `createSessionBySig`/`closeSessionBySig`, per-session `metadataCid`, mint deadline, session spacing | One relay tx per check-in (or per batch), AT and Rep never drift, `AlreadyCheckedIn` still guarantees idempotency. |
| Clock | ERC-6372 **timestamp** mode (`clock()` returns `uint48(block.timestamp)`, `CLOCK_MODE() = "mode=timestamp"`) | Semesters and voting periods are calendar concepts. Governor delay/period are in **seconds**. |
| Delegation | **Disabled** — `delegates(a) == a`; `delegate` / `delegateBySig` revert | No "self-delegate first" footgun, no vote-buying via delegation. |
| Relay | One shared relay wallet, granted `RELAY_ROLE` per club by the factory; officers can revoke it per club | One gas wallet to fund/monitor; each club's Timelock stays sovereign; onchain mint deadline + spacing bound a leaked key to currently open sessions. |

**Registry v2 session rules (B3, B4, S6):**
- `createSessionBySig(sessionId, date, name, metadataCid, deadline, officerSig)` — verifies an EIP-712 signature from a current `ADMIN_ROLE` holder (officers can also call `createSession` directly). Records `openedAt = block.timestamp`.
- **Spacing:** reverts if `openedAt < lastSessionOpenedAt + minSessionSpacing` (default 12 h; Timelock-changeable).
- **Mint window:** `mint`/`mintBatch` revert after `openedAt + mintWindow` (default 24 h) or after close, whichever is first. Forgotten sessions stop being mintable on their own.
- **Metadata:** `uri(id)` uses the session's `metadataCid` when set, else `baseCid`; `setBaseCid` is `ADMIN_ROLE` (direct or relayed officer sig) — no proposal needed.
- **Emergency brake:** `ADMIN_ROLE` can call `revokeRelay()`; re-granting `RELAY_ROLE` requires a Timelock proposal.

#### Rep: earning and decay

**Earning (onchain sources only):**
- **Check-in:** fixed `REP_PER_CHECKIN` raw Rep (default **10**), minted by the registry inside `mint`/`mintBatch`.
- **Contribution grants:** `ClubRep.grant(to, amount, reasonURI)` — **Timelock only** (i.e. a passed proposal). Emits `RepGranted` with a reason URI. No officer grant path (dropped per review: Rep is earned from attendance; sessions are already the officer lever).
- **Revoke:** `ClubRep.revoke(account, reasonURI)` — Timelock only; writes a zero checkpoint at `now` for proven sybils without rewriting history.
- **Streaks:** display-only (computed offchain from confirmed `check_ins`), not extra Rep.

**Epochs (= semesters), B2:**
- `startEpoch(label)` — callable by officers or the Timelock; the new epoch always starts at `block.timestamp`; reverts unless `now ≥ lastEpochStart + minEpochLength` (default **90 days**, set at creation, Timelock-only to change, hard floor 60 days). Epoch starts are stored in a `Checkpoints.Trace208`.
- The `semester` field on sessions remains a free-text display label (see Open Question 4); epochs are the onchain truth for decay.

**Voting power (S4) — integers only:**
- `power(a, t) = 2 · current(a, t) + previous(a, t)` where `current` = raw Rep earned in `epoch(t)` up to `t`, `previous` = raw Rep earned in `epoch(t) − 1` (looked up as of `t`). Older epochs count zero.
- `totalPower(t)` uses the same formula over global per-epoch totals, so **Σ power(a, t) == totalPower(t) exactly** (invariant-tested).
- Effect: one check-in this epoch = **20 power**; one check-in last epoch = **10 power**. All thresholds below are in power units.

**Implementation rules (S5):**
- Past-epoch values are read with `upperLookup(t)`, never "latest".
- `mint`/`grant` only ever write the **current** epoch; Rep is credited to the epoch of the **mint**, not of the session. A session straddling an epoch boundary credits whichever epoch the mint lands in (documented, acceptable given the 24 h mint window).
- The token implements `IVotes` + `IERC6372` directly (custom, not `ERC20Votes`) and exposes read-only `balanceOf(a) = power(a, now)` for wallets/explorers. Transfers/approvals revert.

| Decay option | Verdict |
|---|---|
| **Epoch-scoped checkpoints, `2·current + previous` (chosen)** | Zero rollover txs, deterministic, exact snapshots and Σ invariant. Cost: custom IVotes → fuzz/invariant tests + audit. |
| Current epoch only | Supply drops to 0 at each boundary → quorum 0, one vote passes anything. Rejected. |
| Relay burns everyone's Rep at rollover | O(members) txs, partial-failure states. Rejected. |
| New Rep token per semester / continuous decay | Re-pointing the Governor each term / hard to checkpoint and audit. Rejected. |

**Weighting:** linear. Sqrt weighting breaks the quorum-fraction math; decay + session spacing already blunt grinding.

#### Governance parameters (per club, set at creation, changeable by proposal)

| Param | Default | Notes |
|---|---|---|
| Voting delay | `86400` s (1 day) | Time to notice a proposal before the snapshot. |
| Voting period | `604800` s (7 days) | Always spans one weekly meeting — officers can announce "vote now" with a QR. |
| Timelock min delay | `172800` s (2 days) | Window to react; guardian can cancel during bootstrap. |
| Quorum | `max(10% × totalPower(snapshot), minQuorum)`, `minQuorum` = **200 power** (≈ 10 current-epoch check-ins) | Floor stops one member passing proposals in a tiny or freshly-rolled club. |
| Proposal threshold | **60 power** (≈ 3 check-ins this epoch) | Any engaged member can propose; officers have no special proposal right. |
| `minEpochLength` | `7776000` s (90 days) | B2. |
| `minSessionSpacing` / `mintWindow` | `43200` s (12 h) / `86400` s (24 h) | B3. |

**Gasless governance (S7, S8):** members sign EIP-712 messages with their Privy wallet; the relay submits (batched via `Multicall`).
- **Votes** → OZ `castVoteBySig`.
- **Proposals** → custom `proposeBySig(targets, values, calldatas, description, proposer, deadline, signature)`:
  - signs over `(proposer, keccak256(abi.encode(targets, values, calldatas, keccak256(bytes(description)))), nonce, deadline)`;
  - verified with `SignatureChecker` (EOA + ERC-1271);
  - threshold checked against the **signer** at `clock() − 1`;
  - calls internal `_propose(..., proposer)` so cancel rights belong to the signer.
- **Nonces:** `proposeBySig` and `castVoteBySig` share OZ `Nonces`. The backend assigns `onchainNonce + pendingCount` per member, submits strictly in order, and asks the member to re-sign if an earlier tx fails.
- **Censorship resistance:** the signed payload is returned to the member; the indexer flags any signed-but-unlanded vote 24 h before the deadline; members with ETH can self-submit. The relay is **trusted for liveness, not authority** — it cannot forge votes.
- Backend rate-limits relayed proposals per member per epoch (spam = relay gas).
- **UI note:** `quorum(snapshot)` reverts while a proposal is Pending (future lookup) — show "quorum TBD" until Active.

#### Officer elections (S1, S2)

OZ Governor is binary and can't express "pick 3 of 7", so `ClubElections` is a separate, slim module:

1. **Open** — `open(seats)` is **permissionless once per epoch** after `epochStart + electionOpenAfter` (default 14 days), so incumbents can't skip elections. The Timelock can also open a special election.
2. **Nominate** — members self-nominate (gasless, relayed sig) until `nominationEnd`. **Cap 16 candidates.**
3. **Vote** — Rep-weighted **approval voting**: a ballot is a `uint16` bitmap of approved candidates, power snapshot at `nominationEnd` (`ClubRep.getPastVotes`). Ballot sigs bind `(electionId, voter, bitmap, nonce, deadline)`; Elections keeps its own nonces.
4. **Finalize** — anyone calls `finalize()` after `votingEnd` (bounded gas: ≤ 16 candidates). Winners = top `seats` by approved power **among candidates with ≥ `minApproval`** (default `max(10% × totalPower(snapshot), minQuorum)`). Ties → earlier nomination.
5. **Holdover** — unfilled seats are kept by incumbents (highest approval first, then longest-serving) until the next election. The officer set is **never empty**; if no candidate qualifies, the whole term holds over.
6. **Officer set** — Elections owns and exposes the set (`officers()`); the registry uses `AccessControlEnumerable` as a cross-check. Mid-term removal/appointment goes through `ClubElections.removeOfficer` / `appointOfficer` (Timelock-only), so the set never drifts.
7. **Term** = one epoch.

#### Bootstrap → handoff (B1)

A new club has 0 Rep, so governance can't reach quorum on day one — and doesn't need to: parameters are set in `createClub` and founding officers can already run meetings.
- At `createClub`: Timelock holds `DEFAULT_ADMIN_ROLE` on registry + Rep; Elections + Timelock hold `OFFICER_MANAGER_ROLE`; **founding officers** get `ADMIN_ROLE`; the **guardian** gets Timelock `CANCELLER` only (a veto) and the one-shot `importRep` right (migration only).
- **Handoff:** `ClubTimelock.endBootstrap()` revokes the guardian's `CANCELLER` and disables `importRep` — callable by the guardian anytime, or by anyone once the first election has finalized **and** `totalPower ≥ minQuorum`. Irreversible. Frontend shows a "Bootstrap — founders can veto" banner until then.
- **Test:** after `endBootstrap`, no address except the Timelock holds `DEFAULT_ADMIN_ROLE` / Timelock admin, proposer or canceller roles on any of the 5 contracts.

#### Backend changes (B5, S9)

**Source of truth:**

| Data | Source of truth |
|---|---|
| Roles, Rep, proposals/votes/elections, contract addresses | **Chain** (indexed into Postgres for reads) |
| Attendance | Confirmed check-ins: `check_ins` with `mintStatus = CONFIRMED` (chain-enforced via mint window); rankings count **CONFIRMED only** |
| Club slug, branding, email domain, pending check-ins, profiles | **Postgres** |

- **Prisma multi-tenancy** (reviewed by `db-schema-reviewer`), migrated **expand → backfill → contract**: add `clubId` nullable → backfill → `NOT NULL`.
  - New `Club` (slug, name, chainId, registry/rep/governor/timelock/elections addresses, `legacyRegistryAddress`, `requiredEmailDomain`, bootstrap flag), `ClubMember` (memberId, clubId, joinedAt, `foundingMember`) with `@@unique([clubId, memberId])`, `Epoch` mirror table.
  - `Session` gets `clubId` + `registryAddress`; uniqueness `@@unique([registryAddress, sessionIdOnchain])`; index `@@index([clubId, date])`.
  - New indexed tables `RepEvent`, `Proposal`, `Vote` (`@@unique([proposalId, voter])`), `Election`, `Ballot`; populate `TokenEvent`.
  - **Drop** `AdminRole` (chain is truth; `middleware/admin.ts` already checks onchain) and global `Member.foundingMember` (moves to `ClubMember`).
- **Scoping:** every route under `/clubs/:slug/...`; middleware resolves the club and attaches addresses; a test fails on unscoped service queries.
- **Relay — one sender (B5):** all queues (mints, votes, proposals, nominations, ballots, session ops) feed **one** sender with a nonce manager that submits without waiting and reconciles receipts afterwards (replaces `concurrency: 1` + wait-for-receipt in `mint.job.ts`). Check-ins are coalesced into `mintBatch` per session; votes/ballots batched via `Multicall`. Signatures + nonces validated before enqueueing so bad sigs never cost gas.
- **Officer auth:** admin middleware checks `hasRole(ADMIN_ROLE)` on the **club's** registry (cached, invalidated by `RoleGranted/RoleRevoked` events).
- **Indexer:** **one** worker, single cursor, `getLogs` with an address array across all clubs, confirmation depth for reorgs.
- **Stats:** remove `tierFor` / `OFFICIAL_MEMBER_THRESHOLD`; members ranked by attendance % then Rep. Real Rep/rank/leaderboard replace `frontend/lib/mock/gamification.ts`.

#### Frontend changes
- **Per-club routes** `/c/[slug]`: home, members (ranked by attendance), meetings, vault, governance, elections. Global `/vault` and `/stats` aggregate across clubs; the vault also shows legacy ATs via `legacyRegistryAddress`.
- **Officer session flow:** "Start check-in" prompts a Privy `signTypedData` for `createSessionBySig` (one tap), then shows the QR as today.
- **Governance UI:** proposal list/detail, vote buttons (Privy `signTypedData` → relay), templates (grant/revoke Rep, change params, appoint/remove officer, re-grant relay, custom call), live tally, quorum (TBD while Pending), timelock countdown, execute button, "your vote hasn't landed — submit it yourself" fallback.
- **Elections UI:** nominate, approval ballot, results, officer roster with terms and holdover markers.
- **Club creation wizard** (last, 5h): name, slug, logo/colors, founding officers, guardian, governance params, optional `.edu` domain → relay-sponsored `ClubFactory.createClub` (allowlisted). Club directory and per-club branding rebuilt against real data (the current placeholder club/explore pages are not reused).
- **Replace mocks:** `gamification.ts` → Rep/rank; `rewards.ts` → drop or rebuild as cosmetic achievements from real data; `meeting.ts` → real sessions. Hardcoded club name → per-club data.

#### Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Sybil** (one person, many wallets) | Per-club `requiredEmailDomain` (e.g. `.edu`) enforced at join via Privy's linked email; one Privy user = one member per club; Timelock `revoke` for proven sybils. One phone can still check in several accounts — 10-min QR expiry + officer spot checks. |
| **Low turnout** | 7-day period spanning a meeting, in-meeting "vote now" QR, email nudges (Phase 4 notifications), quorum floor tuned after the first semester. |
| **Hostile takeover / officer abuse** | Only ~2 epochs count; session spacing + mint window cap Rep inflation; epoch rollover rate-limited; 2-day timelock; guardian veto during bootstrap; elections can't be skipped. |
| **Compromised backend / relay key** | No admin key in backend; relay can only mint into open sessions officers signed, within 24 h; cannot forge votes; officers can revoke it instantly. |
| **Custom IVotes bugs** | Fuzz/invariant tests (Σ power == totalPower at every timepoint; nothing older than the previous epoch counts; past lookups immutable) + `contract-auditor` + external audit. |
| **Relay gas abuse** | Per-member/per-club rate limits; relay balance alerts already exist. |

#### Migrating the existing club (S12)
1. Deploy factory + implementations to Base Sepolia; `createClub` for the current club with today's officers as founding officers and the founder as guardian.
2. **Keep legacy ATs where they are** — no re-minting (members would see duplicates). Store the old registry (`0x7bEf…6192`) as `Club.legacyRegistryAddress`; the vault reads history from the DB and shows legacy tokens alongside v2 ones.
3. **Seed Rep only:** guardian calls `importRep(accounts[], prev[], curr[])` once, writing the previous- and current-epoch balances computed from confirmed check-ins (no retroactive epoch timestamps). Allowed only during bootstrap; permanently disabled by `finalizeImport()` (or `endBootstrap()`).
4. Backfill `clubId` / `registryAddress` in Postgres (expand → backfill → contract); point new sessions at the v2 registry; legacy registry stays readable, no new mints.

#### Sub-phases (implementation order, S11)

**5a — Contracts**
- [ ] Amend `smart-contract/CLAUDE.md` to allow non-upgradeable initializer clones + ERC-6372 timestamp clock (**needs owner approval** before any 5a code)
- [ ] `ClubRep`: soulbound epoch-scoped IVotes, `2·current + previous`, timestamp clock, rate-limited `startEpoch`, Timelock-only `grant` / `revoke`, guardian-only `importRep` + `finalizeImport`
- [ ] `AttendanceRegistry` v2: initializer, `AccessControlEnumerable`, `OFFICER_MANAGER_ROLE` as admin of `ADMIN_ROLE`, `createSessionBySig` / `closeSessionBySig`, session spacing, mint window, `mint` + `mintBatch` with atomic Rep, per-session `metadataCid`, officer `setBaseCid`, `revokeRelay`
- [ ] `ClubGovernor` (`proposeBySig`, quorum floor, `Multicall`) + `ClubTimelock` (`endBootstrap`)
- [ ] `ClubElections`: permissionless `open`, 16-candidate cap, bitmap ballots by sig, min approval, holdover, `finalize`, Timelock `appointOfficer` / `removeOfficer`, `Multicall`
- [ ] `ClubFactory`: `Clones.clone`, one-tx init, `_disableInitializers` on implementations, param validation, allowlist, factory owner has no power over existing clubs
- [ ] Tests: unit + fuzz/invariant (Σ power, past-lookup immutability), handoff role assertion, epoch/session rate limits; `forge build --sizes` check on `ClubGovernor` (< 24 KB)
- [ ] `contract-auditor` + `security-reviewer` pass
- [ ] Deploy factory to Base Sepolia; `addresses.json` + ABI sync

**5b — Backend multi-tenancy**
- [ ] Prisma expand migration (`Club`, `ClubMember`, `Epoch`, nullable `clubId` / `registryAddress`, indexes) — `db-schema-reviewer`
- [ ] `/clubs/:slug` scoping + club-resolving middleware + unscoped-query test
- [ ] Single relay sender with nonce manager; `mintBatch` coalescing; officer auth from chain roles
- [ ] Remove General/Official tier logic

**5c — Indexer + real Rep**
- [ ] Single indexer worker (address-array `getLogs`, confirmation depth); populate `TokenEvent`, `RepEvent`, role events
- [ ] Rep / rank / leaderboard APIs (CONFIRMED-only); replace `lib/mock/gamification.ts`, `meeting.ts`

**5d — Migrate our club on Sepolia (dogfood v2)**
- [ ] `createClub` for the existing club; `importRep`; backfill + contract migration (`clubId NOT NULL`); drop `AdminRole`, `Member.foundingMember`
- [ ] Officer-signed session flow live; real meetings run on v2 check-ins

**5e — Governance (gasless)**
- [ ] Relay endpoints for `castVoteBySig` / `proposeBySig` with nonce sequencing, pre-validation, rate limits, `Multicall` batching
- [ ] Proposal list/detail/create (templates), voting, queue/execute UI, unlanded-vote flagging + self-submit, Pending-quorum handling

**5f — Elections**
- [ ] Nomination + ballot relay endpoints, permissionless open trigger in UI
- [ ] Elections UI, officer roster, terms, holdover display

**5g — Pilot semester + audit**
- [ ] Full Sepolia semester incl. one election, an epoch rollover and `endBootstrap`
- [ ] External audit; fix findings

**5h — Mainnet + open to other clubs**
- [ ] Mainnet factory deploy + migrate our club (explicit owner go-ahead, as Open Question 6)
- [ ] Club creation wizard + allowlisted sponsorship, per-club `.edu` gating, club directory, per-club branding
- [ ] Open `createClub` onchain after audit; relay sponsorship stays backend-allowlisted

#### Design decisions (resolved by architect review)
1. **Session ops key** — ✅ No backend `OPERATOR_ROLE`. Officers sign `createSessionBySig` / `closeSessionBySig`, relay submits. *Same one-tap UX; a compromised backend can't fabricate sessions or Rep.*
2. **Decay formula** — ✅ "current + ½ previous", implemented as `2·current + previous` with custom IVotes. *Current-only zeroes quorum at each boundary; burns are O(members) txs; continuous decay is hard to checkpoint/audit.*
3. **Elections module vs Governor-only** — ✅ Separate, slim `ClubElections`. *N binary slate proposals can't enforce exactly k seats and each waits in the timelock.*
4. **Officer grant cap** — ✅ Dropped. Grants are Timelock-only. *Rep is earned from attendance; sessions are already the officer lever; removes a cross-contract role check.*
5. **Clones vs full deploys** — ✅ Non-upgradeable clones; v2 = new factory + opt-in migration. *Upgradeable proxies add an upgrade-admin key that contradicts governance.*
6. **Shared vs per-club relay** — ✅ One shared gas wallet, per-club `RELAY_ROLE`, officer emergency revoke. *Blast radius bounded onchain by mint window + spacing; can't forge votes.*
7. **Factory permissioning** — ✅ Onchain allowlist until audit, then open; relay sponsorship of creation stays backend-allowlisted. *Gas cost lives in sponsorship; factory owner has no power over existing clubs.*

#### Still open (decide during 5a)
- **Summer / short terms vs `minEpochLength` = 90 days:** a ~10-week summer term can't be its own epoch; it folds into the adjacent one. Acceptable, or lower the default toward the 60-day floor?
- **Relay re-grant latency:** after an officer revokes the relay, restoring check-ins needs a full proposal (~10 days: 1 d delay + 7 d vote + 2 d timelock). Is that acceptable, or should re-granting to the *same* relay address be an officer action?
- **Single-officer DoS:** any one officer can revoke the relay and halt minting for the club. Require 2 officers, or accept (mitigated by removal via proposal)?
- **Exact defaults** (`minQuorum` 200, threshold 60, `minApproval`) — tune after the pilot semester.

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

### Phase 5 target

Governance makes these keys matter more, because Rep = voting power. Target model (full design in Phase 5):

- **No backend admin key on v2 clubs:** each club's Timelock is the only `DEFAULT_ADMIN_ROLE` holder; officers rotate via `ClubElections` (`OFFICER_MANAGER_ROLE`); metadata is set by officers (`ADMIN_ROLE`), not a proposal. The backend's only role is the shared relay's per-club `RELAY_ROLE`.
- **Officer-signed session ops** (`createSessionBySig` / `closeSessionBySig`) — no backend `OPERATOR_ROLE`, so a compromised backend can only mint into sessions officers actually created.
- **Relay minting bounded on-chain:** per-session 24 h mint window, 12 h minimum session spacing, epoch rollover rate-limited to ≥ 90 days — a leaked relay key or rogue officer can't inflate Rep or reset voting power. Officers can revoke the relay instantly; re-granting needs a proposal.
- **Relay is trusted for liveness, not authority:** it submits members' signed votes/proposals/ballots but cannot forge them; members get their signed payload back and can self-submit; unlanded votes are flagged before the deadline.
- **Bootstrap guardian is a canceller (veto) only** plus a one-shot `importRep`; `ClubTimelock.endBootstrap()` removes both and tests assert the Timelock is the sole admin on all 5 contracts afterwards.
- **Clone safety:** `_disableInitializers()` on implementations, one-tx init via `Clones.clone`, validated params; factory owner has no power over existing clubs.
- **Sybil resistance:** per-club `.edu` email domain via Privy before a wallet can join/earn Rep; Timelock-only `revoke` for proven sybils.
- Run `contract-auditor` + `security-reviewer` after 5a; external audit before mainnet (5g).

---

## Open Questions / Decisions Pending

1. **QR expiry window** — 10 minutes default. Adjust based on how meetings run.
2. **Token art** — ✅ **Resolved:** Generic club logo per semester for MVP (Phase 3). Unique per-meeting art is a post-launch stretch goal, revisit for semester 2.
3. **Attendance % denominator** — ✅ **Resolved:** All confirmed sessions to date (club-wide), so every member is measured against the same meeting count and the vault / stats / admin views never disagree. Chosen over membership-period to keep a single shared definition; revisit if it unfairly penalizes mid-semester joiners.
4. **What constitutes a "semester"** — ✅ **Resolved (revised for Phase 5):** The per-session `semester` field stays an admin-defined free-text **display label** (summer/irregular terms just work). From Phase 5, onchain **epochs** (`ClubRep.startEpoch`, ≥ 90 days apart) are the source of truth for Rep decay; the label defaults to the current epoch's label but is not used in any onchain logic.
5. **Public vs private stats** — ✅ **Resolved:** A member's vault and stats are public by wallet address but carry no PII — email / linked social is never exposed on public endpoints (stripped from `GET /members`; served only behind the admin gate). On-chain attendance is already public, so this adds no disclosure.
6. **Mainnet timing** — ✅ **Decided (pending owner sign-off):** Stay on Base Sepolia for the pilot; migrate to Base Mainnet after semester 1, once check-in volume and relay-gas costs are validated. Requires an explicit go-ahead before the mainnet deploy.
7. **DAO pivot (Phase 5)** — ✅ **Decided:** On-chain governance (Rep-weighted voting, officer elections) is in scope; the old "no DAO governance" non-goal is removed. Architect review applied (Phase 5, Revision 2); remaining items are listed under "Still open" in Phase 5 and should be settled during 5a.

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
