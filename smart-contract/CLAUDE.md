# Smart Contract — Rules & Conventions

## Stack
- **Solidity ^0.8.24**
- **Foundry** — `forge build`, `forge test`, `forge script` for all operations
- **OpenZeppelin Contracts v5** — ERC-1155, AccessControl(Enumerable), ReentrancyGuard, Votes, Governor, TimelockController
- **Base Sepolia** (testnet) → **Base Mainnet** (production)

## Project Structure
```
smart-contract/
  src/
    AttendanceRegistry.sol    # Legacy v1 registry (deployed; read-only after Phase 5 import)
    AttendanceRegistry2.sol   # Phase 5: officer-run sessions, attendee caps, Rep credit at close
    ClubRep.sol               # Phase 5: soulbound Rep (OZ Votes base), voting power
    ClubGovernor.sol          # Phase 5: OZ Governor (+ reachable quorum floor)
    ClubTimelock.sol          # Phase 5: OZ TimelockController + expireGuardian()
    interfaces/
      IAttendanceRegistry.sol # External interface
  test/
    AttendanceRegistry.t.sol  # Forge tests (one file per src contract)
    helpers/
      BaseTest.sol            # Shared test setup
  script/
    Deploy.s.sol              # Legacy deployment script
    DeployClub.s.sol          # Phase 5: deploys Rep → registry → Timelock → Governor, hands off roles
    ImportLegacy.s.sol        # Phase 5: batches ClubRep.importLegacy over legacy sessions
    CreateSession.s.sol       # Admin ops scripts
  lib/                        # Foundry dependencies (git submodules)
  foundry.toml
```

## Contract Design

### Roles (AccessControl) — Phase 5 v1
```
DEFAULT_ADMIN_ROLE  — ClubTimelock ONLY (registry + Rep), set in the constructors.
                      Locked: `_grantRole` to anyone else and `_revokeRole` of the
                      Timelock revert. All role changes, params, Rep grants/revokes go
                      through passed Governor proposals. The backend never holds it.
ADMIN_ROLE          — officers (their own Privy wallets): createSession, closeSession
                      (with attendee list → Pending), confirmSessionRep (must be a
                      DIFFERENT officer than the closer), rejectSessionRep,
                      setBaseCid / setSessionMetadata, pause. Minimum 2 holders,
                      enforced in `_revokeRole` (covers revoke + renounce).
RELAY_ROLE          — backend relay wallet: mint / mintBatch ATs only. Cannot create Rep.
MINTER_ROLE (Rep)   — the registry contract only (set once via `setRegistry`).
```
Timelock: PROPOSER = Governor only; CANCELLER = Governor + guardian Safe (guardian granted
CANCELLER only, in the `ClubTimelock` constructor; bootstrap only, auto-expires via
`expireGuardian()`); EXECUTOR = `address(0)`. OZ only grants PROPOSER/CANCELLER to
`proposers[]` at construction, so the **deployer is a temporary Timelock admin** that grants
the Governor its roles and renounces as the last deploy step (after `finalizeImport`).
Never put the guardian in `proposers[]` (that would also grant PROPOSER).

The legacy `AttendanceRegistry` is frozen **before** the Phase 5 import: close every session,
revoke `RELAY_ROLE` / `ADMIN_ROLE`, renounce `DEFAULT_ADMIN_ROLE`. `importLegacy` only accepts
closed legacy sessions.

### Soulbound Enforcement
Override `_update` (OZ v5) to revert on any transfer where `from != address(0)`:
```solidity
function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
    internal override {
    if (from != address(0)) revert Soulbound();
    super._update(from, to, ids, values);
}
```

### Session Lifecycle
- Sessions are created with a unique `uint256 sessionId` (timestamp-based or sequential)
- Sessions can be `active` or `closed` — mint only allowed on active sessions
- Each address can only hold 1 token per sessionId (enforced in mint)
- **Phase 5 (`AttendanceRegistry2`):** **no time limits** on creating sessions (owner decision).
  `createSession` takes `maxAttendees` (≤ `MAX_ATTENDEES`); minting stops after close, at the
  attendee cap, or while paused. `mintBatch` skips duplicates (never reverts the batch) and mints
  via `_update` without the receiver hook. ATs carry no Rep.
- **Two-officer Rep sign-off:** `closeSession(id, attendees)` stores only the list hash + count
  (list emitted in the event; strictly increasing; each holds the AT) → Pending;
  `confirmSessionRep(id)` by a different officer (or the Timelock) fixes
  `perAttendee = min(REP_PER_CHECKIN, sessionCap / count)` with
  `sessionCap = max(repFloor, capBps × totalSupply / 10_000)` and checks + reserves the
  club-wide weekly budget; `creditSessionRep(id, attendees, from, to)` (anyone) credits in
  sequential pages, each member capped at `memberWeeklyCap` per week with the excess moved to a
  `deferred` balance (same packed slot: `{uint32 week, uint96 creditedThisWeek, uint128 deferred}`);
  `claimDeferredRep(accounts)` (anyone) credits deferred Rep up to the current week's allowance;
  `rejectSessionRep(id)` (any officer, while Pending) voids the session's Rep. Pending Rep never
  expires and has no voting power; same for deferred Rep (cleared by a Timelock `revoke`).
- **Weekly limits use fixed calendar-week buckets** (`block.timestamp / 7 days`), not rolling
  windows: constant gas, no history storage.

### Metadata
- `uri()` returns IPFS URL: `ipfs://{BASE_CID}/{sessionId}.json`
- Base CID set at deploy, updatable by `ADMIN_ROLE` (officers) — no proposal needed
- Phase 5: optional per-session `metadataCid`, also set by `ADMIN_ROLE`
- Metadata uploaded to IPFS before session creation

## Conventions

### Naming
- Custom errors (not `require` strings): `error Soulbound()`, `error SessionNotActive()`, `error AlreadyCheckedIn()`
- Events for all state changes: `SessionCreated`, `SessionClosed`, `TokenMinted`
- Constants in `SCREAMING_SNAKE_CASE`
- Storage variables prefixed with `s_` to distinguish from locals/params

### Testing
- Every public function has at least one test
- Test file mirrors `src/` structure
- Use named test functions: `test_mint_revertsIfAlreadyCheckedIn()`
- Fuzz tests for numeric inputs where applicable
- Coverage: `forge coverage` — aim for >90% on core logic

### Deployment
- Deploy via `forge script` with `--verify` flag (Basescan verification)
- Plain constructor deploys (no initializers, no clones) in Phase 5 v1
- Optimizer on (`optimizer_runs = 200`); check `forge build --sizes` — every contract < 24,576 bytes
- Gas: every officer/relay tx (incl. close/confirm/credit for 300 attendees) must stay < 10M gas — cover with a gas test
- Deploy order (`DeployClub.s.sol` / `ImportLegacy.s.sol`): freeze legacy → deploy → grant Governor
  Timelock roles → import → `finalizeImport` → deployer renounces; a test asserts this order
- Constructor args documented in `Deploy.s.sol`
- Deployed addresses committed to `addresses.json` at repo root
- Never deploy from a personal wallet in production — use a dedicated deployer

### Governance (Phase 5 v1)
- **Rep (`ClubRep`)**: OZ `Votes` base (not ERC-20) — no transfer/approve surface;
  `delegates(a) == a`, `delegate`/`delegateBySig` revert. `REP_PER_CHECKIN = 10` (constant).
  No decay in v1. One-time `importLegacy` derives Rep from legacy ERC-1155 balances on-chain,
  then `finalizeImport()`; `ClubGovernor.propose` reverts until finalized.
- **Clock**: ERC-6372 timestamp mode (`clock() = uint48(block.timestamp)`,
  `CLOCK_MODE() = "mode=timestamp"`). All governance durations are in **seconds**.
- **Governance parameters** (constructor defaults; governance may change them only within bounds
  enforced in overrides of `_setVotingDelay`, `_setVotingPeriod`, `_setProposalThreshold`,
  `_updateQuorumNumerator` and `ClubTimelock.updateDelay`):
  voting delay 86400 ∈ [1 h, 7 d] · voting period 604800 ∈ [3 d, 14 d] ·
  timelock min delay 172800 ∈ [1 d, 7 d] · proposal threshold 30 Rep ∈ [10, 1,000] ·
  quorum numerator 10% ∈ [5%, 30%]; quorum = `max(numerator × supply, min(minQuorum, 50% × supply))`
  with immutable `minQuorum = 100` Rep.
- **Registry params** (Timelock-only, bounded): `repFloor` 500 Rep ∈ [100, 5,000],
  `capBps` 2,000 ∈ [500, 5,000], `memberWeeklyCap` 100 Rep ∈ [20, 1,000],
  `weeklyFloor` 1,000 Rep ∈ [500, 20,000],
  `weeklyBps` 2,500 ∈ [500, 5,000]. Constants: `MAX_ATTENDEES = 300`, `mintBatch` ≤ 200,
  credit pages ~100, officer floor 2.
- **Pause**: any officer, 14 days, once per officer per 30 days; unpause needs 2 distinct
  officers or the Timelock. Blocks AT minting only.
- Every Timelock-changeable parameter must have on-chain bounds.

### Gas
- No premature optimization, but avoid unnecessary storage reads in loops
- Emit events with indexed fields for the indexer: `indexed address to`, `indexed uint256 sessionId`
- Use `uint64` for timestamps (sufficient until year 2554)

## FORBIDDEN
- Upgradeable proxies — KISS, the contracts are simple enough to redeploy if needed (Phase 6 may use non-upgradeable clones; that needs its own amendment)
- `tx.origin` for auth — always use `msg.sender`
- `block.timestamp` for access control (who may call what). It **is** allowed for durations and
  windows: pause expiry, guardian expiry, the weekly Rep buckets (per-member and club-wide), and the ERC-6372
  governance clock (validators can skew it by seconds, which is irrelevant at hour/day scales).
  Do not add time limits on creating sessions (owner decision).
- Storing off-chain data on-chain (token metadata belongs on IPFS)
- `selfdestruct`

## Foundry Commands
```bash
forge build                          # Compile
forge build --sizes                  # Contract sizes (must stay < 24,576 bytes)
forge test                           # Run tests
forge test -vvv                      # Verbose (shows traces on failure)
forge coverage                       # Coverage report
forge script script/Deploy.s.sol     # Dry-run deploy
forge script script/Deploy.s.sol --broadcast --verify  # Real deploy
cast call <addr> "functionSig()"     # Read contract state
```

## Environment Variables (`.env`)
```
PRIVATE_KEY          # Deployer wallet
ALCHEMY_API_KEY      # Base RPC
BASESCAN_API_KEY     # Contract verification
```
