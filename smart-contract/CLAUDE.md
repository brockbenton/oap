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
DEFAULT_ADMIN_ROLE  — ClubTimelock ONLY (registry + Rep). All role changes, params,
                      Rep grants/revokes go through passed Governor proposals.
                      The deployer renounces after handoff; the backend never holds it.
ADMIN_ROLE          — officers (their own Privy wallets): createSession, closeSession
                      (+ attendee sign-off), setBaseCid / setSessionMetadata, pause.
                      Can never drop to zero holders.
RELAY_ROLE          — backend relay wallet: mint / mintBatch ATs only. Cannot create Rep.
MINTER_ROLE (Rep)   — the registry contract only.
```
Timelock: PROPOSER = Governor; CANCELLER = Governor + guardian Safe (bootstrap only,
auto-expires via `expireGuardian()`); EXECUTOR = `address(0)`; constructor admin = `address(0)`.

The legacy `AttendanceRegistry` keeps its original roles until the Phase 5 import, then
`RELAY_ROLE` / `ADMIN_ROLE` are revoked and `DEFAULT_ADMIN_ROLE` renounced.

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
- **Phase 5 (`AttendanceRegistry2`):** `createSession` takes `maxAttendees` (≤ `MAX_ATTENDEES`);
  sessions are ≥ `minSessionSpacing` apart; minting stops after `openedAt + mintWindow`, after
  close, at the attendee cap, or while paused. `mintBatch` skips duplicates (never reverts the
  batch) and mints via `_update` without the receiver hook. Rep is credited **only** by
  `closeSession(id, attendees)` (officer sign-off, once per session, holders of that session's AT,
  strictly increasing addresses).

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
- **Parameters** (constructor; v1 changes them only by deploying a new Governor):
  voting delay 86400 · voting period 604800 · timelock min delay 172800 ·
  proposal threshold 30 Rep · quorum `max(10% × supply, min(minQuorum, 50% × supply))`
  with immutable `minQuorum = 100` Rep.
- **Registry params** (Timelock-changeable, bounded): `minSessionSpacing` 72 h ∈ [1 h, 14 d],
  `mintWindow` 12 h ∈ [1 h, 48 h]; `MAX_ATTENDEES = 300`; `mintBatch` ≤ 200.
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
- `block.timestamp` for access control (who may call what). It **is** allowed for time windows and
  durations: mint deadline, session spacing, pause expiry, guardian expiry, and the ERC-6372
  governance clock (validators can skew it by seconds, which is irrelevant at hour/day scales)
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
