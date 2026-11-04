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
    AttendanceRegistry2.sol   # Phase 5: officer-run sessions, attendee caps, 10 Rep per attendance after two-officer approval
    ClubRep.sol               # Phase 5: soulbound, decay-aware IVotes; current + historical power
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
    DeployClub.s.sol          # Phase 5: deploys Timelock → Rep → registry → Governor, hands off roles
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
- **Two-officer Rep sign-off:** `closeSession(id, attendees)` commits to the sorted unique
  AT-holder list hash + count (list emitted) → Pending; a different officer (or Timelock)
  calls `confirmSessionRep(id)` → Confirmed and fixes a common recognition timestamp.
  `creditSessionRep(id, attendees, from, to)` (anyone) credits **10 nominal Rep per attendee**
  in sequential, non-overlapping pages. Delayed pages decay from the common recognition time;
  they have no voting power before their page lands and cannot change earlier snapshots.
  Empty lists complete with zero credit. `rejectSessionRep` voids Pending Rep only. ATs remain.
- **No supply-based per-session Rep reduction, per-member weekly cap, club-wide weekly budget,
  weekly counter, deferred balance or `claimDeferredRep`.** Retire `repFloor`, `capBps`,
  `memberWeeklyCap`, `weeklyFloor`, `weeklyBps`. Attendee and page-count limits remain.
- Decay does **not** prevent Sybils or repeated fabricated sessions by colluding officers.
  No aggregate issuance-rate bound is claimed. Review this changed threat model before deploy.

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
- **Rep (`ClubRep`)**: decay-aware `IVotes`, not ERC-20. No transfer/approve surface;
  `delegates(a) == a`, `delegate`/`delegateBySig` revert. Each attendance earns 10 nominal Rep.
  Decay is **required in v1**: `r × 2^(-(t-t0)/H)`, with **180-day half-life provisional**
  for 5a validation; immutable per deployment, independent of semesters or keeper/epoch jobs.
  Use fixed-point precision (proposed 18 decimals) consistently for awards and governance params.
  Standard OZ `Votes` does not implement passive decay: adapt/review checkpoints and math rather
  than assuming its ordinary balances supply historical decayed power automatically.
  Current account/total reads decay without transactions. Historical reads evaluate state at t;
  later credits/revokes/decay must not alter past snapshots. Account and global power must agree
  within a documented rounding tolerance, without member-wide or unbounded-history iteration.
  New awards never refresh the age of old Rep. Lifetime attendance and ATs never decay.
  `importLegacy` derives nominal amounts from closed legacy ERC-1155 balances on-chain; all
  imported credits share a deployment-fixed migration recognition timestamp and then decay.
  Finalize before any proposal. Timelock grants also decay from execution; revoke removes
  remaining power and blocks future credits until cleared, while preserving earlier snapshots.
  Explicit changes emit vote-compatible events plus recognition data; passive decay emits none.
  Indexers/UI must use as-of timestamps, not event-only cached vote balances.
  Required tests: reference-model half-life math, rounding/dust, long inactivity/overflow,
  same-timestamp updates, delayed pages, import timing, revoke/blocking, total/account agreement,
  fixed proposal snapshots, and bounded gas. Resolve below-threshold/zero-supply recovery before deploy.
- **Clock**: ERC-6372 timestamp mode (`clock() = uint48(block.timestamp)`,
  `CLOCK_MODE() = "mode=timestamp"`). All governance durations are in **seconds**.
- **Governance parameters** (constructor defaults; governance may change them only within bounds
  enforced in overrides of `_setVotingDelay`, `_setVotingPeriod`, `_setProposalThreshold`,
  `_updateQuorumNumerator` and `ClubTimelock.updateDelay`):
  voting delay 86400 ∈ [1 h, 7 d] · voting period 604800 ∈ [3 d, 14 d] ·
  timelock min delay 172800 ∈ [1 d, 7 d] · proposal threshold 30 Rep ∈ [10, 1,000] ·
  quorum numerator 10% ∈ [5%, 30%]; quorum = `max(numerator × supply, min(minQuorum, 50% × supply))`
  with immutable `minQuorum = 100` Rep.
- **Registry constants:** `MAX_ATTENDEES = 300`, `mintBatch` ≤ 200, credit pages ~100,
  officer floor 2. Full 10 nominal Rep per eligible attendee; no Rep budget params.
- **Threshold and quorum:** use decayed power at `clock()-1` for proposing and at the fixed
  proposal snapshot for vote weights/quorum. Threshold 30 Rep and minQuorum 100 Rep are
  provisional settings in scaled units, not guaranteed counts of check-ins after decay.
  The positive-supply quorum clamp alone does not solve inactivity/zero-supply recovery;
  resolve and test that liveness policy in 5a (#52, #61, #68).
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
  windows: pause expiry, guardian expiry, gradual Rep decay and recognition timestamps, and the ERC-6372
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

