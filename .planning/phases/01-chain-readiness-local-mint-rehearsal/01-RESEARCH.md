# Phase 1: Chain Readiness & Local Mint Rehearsal - Research

**Researched:** 2026-10-27
**Domain:** EVM role verification (OpenZeppelin AccessControl), viem boot guards, BullMQ/ioredis wiring, ABI/address drift checks, Node 22 pinning, local end-to-end rehearsal
**Confidence:** MEDIUM-HIGH (codebase facts verified by reading code; external limits such as faucets and Alchemy getLogs are MEDIUM/LOW)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** This codebase was written by the owner's friend. The owner runs the club and is now taking it live. The owner does **not** want to handle key or role details by hand. The plan must make these steps as close to copy-paste as possible, with one short human action per step (for example "fund this address from the faucet"), and no key-management decisions pushed back to the owner.
- **D-02:** The owner says they have the deployer key, but that is unconfirmed, because a friend deployed the contract. Treat it as unverified. The first task derives the address from the available key(s) and runs `hasRole` for DEFAULT_ADMIN_ROLE, ADMIN_ROLE and RELAY_ROLE against `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192`.
- **D-03:** Decision rule: if an available key holds DEFAULT_ADMIN_ROLE -> **keep** the contract, grant RELAY_ROLE to the new relay and ADMIN_ROLE to the new admin-signer, and revoke stale holders. Otherwise -> **redeploy** with `smart-contract/script/Deploy.s.sol`, keep the broadcast record, and sync the address and ABI everywhere. Record the outcome and the evidence (`hasRole` output) in the phase summary.
- **D-04:** Assume the deployed bytecode matches the current `AttendanceRegistry.sol`. No Basescan source comparison. The ABI consistency check (CHAIN-03) is the guard.
- **D-05:** DEFAULT_ADMIN_ROLE key is **backend-held**: set `DEFAULT_ADMIN_PRIVATE_KEY` in backend env so the dashboard can grant and revoke roles. On a redeploy, the deployer key becomes this key. The owner accepts the hot-key tradeoff for testnet.
- **D-06:** Relay and admin-signer are fresh, separate, testnet-only wallets (CHAIN-02). Generation method, funding amounts and faucet choice are Claude's discretion.
- **D-07:** The root `/.env` is **not gitignored** (only per-package `.gitignore`s exist) and holds three unlabeled secrets (`backend`, `frontend`, `contract`) in a non-dotenv format (label on one line, value on the next). Phase 1 must: (a) add `.env` to a root `.gitignore` before any commit, (b) identify each value's type by its format or a harmless probe without printing it, and move it into the correct `KEY=value` entry in `backend/.env` / `smart-contract/.env` / `frontend/.env.local`, (c) never echo secret values in logs or output. Two of these values were accidentally printed in the discussion session. Recommend the owner rotate them (the `frontend` and `contract` entries) if they turn out to be live secrets.
- **D-08:** `frontend/.env.local` has `NEXT_PUBLIC_PRIVY_APP_ID` empty. It must be filled in (likely one of the root `.env` values) for the local rehearsal.

### Claude's Discretion
- Rehearsal driver (real frontend + Privy vs scripted check-in signed by a viem local account), and whether to commit a `docker-compose.yml` for local Postgres and Redis. Prefer the cheapest route that proves a CONFIRMED row and a token on-chain.
- Drift check design (generate from a single source vs check-only script; CI wiring).
- Boot-guard strictness and how tests bypass the guards (the `createApp()` factory already has no listener, so checks belong in `index.ts` bootstrap).
- Wallet generation (e.g. `cast wallet new`), funding amounts, faucet.

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAIN-01 | Verify role holders with `hasRole`; record keep-or-redeploy | Contract is plain `AccessControl` (not enumerable); `hasRole` against candidate addresses plus constructor-event decode for initial holders; log scan for later grants |
| CHAIN-02 | Separate testnet-only relay and admin-signer, roles granted, funded | Generator script writes keys to `backend/.env` and prints only addresses; role grant paths; funding amounts |
| CHAIN-03 | Address/ABI match across addresses.json, backend, frontend; script/CI enforces | Subset-vs-artifact check script (ABIs in both layers are hand-trimmed subsets, so "identical" is the wrong test); CI job |
| CHAIN-04 | Boot guards: chain ID, code, relay role; `CHAIN_ID` required | `assertChainReady()` in a new module called only from `index.ts` |
| DEPLOY-01 | Redis via `REDIS_URL`, ping at boot, one shared module | `lib/redis.ts` with ioredis; `{ url }` option is ignored by ioredis, so the code silently connects to localhost |
| DEPLOY-05 | Node 22 pinned in CI, engines/.nvmrc, Railway, Vercel | `.nvmrc`, `engines`, `setup-node` `node-version-file`, Railway/Vercel settings |
| DEPLOY-06 | Local rehearsal completes check-in -> CONFIRMED -> token on chain | Scripted rehearsal that patches Privy verification in the script process only |
</phase_requirements>

## Summary

The contract `AttendanceRegistry` inherits OZ `AccessControl` and not `AccessControlEnumerable` [VERIFIED: smart-contract/src/AttendanceRegistry.sol line 5, 11], so holders cannot be listed with a view call. Initial holders (deployer = DEFAULT_ADMIN + ADMIN, `relayWallet` = RELAY) are emitted as `RoleGranted` events in the deployment transaction. Reading one block (`fromBlock == toBlock == deployBlock`) works under any provider's `eth_getLogs` range limit. Later grants/revokes need a bounded range scan from the deploy block. The decision that matters (CONTEXT D-02/D-03) is "does a key I hold have DEFAULT_ADMIN_ROLE", which needs only `hasRole`, no enumeration.

Important finding about the root `.env`: it has 6 lines, alternating label and value. The three value lines are each 62 characters, contain no `0x` prefix, are not hex-only and have no spaces [VERIFIED: shape probe, values not printed]. A private key is 64 hex chars (66 with `0x`), so **none of the three root `.env` values is a private key**. They are API keys or app secrets. The "available deployer key" is therefore very likely not in the repo, so the planner should expect the **redeploy path** unless the owner supplies a key that passes the `hasRole` probe. Root `.gitignore` already exists with `.env` (committed in 48d84c8, without a trailing newline), so D-07(a) is mostly done: only add a trailing newline plus `.env.*` and `!.env.example`.

Local tooling gaps: Foundry is not installed (`~/.foundry/bin` absent, `forge`/`cast` not on PATH), local Node is v25.2.1 with no nvm/fnm/volta, Docker 29.9.2 client is present (daemon status: the `docker info` output showed a client only; verify the daemon is running). `smart-contract/lib/` is absent, so deps must be cloned as CI does before any `forge build`.

**Primary recommendation:** Build four small, testable pieces in order: (1) env/tooling bootstrap + a viem-based `chain:inspect` script, (2) `lib/redis.ts` + `assertChainReady()` guards, (3) `scripts/check-sync` (subset ABI + address) wired into CI with Node 22, (4) a `scripts/rehearse.ts` that runs the real Express app in-process with Privy verification patched at script level and drives create-session -> QR -> check-in -> wait for CONFIRMED -> `balanceOf`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role truth (who may mint/admin) | Chain (contract) | Backend (reads via hasRole) | AccessControl on-chain is the source of truth; admin middleware already reads it |
| Boot guards | API / Backend (`index.ts` bootstrap) | — | Must fail the process before listening; keeps `createApp()` pure for tests |
| Redis connection | API / Backend (`lib/redis.ts`) | — | Shared by Queue and Worker |
| ABI/address consistency | Repo tooling (script + CI) | Contract build artifact | Artifact from `forge build` is the only authoritative ABI |
| Key generation / custody | Backend env (local file, later Railway vars) | — | Hot keys per D-05; never in frontend |
| Rehearsal driver | Backend scripts dir (not shipped) | Docker (Postgres, Redis) | `tsconfig` `include: src/**/*` means `backend/scripts` is not compiled into `dist` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| viem | ^2.23.11 (already in backend) | getChainId, getCode, readContract, getLogs, generatePrivateKey | Already used; no new dep |
| bullmq | 5.71.1 installed [VERIFIED: node_modules] | Queue/Worker | Existing |
| ioredis | 5.10.1 installed as BullMQ transitive dep [VERIFIED: node_modules] | Redis client | BullMQ requires it; declare it explicitly in backend `package.json` (`^5.10.1`) so the shared module imports it legitimately |
| tsx | ^4.19.2 (existing) | Run ops/rehearsal scripts | Existing pattern (`grant-admin.ts`) |
| Foundry (forge, cast) | latest via foundryup | Build artifact, deploy, optional `cast call` | Project standard; must be installed (see Environment) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| docker compose (file `docker-compose.yml`) | Compose v2 | Local Postgres + Redis for rehearsal | Commit it at repo root; Phase 2 reuses the same pairing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Check-only drift script | Generate ABI files from artifact | Backend/frontend ABIs are intentionally trimmed subsets; generating would balloon them and change the typed `as const` surface. Check-only is lower risk |
| Scripted rehearsal | Real frontend + Privy on localhost | Needs a Privy app with `http://localhost:3000` allowed, a phone/browser, an email login. Costlier, and the signed-message path is exercised later in Phase 2 MINT-02 |
| `cast wallet new` | viem `generatePrivateKey` in a script | `cast` prints the key to the terminal (scrollback, shared screen). A script that writes to `backend/.env` and prints only the address satisfies D-01/D-07 |

**Installation:**
```bash
cd backend && npm install ioredis@^5.10.1   # explicit dep; already in lockfile transitively
# Tooling (owner machine), official installer:
curl -L https://foundry.paradigm.xyz | bash && ~/.foundry/bin/foundryup
brew install fnm && fnm install 22 && fnm use 22   # or nvm; Node 25 is what is installed today
```

**Version verification:** installed versions read from `backend/node_modules/{bullmq,ioredis}/package.json`. `npm view ioredis version` was not run; planner should run it and `npm view ioredis scripts.postinstall` as a Wave 0 step.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| ioredis | npm | many years | very high | github.com/redis/ioredis | not run (slopcheck unavailable) | `[ASSUMED]` legit by ecosystem knowledge; already present in lockfile as BullMQ dependency, so adding it as a direct dep introduces no new code. Planner: low-risk, optional `checkpoint:human-verify` |

No other new packages. **Packages removed:** none. **Flagged [SUS]:** none. slopcheck was not run in this session, so ioredis is tagged `[ASSUMED]` per protocol; the mitigating fact is that it is already installed (`node_modules/ioredis`, 5.10.1).

## Architecture Patterns

### System Architecture Diagram

```
 Owner machine
   |
   | (1) gen-wallets.ts --> backend/.env  (keys, never printed; addresses printed)
   | (2) chain-inspect.ts --RPC--> Base Sepolia
   |        getCode / getBlock binary search --> deployBlock
   |        getLogs(RoleGranted/Revoked, deployBlock..) --> holder table
   |        hasRole(role, candidate) --> keep-or-redeploy evidence
   | (3) forge script Deploy.s.sol (only if redeploy) --> new address
   |        --> check-sync (artifact ABI vs backend/frontend ABI, address in 4+ places)
   v
 backend/src/index.ts  (bootstrap only)
   required env (+CHAIN_ID) --> assertChainReady()
        getChainId == CHAIN_ID ? --> getCode(CONTRACT_ADDRESS) != 0x ? --> hasRole(RELAY_ROLE, relay) ? --> pingRedis(REDIS_URL)
        any fail --> logger.error + process.exit(1)
        all ok --> app.listen --> startMintWorker (shared lib/redis.ts)
   v
 Rehearsal (scripts/rehearse.ts, docker compose: postgres + redis)
   Privy getUser patched in-process --> POST /sessions (admin wallet) --> QR --> POST /check-in (member viem account signs)
   --> 202 --> BullMQ --> mint tx on real Sepolia contract --> check_ins.mintStatus=CONFIRMED + balanceOf==1
```

### Recommended Project Structure
```
backend/
├── src/lib/redis.ts            # NEW: createRedis(), pingRedis(); the only place REDIS_URL is read
├── src/lib/bootGuards.ts       # NEW: assertChainReady() (pure functions taking clients, testable with mocks)
├── src/lib/contract.ts         # CHANGE: CHAIN_ID required, no default
├── src/lib/queue.ts            # CHANGE: use redis.ts
├── src/jobs/mint.job.ts        # CHANGE: use redis.ts (worker connection, maxRetriesPerRequest: null)
├── scripts/gen-wallets.ts      # NEW
├── scripts/chain-inspect.ts    # NEW (CHAIN-01 evidence)
└── scripts/rehearse.ts         # NEW (DEPLOY-06)
scripts/check-sync.ts           # NEW at repo root, run with backend's tsx (CHAIN-03)
docker-compose.yml              # NEW (postgres:16 + redis:7)
.nvmrc                          # NEW: 22
```
Put `check-sync.ts` where `tsx` and `viem` resolve: simplest is `backend/scripts/check-sync.ts` with a root-level npm-less invocation `cd backend && npx tsx scripts/check-sync.ts` (reads `../smart-contract/out/...`, `../frontend/lib/contracts/abi.ts`, `../addresses.json`).

### Pattern 1: Shared Redis module (DEPLOY-01)
**What:** One module builds ioredis clients from `REDIS_URL`. ioredis accepts a URL as first argument; an options object with a `url` key is not an ioredis option, so `{ url }` is ignored and the client defaults to `localhost:6379` [VERIFIED: requirement text DEPLOY-01 + CONTEXT; ioredis constructor takes `(url, options)` per README, MEDIUM]. A `rediss://` scheme enables TLS in ioredis [CITED: ioredis README, MEDIUM; confirm in Phase 2 with Railway Redis].
BullMQ requires `maxRetriesPerRequest: null` on connections used by a Worker, and it duplicates the passed instance for blocking commands [CITED: docs.bullmq.io/guide/connections].
```typescript
// backend/src/lib/redis.ts
import IORedis, { type RedisOptions } from 'ioredis';

export function redisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is required');
  return url;
}

/** Worker connections MUST use maxRetriesPerRequest: null (BullMQ throws otherwise). */
export function createRedis(opts: RedisOptions = {}): IORedis {
  return new IORedis(redisUrl(), opts);
}

/** Producer (Queue): lazy so importing the app in tests opens no socket. */
export const queueConnection = () => createRedis({ lazyConnect: true });
/** Worker */
export const workerConnection = () => createRedis({ maxRetriesPerRequest: null });

/** Boot check. Short-lived client, fails fast instead of retrying forever. */
export async function pingRedis(timeoutMs = 5000): Promise<void> {
  const r = createRedis({ lazyConnect: true, connectTimeout: timeoutMs, maxRetriesPerRequest: 1, retryStrategy: () => null });
  try {
    await r.connect();
    const pong = await r.ping();
    if (pong !== 'PONG') throw new Error(`unexpected ping reply: ${pong}`);
  } finally {
    r.disconnect();
  }
}
```
`queue.ts` becomes `new Queue(MINT_QUEUE, { connection: queueConnection() })`; `mint.job.ts` passes `workerConnection()`. Remove the `?? 'redis://localhost:6379'` fallbacks (a silent fallback is the bug). Existing tests mock `../src/lib/queue` wholesale (`api.test.ts`, `members.me.test.ts`, `mint.job.test.ts`), so they never touch redis.ts; verify that `mint.job.ts` importing `redis.ts` at module scope does not throw when `REDIS_URL` is set by `TEST_ENV` (it is) and construct the connection inside `startMintWorker()`, not at import time.

### Pattern 2: Boot guards (CHAIN-04)
**What:** Pure async function with injected clients, called only from `index.ts` before `listen`. Tests never import `index.ts`, so unaffected; add a unit test for `assertChainReady` with a fake client.
```typescript
// backend/src/lib/bootGuards.ts
import { getAddress } from 'viem';
import { RELAY_ROLE } from './roles';
import { ATTENDANCE_ABI } from './abi';

export async function assertChainReady(c: {
  publicClient: { getChainId(): Promise<number>; getCode(a: { address: `0x${string}` }): Promise<`0x${string}` | undefined>; readContract(a: any): Promise<unknown> };
  expectedChainId: number; contract: `0x${string}`; relay: `0x${string}`;
}): Promise<void> {
  const actual = await c.publicClient.getChainId();
  if (actual !== c.expectedChainId) throw new Error(`RPC chain ${actual} != CHAIN_ID ${c.expectedChainId}`);
  const code = await c.publicClient.getCode({ address: c.contract });
  if (!code || code === '0x') throw new Error(`No contract code at ${c.contract} on chain ${actual}`);
  const ok = await c.publicClient.readContract({ address: c.contract, abi: ATTENDANCE_ABI, functionName: 'hasRole', args: [RELAY_ROLE, getAddress(c.relay)] });
  if (ok !== true) throw new Error(`Relay ${c.relay} lacks RELAY_ROLE on ${c.contract}`);
}
```
`index.ts` flow: required-env loop (add `CHAIN_ID`), validate `CHAIN_ID` parses to 84532 or 8453, `await assertChainReady`, `await pingRedis()`, then `listen` and `startMintWorker()`. Wrap in `main().catch(e => { logger.error(...); process.exit(1) })`. In `contract.ts` remove the `?? '84532'` default and throw on a non-numeric or unsupported value. `index.ts` currently does `export default app` at module scope after listen; keep a harmless export or drop it (nothing imports index.ts; verify with grep). Also have the guard log the alchemy URL **without the key**.

Optional (cheap, recommended): also guard that `ADMIN_SIGNER` holds `ADMIN_ROLE` (warn, not exit) and that relay != admin signer (exit), supporting CHAIN-02 separation at runtime.

### Pattern 3: Role inspection without enumeration (CHAIN-01)
Roles: `DEFAULT_ADMIN_ROLE = 0x00..00`; `ADMIN_ROLE = keccak256("ADMIN_ROLE")`, `RELAY_ROLE = keccak256("RELAY_ROLE")` (already in `lib/roles.ts`). The backend ABI has `hasRole` but not `RoleGranted`/`RoleRevoked`; define those inline with `parseAbi` in the script.
1. **Evidence for the decision (D-02):** for each address derivable from available keys (env keys, plus any address the owner supplies), `hasRole` for the three roles. Print a table of addresses (not keys).
2. **Initial holders:** binary-search the deploy block with `publicClient.getCode({ address, blockNumber })` (first block where code exists; needs archive state, which Alchemy provides [ASSUMED]). Then `getLogs({ address, event: RoleGranted, fromBlock: deployBlock, toBlock: deployBlock })`: a single block cannot hit a range limit and yields the constructor grants (deployer and relayWallet), which also reveals the original `RELAY_WALLET`.
3. **Later changes:** scan `deployBlock+1 .. latest` in chunks. Alchemy free tier restricts `eth_getLogs` block range; the exact Base Sepolia number is not published in what I found [CITED: support.alchemy.com article says the free tier limit is small and plan-dependent]. Make the chunk size a CLI flag, default 10 (safe) with automatic backoff/growth, and fall back to the Blockscout/Basescan API (`getLogs` by address) if scanning is too slow. Contract is young and unused, so the span is usually small. Net each holder by processing grants/revokes in order.
4. Record all of this to `01-ROLES.md` or the phase summary.

Basescan v1 API base in `foundry.toml` (`api-sepolia.basescan.org/api`) may be deprecated in favor of the Etherscan V2 unified API; do not depend on it [ASSUMED, verify before using `--verify`].

### Pattern 4: Drift check design (CHAIN-03)
**Key fact:** `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts` are hand-written subsets (19 function/event/error entries total counted across both files; backend has createSession, closeSession, mint, getSession, balanceOf, hasRole, SessionCreated, SessionClosed, TokenMinted, setBaseCid, grantRole, revokeRole, and four errors) [VERIFIED: grep]. `.claude/commands/sync-abi.md` is stale: it targets `frontend/lib/contracts/abis/*.json` and `backend/lib/abis/*.json`, paths that do not exist. Update or delete that doc as part of the task so it stops misleading.

**Check (`backend/scripts/check-sync.ts`, run with tsx):**
1. Load `smart-contract/out/AttendanceRegistry.sol/AttendanceRegistry.json` `.abi` (fail with a clear "run forge build" message if missing).
2. Import `ATTENDANCE_ABI` from `../src/lib/abi` and from `../../frontend/lib/contracts/abi` (frontend file has no imports [VERIFIED], so tsx can load it).
3. Canonical key per entry: `type:name(inputTypes)` with tuple components expanded; compare normalized JSON (`type, name, inputs[name,type,indexed,components], outputs, stateMutability`) with `internalType` stripped. Every entry of each layer must exist in the artifact with an identical normalized form. Report extra/missing/mismatched entries. Also require that each layer contains the functions the code actually calls (hard-code the list `createSession, closeSession, mint, balanceOf, hasRole, grantRole, revokeRole, setBaseCid, getSession` for backend; derive for frontend by grep or a fixed list).
4. Addresses (case-insensitive via `getAddress`): `addresses.json["AttendanceRegistry"]["base-sepolia"]`, `backend/.env.example` `CONTRACT_ADDRESS`, `frontend/.env.example` `NEXT_PUBLIC_CONTRACT_ADDRESS` (currently empty, must be filled with the address) and, when present locally, `backend/.env`, `frontend/.env.local`. Missing optional local files are skipped; example files and addresses.json are mandatory. `frontend/lib/contracts/addresses.ts` reads only the env var, so it needs no literal; the check confirms it still does (grep for `NEXT_PUBLIC_CONTRACT_ADDRESS`).
5. Optional on-chain step flag `--onchain`: `getCode(address)` non-empty on 84532.

Unit-test the comparator with a small fixture (matching, mutated input type, missing entry) in `backend/test/check-sync.test.ts` so the check itself is verified.

**CI wiring:** in `.github/workflows/ci.yml` add job `sync-check` (or extend `contract`): checkout, foundry-toolchain, the same OZ/forge-std clone step, `forge build`, `actions/setup-node@v4` with `node-version-file: .nvmrc`, `cd backend && npm ci && npx tsx scripts/check-sync.ts`. CI step is a hard failure.

### Pattern 5: Rehearsal driver (DEPLOY-06)
Auth is `PrivyClient.getUser({ idToken })` in `middleware/auth.ts` with a lazily constructed module-private client; admin authorization is the on-chain `ADMIN_ROLE` of `req.user.walletAddress` [VERIFIED: code]. Existing tests bypass it with `vi.mock('@privy-io/server-auth')`. The same idea works for a script without touching production code:
```typescript
// backend/scripts/rehearse.ts (never imported by src, never compiled into dist)
import 'dotenv/config';
import { PrivyClient } from '@privy-io/server-auth';
// Script-process-only patch: tokens "admin" / "member" map to local viem accounts.
(PrivyClient.prototype as any).getUser = async ({ idToken }: { idToken: string }) =>
  ({ id: `did:privy:rehearsal-${idToken}`, wallet: { address: idToken === 'admin' ? adminAccount.address : memberAccount.address } });
// then: const { createApp } = await import('../src/app'); listen on random port; startMintWorker();
```
Refuse to run unless `NODE_ENV !== 'production'` and `CHAIN_ID === '84532'`. Sequence: `assertChainReady`, `POST /api/v1/sessions` with `Bearer admin` (creates session on-chain via the admin signer; wait for `onchainStatus` CONFIRMED), fetch QR via the sessions QR route (check `routes/sessions.ts` for exact path and body at planning time), build the member signature with `memberAccount.signMessage({ message: \`I am checking into session ${sessionId} as ${memberAddress.toLowerCase()} at ${signedAt}\` })` (message format from `routes/check-in.ts` step 3; address is the lowercase `req.user.walletAddress`), `POST /api/v1/check-in` with `{ qrPayload, memberSignature, signedAt }` expecting 202, poll Prisma until `mintStatus === 'CONFIRMED'` and `txHash` set, then `balanceOf(member, sessionId) == 1n` via `tokenBalanceOnChain`. Print the Basescan tx URL. Member account is a throwaway `generatePrivateKey()` per run (no funding needed: the relay pays gas). Also assert a second check-in returns 409 (cheap bonus).

Real Privy through the frontend is deferred to Phase 2 (MINT-02) and is not required to satisfy success criterion 5.

### Anti-Patterns to Avoid
- **Silent defaults for chain/redis:** `CHAIN_ID ?? '84532'` and `REDIS_URL ?? localhost` hide misconfiguration. Make both required.
- **Identical-ABI comparison:** the layers are subsets by design; an equality check would fail on day one or push a rewrite.
- **Test bypass flags in production code** (e.g. `SKIP_AUTH=true`): weakens prod. Keep the Privy patch in the script.
- **Constructing BullMQ connections at module import** in a file that tests import (opens sockets).
- **`cast wallet new` output in logs/chat.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role checks | Custom DB/role tables | on-chain `hasRole` | Already the source of truth |
| Key generation | Math.random / custom | viem `generatePrivateKey` or `cast wallet new` | CSPRNG, correct format |
| Redis URL parsing/TLS | Manual host/port/tls parsing | `new IORedis(url, opts)` | Handles `redis://`, `rediss://`, auth |
| Retry/backoff for RPC | Custom loops | viem `http()` transport retry defaults | Built in |
| ABI comparison | String diff | Normalize JSON then deep-equal (canonical key per entry) | Order/whitespace/`internalType` noise |
| Postgres/Redis locally | Homebrew-managed services | `docker-compose.yml` | Reproducible, same versions as Railway later |

## Runtime State Inventory

(Applies only partially: a possible redeploy changes the contract address everywhere.)

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Postgres rows reference `sessionIdOnchain` for sessions created against the old contract; no production DB exists yet (never run end to end) | None for a fresh local DB; on redeploy use a clean DB for the rehearsal |
| Live service config | Privy dashboard: app ID/secret, allowed origins (Phase 2). No Alchemy webhook is consumed (TokenEvent indexer unused) | None this phase |
| OS-registered state | None found | None |
| Secrets/env vars | `CONTRACT_ADDRESS` (backend), `NEXT_PUBLIC_CONTRACT_ADDRESS` (frontend, currently empty in `.env.example`), `addresses.json`; Vercel env var (believed deployed) will hold the old address | Update all on redeploy; Vercel env update is a Phase 2 manual step but must be listed in the redeploy checklist |
| Build artifacts | `smart-contract/out/` and `lib/` absent locally; `backend/dist` stale if present | Run `forge build` before `check-sync`; deps clone as in CI |

## Common Pitfalls

### Pitfall 1: `{ url }` Redis option is silently ignored
**What goes wrong:** Queue/Worker connect to localhost. Works on a dev machine, fails on Railway.
**How to avoid:** Use `new IORedis(url, opts)`; the rehearsal should run with a non-default Redis (for example `redis://localhost:6380`) to prove `REDIS_URL` is honored.
**Warning signs:** Connection refused to 127.0.0.1:6379 in production logs.

### Pitfall 2: Worker connection without `maxRetriesPerRequest: null`
BullMQ throws on Worker construction with a default ioredis client. Use `workerConnection()`.

### Pitfall 3: Backend `hasRole` ABI check passes while frontend ABI drifts
Frontend ABI is not read by the backend; only the check script and CI catch it.

### Pitfall 4: Wrong-chain RPC
`contract.ts` derives the RPC from `CHAIN_ID` (`base-sepolia` vs `base-mainnet`) but not the reverse: a wrong `CHAIN_ID` silently hits mainnet. The `getChainId` guard compares the node's reported chain to `CHAIN_ID`; also assert `CHAIN_ID` is in {84532, 8453}.

### Pitfall 5: Deploy script needs a signer flag
`Deploy.s.sol` calls `vm.startBroadcast()` with no key, so `forge script` must be given `--private-key` (or `--account`). `.claude/commands/deploy.md` says `PRIVATE_KEY` goes in `smart-contract/.env`, which is consistent only if the command passes `--private-key $PRIVATE_KEY`. Read `deploy.md` fully at planning time. Env needed: `RELAY_WALLET` (new relay address), `BASE_CID`, `ALCHEMY_API_KEY`. `smart-contract/.gitignore` ignores `.env.example` too (odd), but does **not** ignore `broadcast/`, so the broadcast record stays committable per D-03.

### Pitfall 6: Local DB vs test DB
`test/globalSetup.ts` runs `createdb onchain_attendance_test` against a local Postgres (not Docker), with a default URL containing another person's username. Not a Phase 1 blocker, but running `npm test` locally needs either `TEST_DATABASE_URL` pointed at the docker Postgres or `createdb` on PATH. Document `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/onchain_attendance_test` against the compose DB (compose should expose 5432 with those credentials, matching CI).

### Pitfall 7: Node version drift
Local Node is 25.2.1; CI is 20. Prisma 5.22.0 and BullMQ 5.71.1 are fine on Node 22 in principle [ASSUMED, not tested]; run `npm ci && npm run build && npm test` under Node 22 as the first DEPLOY-05 verification rather than assuming. Next 14.2.35 supports Node 22 [ASSUMED].

### Pitfall 8: Secrets in the root `.env`
Probe without printing: use shape tests only (length, hex, prefix class). Harmless live probes for classification: Alchemy key -> `curl -s -o /dev/null -w "%{http_code}" https://base-sepolia.g.alchemy.com/v2/$KEY -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' -H 'content-type: application/json'` (200 = valid, key referenced from a shell variable, never echoed). Privy app ID is a short cuid-like string and app secret is much longer; with all three at 62 chars none matches a typical Privy ID (about 25 chars) [ASSUMED], so type remains undetermined. Treat labels as authoritative if the owner confirms them; otherwise the probe tells Alchemy-or-not. Anything not identifiable: ask the owner to retrieve fresh keys from Privy and Alchemy dashboards instead of guessing (rotation is already recommended by D-07). Because the values were printed in a session, rotate the `frontend` and `contract` entries.

## Code Examples

### Role holder table
```typescript
// Source: viem docs (getLogs with parseAbiItem), OZ AccessControl events
const RoleGranted = parseAbiItem('event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)');
const RoleRevoked = parseAbiItem('event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)');
const logs = await publicClient.getLogs({ address, event: RoleGranted, fromBlock: deployBlock, toBlock: deployBlock });
```

### Deploy block by binary search
```typescript
let lo = 0n, hi = await publicClient.getBlockNumber();
while (lo < hi) {
  const mid = (lo + hi) / 2n;
  const code = await publicClient.getCode({ address, blockNumber: mid });
  if (code && code !== '0x') hi = mid; else lo = mid + 1n;
}
const deployBlock = lo; // ~log2(N) RPC calls (about 25)
```

### docker-compose.yml
```yaml
services:
  postgres:
    image: postgres:16
    environment: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: onchain_attendance }
    ports: ["5432:5432"]
  redis:
    image: redis:7
    command: ["redis-server", "--maxmemory-policy", "noeviction"]
    ports: ["6379:6379"]
```
Backend `.env` for the rehearsal: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/onchain_attendance`, then `npx prisma migrate deploy` (this also validates the migration set). Redis `noeviction` mirrors the Phase 2 requirement.

### Wallet generation without printing keys
```typescript
// backend/scripts/gen-wallets.ts (viem)
const k = generatePrivateKey(); const a = privateKeyToAccount(k);
// append `RELAY_PRIVATE_KEY=${k}` to backend/.env only if absent; console.log(label, a.address)
```
Generate three: relay, admin-signer, default-admin/deployer (`DEFAULT_ADMIN_PRIVATE_KEY`). Refuse to overwrite existing values; refuse if any two keys are equal.

### Role wiring after wallets exist
- **Keep path** (a key with DEFAULT_ADMIN_ROLE exists): sign with that key (it must be `DEFAULT_ADMIN_PRIVATE_KEY`), `grantRole(RELAY_ROLE, newRelay)`, `grantRole(ADMIN_ROLE, newAdminSigner)`, `revokeRole` for stale holders found in the inspection. `relay.service.ts` already has helpers for grant/revoke (grantAdminRoleOnChain and siblings; check names at planning time). The relay role grant helper may be admin-only, so verify.
- **Redeploy path:** fund the new default-admin wallet first (deploy gas), then `forge script script/Deploy.s.sol --rpc-url base_sepolia --private-key $DEFAULT_ADMIN_PRIVATE_KEY --broadcast` with `RELAY_WALLET=<new relay>`. The constructor makes the deployer DEFAULT_ADMIN + ADMIN and the relay RELAY. **Then grant ADMIN_ROLE to the admin-signer** (separate wallet, CHAIN-02) with the default-admin key. The deployer keeps ADMIN_ROLE by constructor; revoke it after if you want strict separation (optional on testnet). Update `addresses.json`, `.env.example`s, local env files, then run `check-sync`.

Funding (Base is an L2; the per-tx cost is tiny: an ERC-1155 mint is on the order of 50k-100k gas [ASSUMED] and Base Sepolia gas prices are typically far below 1 gwei [ASSUMED]): relay 0.05 ETH (backend warns below 0.005 `RELAY_MIN_BALANCE_ETH`; thousands of mints), admin-signer 0.02 ETH, default-admin/deployer 0.05 ETH (deployment plus occasional role/baseCid txs). Faucets: Alchemy Base Sepolia faucet drips 0.1 ETH per 24h per address [CITED: alchemy.com/faucets/base-sepolia]; Coinbase Developer Platform faucet is another option, ETH limits unverified [LOW]. One faucet claim per address means three addresses and potentially three claims; alternatively claim to one wallet and have it forward ETH with `cast send`/viem (cheaper human effort: one claim, scripted split). Recommend: owner claims once to the default-admin address, and a script splits to relay and admin-signer.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Basescan v1 `api-sepolia.basescan.org` | Etherscan V2 unified API (chainid param) | `foundry.toml` `[etherscan]` may need update for `--verify` [ASSUMED] |
| `.nvmrc`-less Node | Node 22 LTS | Pin per DEPLOY-05 |

## Node 22 Pinning (DEPLOY-05)

- `.nvmrc` at repo root containing `22`.
- `backend/package.json` and `frontend/package.json`: `"engines": { "node": ">=22 <23" }`. Railway/Nixpacks reads `engines.node` (and `.nvmrc`) to choose the Node version; can also set Railway service variable `NIXPACKS_NODE_VERSION=22` [ASSUMED, verify in Phase 2 build logs]. Because `backend/railway.toml` builds from the `backend/` directory, put `.nvmrc` in `backend/` too (or rely on engines).
- CI: replace `node-version: '20'` with `node-version-file: .nvmrc` in both jobs (backend, frontend) and in the new sync job. Postgres service image `postgres:14` in CI can stay.
- Vercel: Project Settings -> Node.js Version 22.x, and `engines` in `frontend/package.json` is honored by Vercel [ASSUMED]; this is a dashboard check for the owner (one human step) in Phase 2.
- Verification: `node -v` in CI log prints `v22.x`; local `fnm use` or `nvm use` then `npm ci && npm run build && npm test`.
- Also fix CI for TEST-05 later (out of scope here): `--if-present` stays for now.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Root `.env` values are not private keys (inferred from length 62, non-hex) and are not typical Privy IDs | Summary, Pitfall 8 | If one is actually a key in an unusual encoding, redeploy might be avoidable; the `hasRole` probe will still decide |
| A2 | Alchemy supports archive `getCode` at historical blocks (binary search) | Pattern 3 | Fallback: Blockscout/Basescan contract-creation lookup |
| A3 | Alchemy free-tier `eth_getLogs` range on Base Sepolia is small; chunk default 10 with backoff | Pattern 3 | Slower scan only |
| A4 | Mint gas about 50k-100k and Base Sepolia gas far below 1 gwei, so funding amounts are generous | Funding | Under-funding; the existing startup warning at 0.005 ETH catches it |
| A5 | Node 22 compatible with Prisma 5.22, BullMQ 5.71, Next 14.2.35 | Pitfall 7 | Run the build/test on Node 22 first |
| A6 | Railway Nixpacks picks Node from `engines.node` / `NIXPACKS_NODE_VERSION`; Vercel honors `engines` | Node 22 | Phase 2 build logs reveal; low cost to fix |
| A7 | `rediss://` enables TLS in ioredis automatically | Pattern 1 | Test against Railway Redis in Phase 2 |
| A8 | Basescan v1 API may be deprecated in favor of Etherscan V2 | State of the Art | Only affects `--verify`; verification is optional |
| A9 | ioredis is legitimate (slopcheck not run) | Package audit | Already in lockfile via bullmq |

## Open Questions

1. **Does the owner have any key that holds DEFAULT_ADMIN_ROLE?**
   - Known: root `.env` values are not key-shaped; D-02 says unverified.
   - Recommendation: Task 1 runs the inspection with all keys found in env files (none likely) plus ask for the original deployer *address* (public) and compare with the creation tx's `RoleGranted` sender. If no matching key: redeploy (D-03). Plan both branches; the redeploy branch is the expected one.
2. **Exact sessions QR route/body for the rehearsal** — read `backend/src/routes/sessions.ts` (lines 21, 72, 92, 132) at planning time; not read in this research.
3. **Is the Docker daemon running?** `docker info` showed only the client section; check `docker ps` in Wave 0.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Foundry (forge/cast) | build artifact, deploy | No (`~/.foundry` absent) | — | Install via foundryup (official script); CI has it via foundry-toolchain |
| Node 22 | DEPLOY-05 | No (local is v25.2.1; no nvm/fnm/volta) | 25.2.1 | `brew install fnm` |
| Docker | Postgres/Redis | Client 29.9.2 present; daemon unverified | 29.9.2 | Homebrew postgres/redis |
| Alchemy API key | RPC | Unknown (root `.env` values unclassified) | — | Free Alchemy account, or public `https://sepolia.base.org` for read scripts |
| `smart-contract/lib` (OZ v5.1.0, forge-std v1.9.4) | forge build | No | — | Clone per CI step |
| backend/node_modules | scripts | Yes | — | — |

**Missing with no fallback:** none. **Needing owner action:** faucet claim (one human step), confirm Privy app ID/secret values.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.1.9 + supertest (backend); forge test (contract) |
| Config file | `backend/vitest.config.ts` (globalSetup needs local Postgres via `TEST_DATABASE_URL`) |
| Quick run command | `cd backend && npx vitest run test/bootGuards.test.ts test/check-sync.test.ts` |
| Full suite command | `cd backend && npm test` ; `cd smart-contract && ~/.foundry/bin/forge test -vvv` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAIN-01 | Role table printed; decision recorded | manual + script | `cd backend && npx tsx scripts/chain-inspect.ts` ; evidence pasted in phase SUMMARY | Wave 0 |
| CHAIN-02 | relay != admin-signer; roles held; balances > min | script | `npx tsx scripts/chain-inspect.ts --check` exits non-zero if relay lacks RELAY_ROLE, signer lacks ADMIN_ROLE, equal keys, or balance < threshold | Wave 0 |
| CHAIN-03 | ABI subset + address agreement | unit + CI | `cd backend && npx vitest run test/check-sync.test.ts` ; `npx tsx scripts/check-sync.ts` (after `forge build`); CI job `sync-check`; negative test: mutate one address and see failure | Wave 0 |
| CHAIN-04 | Boot refuses wrong chain / no code / no role; Redis ping | unit + smoke | `npx vitest run test/bootGuards.test.ts` (fake client cases) ; manual: start with wrong `CHAIN_ID=8453` and bad address, expect exit code 1 | Wave 0 |
| DEPLOY-01 | `REDIS_URL` honored; ping; one module | unit + smoke | grep guard: no `process.env.REDIS_URL` outside `lib/redis.ts` ; run with Redis on port 6380 and see worker connect; `redis-cli -p 6380 ping` | Wave 0 |
| DEPLOY-05 | Node 22 everywhere | CI + manual | CI log `node -v`; `grep -R "node-version" .github`; `cat .nvmrc`; `grep engines */package.json` | Wave 0 |
| DEPLOY-06 | check-in -> CONFIRMED -> token | e2e script | `docker compose up -d && cd backend && npx prisma migrate deploy && npx tsx scripts/rehearse.ts` (exit 0; prints txHash and balance 1) under Node 22 | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npm run typecheck && npx vitest run` for touched tests
- **Per wave merge:** `npm test` (backend) + `check-sync`
- **Phase gate:** full suite green plus a captured successful `rehearse.ts` run before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/test/bootGuards.test.ts`, `backend/test/check-sync.test.ts`
- [ ] `backend/scripts/{gen-wallets,chain-inspect,check-sync,rehearse}.ts`
- [ ] `docker-compose.yml`, `.nvmrc`
- [ ] Install Foundry; clone `smart-contract/lib`; `forge build` to produce `out/`
- [ ] Node 22 on the owner machine

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (unchanged) | Privy token verification stays untouched; rehearsal patch lives in a script only, hard-fails if `NODE_ENV=production` |
| V4 Access Control | yes | On-chain roles; relay != admin-signer enforced at boot/script |
| V5 Input Validation | limited | `CHAIN_ID` and addresses validated at boot (`isAddress`, allowed chain set) |
| V6 Cryptography | yes | viem key generation (CSPRNG); never hand-roll |
| V7/V8 Logging, Data protection | yes | Never log keys or the Alchemy URL with key; redact in guard errors |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Secret committed to git | Info disclosure | Root `.gitignore` (`.env`, `.env.*`, `!.env.example`); verify with `git check-ignore -v`; run a secret scan before first commit of env-adjacent files; rotate values printed in discussion |
| Wrong-chain/mainnet misrouting | Tampering | `getChainId` guard, required `CHAIN_ID` |
| Relay key equals admin key (single point of compromise) | Elevation | Boot/script check that they differ |
| Stale role holders | Elevation | Revoke after inspection; `check --roles` output |
| Hot DEFAULT_ADMIN key in backend | Elevation | Accepted by D-05 for testnet; log as SEC-V2-01 for mainnet |
| Printing secrets in tool output | Info disclosure | Scripts print addresses only; shape-probe the root `.env`, move values with `awk`/script without echo |

## Sources

### Primary (HIGH)
- Codebase read: `AttendanceRegistry.sol`, `Deploy.s.sol`, `index.ts`, `queue.ts`, `mint.job.ts`, `contract.ts`, `auth.ts`, `admin.ts`, `check-in.ts`, `relay.service.ts`, `abi.ts` (both), `ci.yml`, `railway.toml`, `.claude/commands/{sync-abi,deploy}.md`, test harness files
- https://docs.bullmq.io/guide/connections - connection sharing, `maxRetriesPerRequest: null` for workers

### Secondary (MEDIUM)
- https://www.alchemy.com/faucets/base-sepolia - 0.1 ETH per 24h
- https://support.alchemy.com/articles/1883074130-why-do-i-see-a-free-tier-error-when-calling-eth-getlogs-with-a-large-block-range - free-tier getLogs range restriction (number not stated)

### Tertiary (LOW)
- Training knowledge for ioredis `rediss://` TLS, Nixpacks/Vercel Node selection, gas costs, Basescan V2 migration (all tagged [ASSUMED])

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libs already in repo
- Architecture: HIGH for guards/Redis/drift (code-verified); MEDIUM for the rehearsal patch (depends on session routes not yet read)
- Pitfalls: MEDIUM - provider limits unverified
- Funding/faucets: LOW-MEDIUM

**Research date:** 2026-10-27
**Valid until:** 2026-11-26 (faucet and provider limits change faster)
