# Smart Contract — Rules & Conventions

## Stack
- **Solidity ^0.8.24**
- **Foundry** — `forge build`, `forge test`, `forge script` for all operations
- **OpenZeppelin Contracts v5** — ERC-1155, AccessControl, ReentrancyGuard
- **Base Sepolia** (testnet) → **Base Mainnet** (production)

## Project Structure
```
smart-contract/
  src/
    AttendanceRegistry.sol    # Main contract
    interfaces/
      IAttendanceRegistry.sol # External interface
  test/
    AttendanceRegistry.t.sol  # Forge tests
    helpers/
      BaseTest.sol            # Shared test setup
  script/
    Deploy.s.sol              # Deployment script
    CreateSession.s.sol       # Admin ops scripts
  lib/                        # Foundry dependencies (git submodules)
  foundry.toml
```

## Contract Design

### Roles (AccessControl)
```
DEFAULT_ADMIN_ROLE  — grants/revokes all roles. Multisig in prod.
ADMIN_ROLE          — can createSession, closeSession
RELAY_ROLE          — can mint (backend relay wallet only)
```

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

### Metadata
- `uri()` returns IPFS URL: `ipfs://{BASE_CID}/{sessionId}.json`
- Base CID set at deploy, updatable by `DEFAULT_ADMIN_ROLE`
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
- Constructor args documented in `Deploy.s.sol`
- Deployed addresses committed to `addresses.json` at repo root
- Never deploy from a personal wallet in production — use a dedicated deployer

### Gas
- No premature optimization, but avoid unnecessary storage reads in loops
- Emit events with indexed fields for the indexer: `indexed address to`, `indexed uint256 sessionId`
- Use `uint64` for timestamps (sufficient until year 2554)

## FORBIDDEN
- Upgradeable proxies — KISS, the contract is simple enough to redeploy if needed
- `tx.origin` for auth — always use `msg.sender`
- `block.timestamp` for security-critical logic (fine for metadata, not for access control)
- Storing off-chain data on-chain (token metadata belongs on IPFS)
- `selfdestruct`

## Foundry Commands
```bash
forge build                          # Compile
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
