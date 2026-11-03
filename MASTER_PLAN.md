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
**Goal**: Turn OAP into **Onchain Club Protocol (OCP)** — any club can deploy its own onchain org where showing up earns non-transferable **Rep**, Rep is voting power, and officers are elected onchain. Members stay gasless end to end.

> Supersedes the "DAO governance or token-weighted voting" entry under **Non-Goals** — remove that line when this phase is approved. "No transferability" and "no financial instrument" still hold: Rep is soulbound and has no market.

#### Roles (only two human roles)

| Role | Who | Power |
|---|---|---|
| **Member** | Anyone holding ≥1 Attendance Token in the club | Earns Rep, votes, can propose once over the proposal threshold. Ranked by attendance stats — **no other tiers** (the General / Official Member split is retired). |
| **Officer** | Elected wallets holding `ADMIN_ROLE` on the club's registry | Runs meetings (backend dashboard), small capped Rep grants. No extra voting power. |

System roles (not people): `RELAY_ROLE` (backend mint/vote relay), `OPERATOR_ROLE` (backend key that sends session txs on officers' behalf — see open question 1), `DEFAULT_ADMIN_ROLE` (the club's Timelock).

#### Contract architecture

```
ClubFactory (one per chain)
  └─ createClub(params) → deploys ERC-1167 clones in one tx:
       AttendanceRegistry   soulbound ERC-1155, sessions + check-in mints (existing logic)
       ClubRep              soulbound, epoch-decaying IVotes (voting power)
       ClubGovernor         OZ Governor + CountingSimple + VotesQuorumFraction + TimelockControl + proposeBySig
       ClubTimelock         OZ TimelockController — holds DEFAULT_ADMIN_ROLE on registry + Rep
       ClubElections        multi-candidate officer elections, Rep-weighted
```

| Decision | Choice | Rationale |
|---|---|---|
| Deploy model | **ERC-1167 minimal clones** of immutable implementations, initialized in the same tx | A factory embedding creation code for 5 contracts blows past the 24 KB bytecode limit; clones make club creation one cheap tx and every club runs identical audited code. Clones are **not upgradeable** — v2 ships new implementations + a new factory, clubs opt in by migrating. Init happens inside `createClub`, so no initializer front-running window. |
| Registry changes | Keep the session/mint/soulbound logic; convert to an initializer (OZ upgradeable base contracts) and have `mint()` also call `ClubRep.mint(to, REP_PER_CHECKIN)` atomically | One relay tx per check-in, AT and Rep can never drift, `AlreadyCheckedIn` still guarantees idempotency. Existing tests port nearly 1:1. |
| Clock | ERC-6372 **timestamp** mode | Semesters and voting periods are human calendar concepts; Base block times are an implementation detail. |
| Delegation | **Disabled** — votes = own Rep; `delegate()` reverts | Nothing to forget (no "self-delegate on first mint" footgun) and no vote-buying via delegation. Revisit only if turnout forces it. |
| Relay | One relay wallet, granted `RELAY_ROLE` on every club by the factory | One gas wallet to fund/monitor (existing balance check in `mint.job.ts` carries over); per-club spend tracked offchain. |

#### Rep: earning and decay

**Earning (onchain sources only):**
- **Check-in:** fixed `REP_PER_CHECKIN` (default 10), minted by the registry inside `mint()`.
- **Contribution grants:** `ClubRep.grant(to, amount, reasonURI)` —
  - callable by the **Timelock** (any amount, via proposal), and
  - by **officers** up to `OFFICER_GRANT_CAP` per officer per epoch (e.g. 30 Rep) for small things (gave a talk, ran a workshop) without a vote. Every grant emits `RepGranted` with a reason URI so it's auditable.
- **Streaks:** display-only (computed offchain from `check_ins`), **not** extra Rep — keeps onchain logic trivial and avoids rewarding grind over contribution.

**Decay — epoch-scoped Rep (lazy, no burn txs):**
- The club defines **epochs** (= semesters). `startEpoch(label)` (officer/operator, monotonic timestamps) records a boundary in a `Checkpoints.Trace` of epoch start times. This replaces today's free-text-only `semester` concept as the onchain source of truth.
- Rep is stored per `(account, epoch)` as checkpointed cumulative earnings, plus a global per-epoch total.
- **Voting power at time `t`** = `earned[epoch(t)] up to t` + `earned[epoch(t) − 1] / 2`. Older epochs count zero. `getPastTotalSupply(t)` uses the same formula over the global totals, so `GovernorVotesQuorumFraction` stays correct.
- `getVotes / getPastVotes / getPastTotalSupply` are all the Governor touches, so the token implements `IVotes` + `IERC6372` directly (custom, not OZ `ERC20Votes`), and exposes an ERC-20-style read-only `balanceOf` (= current voting power) for wallets/explorers. Transfers/approvals revert.

| Decay option | Verdict |
|---|---|
| **Epoch-scoped checkpoints (chosen)** | Zero rollover txs, deterministic, historical snapshots exact. Cost: custom IVotes code → needs a careful audit. |
| Relay burns everyone's Rep at rollover | O(members) txs per semester, partial failures leave inconsistent power, snapshot semantics messy. Rejected. |
| New Rep token per semester | Governor would need re-pointing every semester (governance tx), frontends juggle N tokens. Rejected. |
| No decay | Alumni accumulate permanent control; new members can't catch up. Rejected. |

**Weighting:** linear in v1. Decay + officer grant caps already blunt grinding, and sqrt weighting breaks the quorum-fraction math (quorum is computed on linear supply). Listed as an open question.

#### Governance parameters (per club, set at creation, changeable by proposal)

| Param | Default | Notes |
|---|---|---|
| Voting delay | 1 day | Time to notice a proposal before the snapshot. |
| Voting period | 7 days | Always spans one weekly meeting — officers can announce "vote now" with a QR. |
| Timelock min delay | 2 days | Window to react to a malicious proposal (guardian can cancel during bootstrap). |
| Quorum | 10% of decayed total Rep | Student turnout is low; tune after the first semester. |
| Proposal threshold | 30 Rep (≈ 3 check-ins this epoch) | Any engaged member can propose; officers have no special proposal right. |

**Gasless:** members sign EIP-712 messages with their Privy wallet; the relay submits.
- Votes → OZ `castVoteBySig` (built in).
- Proposals → custom `proposeBySig` on `ClubGovernor` (OZ has none): EIP-712 over `(targets, values, calldatas, descriptionHash, nonce, deadline)`; threshold checked against the **signer**, not `msg.sender`.
- Backend rate-limits relayed proposals per member per epoch (spam = relay gas).

#### Officer elections

OZ Governor is binary (for/against/abstain), which can't express "pick 3 of 7 candidates", so elections get a dedicated module:

1. **Open election** — by proposal, or automatically scheduled each epoch: `ClubElections.open(seats, nominationEnd, votingEnd)`.
2. **Nominate** — any member self-nominates (gasless, relayed signature) until `nominationEnd`.
3. **Vote** — Rep-weighted **approval voting** (approve any subset of candidates) via signed ballots, power snapshot at nomination close (`ClubRep.getPastVotes`).
4. **Finalize** — anyone calls `finalize()` after `votingEnd`: top `seats` by approved Rep win; contract revokes `ADMIN_ROLE` from the outgoing term and grants it to winners (Elections holds a role on the registry granted by the Timelock). Ties → earlier nomination wins (documented, deterministic).
5. **Term** = one epoch (semester). Governance can always remove an officer mid-term with a normal proposal calling `revokeRole(ADMIN_ROLE, officer)` through the Timelock.

#### Bootstrap → handoff

A new club has 0 Rep, so governance can't reach quorum on day one.
- At `createClub`: Timelock already holds `DEFAULT_ADMIN_ROLE`; **founding officers** get `ADMIN_ROLE`; a **guardian** (founder wallet or Safe) gets Timelock `PROPOSER` + `CANCELLER` so it can act before members exist.
- **Handoff:** `endBootstrap()` revokes the guardian's Timelock roles — callable by the guardian anytime, and by anyone once the first election has finalized **and** epoch Rep supply ≥ `BOOTSTRAP_MIN_REP`. Irreversible. Frontend shows a "Bootstrap — run by founders" banner until then.
- After handoff the backend must hold **no** `DEFAULT_ADMIN` key (today `DEFAULT_ADMIN_PRIVATE_KEY` signs `grantRole`; that path moves to proposals/elections).

#### Backend changes
- **Prisma multi-tenancy:** new `Club` (slug, name, org, chainId, registry/rep/governor/timelock/elections addresses, requiredEmailDomain, bootstrap flag) and `ClubMember` (memberId, clubId, joinedAt). `Member` stays global (one wallet identity across clubs). `Session` gets `clubId`; `sessionIdOnchain` uniqueness becomes `@@unique([clubId, sessionIdOnchain])`. New `Epoch` table mirrors onchain epochs.
- **Scoping:** every route under `/clubs/:slug/...`; a middleware resolves the club and attaches contract addresses; no unscoped queries remain (add a test that fails on missing `clubId` filters in services).
- **Relay:** `MintJobData` gains the registry address; new queues for relayed votes, proposals, nominations, ballots. Signature + nonce validated before enqueueing so bad sigs never cost gas.
- **Officer auth:** admin middleware checks `hasRole(ADMIN_ROLE)` on the **club's** registry (cached, invalidated by `RoleGranted/RoleRevoked` events) instead of a global admin list.
- **Indexer:** a cursor-based `getLogs` worker per club; fills the unused `TokenEvent` table plus new `RepEvent`, `Proposal`, `Vote`, `Election`, `Ballot` tables. `check_ins` stays the source of truth for attendance; chain events are the source of truth for Rep/governance.
- **Stats:** remove `tierFor` / `OFFICIAL_MEMBER_THRESHOLD`; members ranked by attendance % then Rep. Real Rep, rank and leaderboard replace `frontend/lib/mock/gamification.ts`.

#### Frontend changes
- **Club creation wizard** (`/clubs/new`): name, slug, logo/colors, founding officers, guardian, governance params, optional `.edu` domain → backend calls `ClubFactory.createClub` (relay-sponsored, allowlisted early on).
- **Per-club routes** `/c/[slug]`: home, members (ranked by attendance), meetings, vault, governance, elections. Global `/vault` and `/stats` aggregate across clubs.
- **Governance UI:** proposal list/detail, vote buttons (Privy `signTypedData` → relay), proposal templates (grant Rep, change params, set base CID, remove officer, custom call), live tally, timelock countdown, execute button.
- **Elections UI:** nominate, approval ballot, results, current officer roster with terms.
- **Replace mocks:** `lib/mock/clubs.ts` + `explore.ts` → real club directory; `gamification.ts` → Rep/rank; `rewards.ts` → drop (no levels/XP system — Rep is the single score) or rebuild as purely cosmetic achievements derived from real data; `meeting.ts` → real session data. Hardcoded "Blockchain Club" strings become per-club data.

#### Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Sybil** (one person, many wallets) | Per-club `requiredEmailDomain` (e.g. `.edu`) enforced at join via Privy's linked email; one Privy user = one member per club. Attendance still needs the live QR — note that one phone can check in several accounts, so pair with the 10-min expiry and officer spot checks. |
| **Low turnout** | Low quorum, 7-day period spanning a meeting, in-meeting "vote now" QR, email nudges (ties into Phase 4 notifications). |
| **Hostile takeover** (e.g. a crowd farms Rep then votes treasury/roles) | Decay caps how fast power accrues (only ~2 epochs count); 2-day timelock; guardian cancel during bootstrap; officer grant caps. |
| **Custom IVotes bugs** | `contract-auditor` pass + invariant/fuzz tests (Σ power == total supply at every timepoint; no power from >1 epoch back). |
| **Relay gas abuse** | Per-member/per-club rate limits; relay balance alerts already exist. |

#### Migrating the existing club
1. Deploy factory + implementations to Base Sepolia; `createClub` for the current Blockchain Club with today's officers as founding officers.
2. **Import** history while in bootstrap: an `importAttendance(sessions[], attendees[][])` operator-only function, permanently disabled by `finalizeImport()`, recreates historical sessions as closed and mints ATs + epoch-scoped Rep (past semesters → past epochs, so decay applies correctly).
3. Backfill `Club`/`clubId` in Postgres for all existing rows; point the backend at the new registry; retire the legacy contract (`0x7bEf…6192`) — kept readable, no new mints.
4. Run one full semester on Sepolia (including one election + `endBootstrap`) before mainnet. Mainnet launch = fresh factory deploy + import, gated on audit sign-off (same explicit go-ahead rule as Open Question 6).

#### Sub-phases (implementation order)

**5a — Contracts**
- [ ] `ClubRep`: soulbound epoch-scoped IVotes (+ ERC-6372 timestamp clock), `grant` with Timelock/officer-cap paths, epoch management
- [ ] `AttendanceRegistry` v2: initializer, atomic Rep mint, `OPERATOR_ROLE`, `importAttendance` / `finalizeImport`
- [ ] `ClubGovernor` (+ `proposeBySig`) and `ClubTimelock` wiring
- [ ] `ClubElections`: nominate, approval ballots by sig, `finalize` role rotation
- [ ] `ClubFactory`: clones + one-tx init, role wiring, bootstrap/guardian, `endBootstrap`
- [ ] Foundry unit + fuzz/invariant tests; `contract-auditor` + `security-reviewer` pass
- [ ] Deploy factory to Base Sepolia; `addresses.json` + ABI sync

**5b — Backend multi-tenancy**
- [ ] Prisma: `Club`, `ClubMember`, `Epoch`, `clubId` on `Session`, composite uniques (reviewed by `db-schema-reviewer`)
- [ ] `/clubs/:slug` route scoping + club-resolving middleware
- [ ] Per-club relay (registry address in jobs), officer auth from chain roles
- [ ] Remove General/Official tier logic

**5c — Indexer + real Rep**
- [ ] Event indexer worker (Rep, Governor, Elections, roles); populate `TokenEvent`
- [ ] Rep / rank / leaderboard APIs; replace `lib/mock/gamification.ts`, `clubs.ts`, `explore.ts`, `meeting.ts`

**5d — Governance (gasless)**
- [ ] Relay endpoints for `castVoteBySig` / `proposeBySig` with sig + nonce pre-validation and rate limits
- [ ] Proposal list/detail/create (templates), voting, queue/execute UI

**5e — Elections**
- [ ] Election scheduling per epoch, nomination + ballot relay endpoints
- [ ] Elections UI, officer roster, term display

**5f — Open to other clubs**
- [ ] Club creation wizard + allowlisted factory sponsorship
- [ ] Per-club `.edu` gating at join, club directory, per-club branding

**5g — Migration & mainnet**
- [ ] Import existing Blockchain Club history; backfill `clubId`; retire legacy registry
- [ ] Full Sepolia semester incl. one election and `endBootstrap`
- [ ] Mainnet factory deploy + import (explicit owner go-ahead)

#### Open design questions for architect review
1. **Session ops key:** keep a backend `OPERATOR_ROLE` that sends `createSession/closeSession` for officers (today's UX, backend key is a trust point), or have officers sign those txs themselves via relayed signatures?
2. **Decay formula:** "current epoch + ½ previous" vs. current-epoch-only vs. continuous exponential decay — and is custom IVotes worth it versus a simpler (but tx-heavy) burn-on-rollover?
3. **Elections module vs. Governor-only:** is a separate `ClubElections` contract justified, or should elections be N binary slate proposals?
4. **Officer grant cap:** keep officer-issued Rep at all (convenient, but a centralization lever), and at what cap?
5. **Clones vs. full deploys:** confirm clones (non-upgradeable) and the v2 migration story; any reason to want upgradeable proxies instead?
6. **One shared relay vs. per-club relays** — blast radius if the relay key leaks across N clubs.
7. **Factory permissioning:** open `createClub` from day one, or allowlisted until the first audit?

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
2. **Token art** — ✅ **Resolved:** Generic club logo per semester for MVP (Phase 3). Unique per-meeting art is a post-launch stretch goal, revisit for semester 2.
3. **Attendance % denominator** — ✅ **Resolved:** All confirmed sessions to date (club-wide), so every member is measured against the same meeting count and the vault / stats / admin views never disagree. Chosen over membership-period to keep a single shared definition; revisit if it unfairly penalizes mid-semester joiners.
4. **What constitutes a "semester"** — ✅ **Resolved:** Admin-defined free-text label set per session (the `semester` field); the "current" semester is the most recent session's label. Not calendar-derived, so summer/irregular terms just work.
5. **Public vs private stats** — ✅ **Resolved:** A member's vault and stats are public by wallet address but carry no PII — email / linked social is never exposed on public endpoints (stripped from `GET /members`; served only behind the admin gate). On-chain attendance is already public, so this adds no disclosure.
6. **Mainnet timing** — ✅ **Decided (pending owner sign-off):** Stay on Base Sepolia for the pilot; migrate to Base Mainnet after semester 1, once check-in volume and relay-gas costs are validated. Requires an explicit go-ahead before the mainnet deploy.
7. **DAO pivot (Phase 5)** — Pending approval: the Phase 5 design reverses the "DAO governance or token-weighted voting" non-goal. Decide before 5a starts; see "Open design questions for architect review" in Phase 5.

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
