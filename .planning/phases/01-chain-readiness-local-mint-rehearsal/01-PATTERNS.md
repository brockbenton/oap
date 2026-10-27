# Phase 1: Chain Readiness & Local Mint Rehearsal - Pattern Map

**Mapped:** 2026-10-27
**Files analyzed:** 17 new/modified
**Analogs found:** 15 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/lib/redis.ts` (new) | utility | request-response | `backend/src/lib/queue.ts` (connection block) | role-match |
| `backend/src/lib/queue.ts` (mod) | service/lib | event-driven | itself | exact |
| `backend/src/jobs/mint.job.ts` (mod) | job | event-driven | itself | exact |
| `backend/src/lib/bootGuards.ts` (new) | utility | request-response | `backend/src/services/onchain.service.ts` (+ `middleware/admin.ts` hasRole) | role-match |
| `backend/src/lib/contract.ts` (mod) | config | request-response | itself | exact |
| `backend/src/index.ts` (mod) | bootstrap | request-response | itself | exact |
| `backend/scripts/chain-inspect.ts` (new) | utility script | batch | `backend/scripts/grant-admin.ts` | role-match |
| `backend/scripts/gen-wallets.ts` (new) | utility script | file-I/O | `backend/scripts/grant-admin.ts` | partial |
| `backend/scripts/check-sync.ts` (new) | utility script | transform | `backend/scripts/grant-admin.ts` | partial |
| `backend/scripts/rehearse.ts` (new) | utility script | request-response | `backend/test/api.test.ts` (Privy mock, supertest) + routes | role-match |
| `backend/test/bootGuards.test.ts` (new) | test | request-response | `backend/test/mint.job.test.ts` | role-match |
| `backend/test/check-sync.test.ts` (new) | test | transform | `backend/test/mint.job.test.ts` | role-match |
| `.github/workflows/ci.yml` (mod) | config | batch | itself | exact |
| `docker-compose.yml` (new) | config | n/a | CI `services.postgres` block in ci.yml | partial |
| `.nvmrc`, `engines` in package.json (new/mod) | config | n/a | none | no analog |
| `.gitignore` root (mod), `addresses.json`, `.env.example`s | config | n/a | existing files | exact |
| `.claude/commands/sync-abi.md` (mod) | doc | n/a | itself (stale) | exact |

## Rehearsal-critical facts (read from source)

- Admin routes require `authMiddleware` then `adminMiddleware` (on-chain `ADMIN_ROLE` of `req.user.walletAddress`). So the rehearsal "admin" Privy identity must map to a wallet that holds ADMIN_ROLE. The ADMIN_SIGNER wallet (`adminAccount`) is the natural choice (it needs ADMIN_ROLE anyway to call `createSession`). The QR is signed by `adminAccount`, which is also the on-chain session creator.
- `POST /api/v1/sessions` body (zod `createSessionSchema`, sessions.ts:13-18): `{ sessionId: "<numeric string>", date: "<ISO datetime string, z.string().datetime()>", name: string 1-200, semester: string 1-100 }`. Returns 201 `{ data: { id, sessionId, onchainStatus: 'CONFIRMED', txHash, ... } }` only after the on-chain tx is mined (relay waits for receipt, synchronous, up to 120s). 409 `CONFLICT` if sessionId exists; 500 `CHAIN_ERROR` on chain failure (DB row marked FAILED). Use a unique sessionId per run (e.g. `Date.now()` as string) since the contract has one token id per session and DB is unique on it.
- `GET /api/v1/sessions/:sessionId/qr` (admin only): 409 if closed or `onchainStatus !== 'CONFIRMED'`. Returns `{ data: { qr: "<base64 string>" } }`.
- `POST /api/v1/check-in` body (check-in.ts:17-21): `{ qrPayload: string (the qr base64), memberSignature: 0x-hex, signedAt: number (ms int) }`. Returns 202 `{ data: { checkInId, jobId, sessionId, memberAddress, status: 'PENDING' } }`. Errors: 400 `STALE_SIGNATURE` (signedAt older than 60s or >10s future), 400 `INVALID_QR`, 400 `ADDRESS_MISMATCH`, 409 `ALREADY_CHECKED_IN`, 409 `SESSION_NOT_READY`. Route is behind `checkInLimiter`.
- `signedAt` must be `Date.now()` at signing time. Sign exactly the string with the **lowercase** wallet address (`req.user.walletAddress` is lowercased in auth.ts:41).
- Mint is async: poll `prisma.checkIn` for `mintStatus === 'CONFIRMED'` and `txHash`. The worker only runs if `startMintWorker()` is called (in `index.ts` only), so the rehearsal must start it in-process.
- `contract.ts`, `qr.service.ts`, `relay.service.ts` read env at module load (`process.env.RELAY_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `QR_TTL_MS`). In `rehearse.ts` call `import 'dotenv/config'` first and use dynamic `await import('../src/app')` after setting env and the Privy patch.

## Pattern Assignments

### `backend/scripts/rehearse.ts` (utility script, request-response)

**Analogs:** `backend/scripts/grant-admin.ts` (script shell), `backend/src/routes/check-in.ts` and `sessions.ts` (request shapes), `backend/test/api.test.ts` (Privy mocking idea; read it for supertest usage before writing).

**Script shell pattern** (`backend/scripts/grant-admin.ts` lines 1-3, 41-47): `import 'dotenv/config'` first, `main().catch(...)` with `process.exit(1)`, `prisma.$disconnect()` in finally.
```typescript
import 'dotenv/config';
import { isAddress, getAddress } from 'viem';
import prisma from '../src/lib/prisma';
// ...
main().catch((err) => {
  console.error('Failed to grant admin:', err instanceof Error ? err.message : err);
  process.exit(1);
});
```
(Scripts under `backend/scripts` use `console.log` intentionally; `src` uses pino `logger`.)

**Auth patch seam** (`middleware/auth.ts` 5-15, 40-46): `getPrivy()` lazily builds a `PrivyClient`; auth calls `getPrivy().getUser({ idToken: token })` and reads `user.id` and `user.wallet?.address`. Patch `PrivyClient.prototype.getUser` in the script process before `createApp()` handles requests:
```typescript
import { PrivyClient } from '@privy-io/server-auth';
(PrivyClient.prototype as any).getUser = async ({ idToken }: { idToken: string }) => ({
  id: `did:privy:rehearsal-${idToken}`,
  wallet: { address: idToken === 'admin' ? adminAccount.address : memberAccount.address },
});
```
Note: backend CLAUDE.md forbids `any`; use a typed cast (`as unknown as { getUser: (a: {idToken: string}) => Promise<unknown> }`) or a `// eslint-disable-next-line` style comment since the script is not compiled by `tsc` (`include: src/**/*`). Construct PrivyClient needs `PRIVY_APP_ID/SECRET` env non-empty, but no network call occurs once patched (the constructor itself does not call out; verify at run time).

**Flow to drive** (all against `app.listen(0)` ephemeral port or supertest):
```typescript
// 1. create session (admin)
POST /api/v1/sessions  Authorization: Bearer admin
  { sessionId: String(Date.now()), date: new Date().toISOString(), name: 'Rehearsal', semester: 'Test' }  -> 201
// 2. QR
GET /api/v1/sessions/:sessionId/qr  Bearer admin -> { data: { qr } }
// 3. member signature (check-in.ts:51 builds the message; address lowercase)
const signedAt = Date.now();
const memberSignature = await memberAccount.signMessage({
  message: `I am checking into session ${sessionId} as ${memberAccount.address.toLowerCase()} at ${signedAt}`,
});
// 4. check-in
POST /api/v1/check-in  Bearer member  { qrPayload: qr, memberSignature, signedAt } -> 202
// 5. poll prisma.checkIn.findUnique({ where: { id: checkInId } }) until mintStatus === 'CONFIRMED'
// 6. tokenBalanceOnChain(memberAccount.address, sessionId) === 1n   (services/onchain.service.ts:19)
// 7. repeat step 3-4 with fresh signedAt -> expect 409 ALREADY_CHECKED_IN
```
Member's `sessionId` in the message is `qr.sessionId` (the QR payload's sessionId string), identical to the created `sessionId`.

**Safety guards to copy from RESEARCH Pattern 5:** refuse unless `NODE_ENV !== 'production'` and `CHAIN_ID === '84532'`; start worker via `startMintWorker()` from `../src/jobs/mint.job` after the redis.ts refactor; close the worker, queue and prisma at the end so the process exits.

**Error envelope to assert:** `{ error: { code, message } }`; success `{ data }`.

---

### `backend/src/lib/redis.ts` (utility, new) and `queue.ts` / `mint.job.ts` modifications

**Analog (the bug to fix):** `backend/src/lib/queue.ts` lines 11-18:
```typescript
const connection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  // Defer the Redis connection until the first enqueue so importing the app
  // (e.g. in tests) does not open a socket.
  lazyConnect: true,
};
export const mintQueue = new Queue<MintJobData>(MINT_QUEUE, { connection });
```
and `backend/src/jobs/mint.job.ts` line 9 (`const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };`) used at line 89 `{ connection, concurrency: 1 }`.

**Keep:** the `lazyConnect: true` rationale comment (tests import the app and must not open a socket), `MINT_QUEUE`, `MintJobData` exports (mint.job imports them, line 3), `concurrency: 1` comment at mint.job.ts:88.
**Change:** queue connection from `queueConnection()` in redis.ts (RESEARCH Pattern 1 code); worker connection from `workerConnection()` created **inside** `startMintWorker()` (line 81-90), not at module scope. Tests mock `../src/lib/queue` wholesale (`mint.job.test.ts` line 3: `vi.mock('../src/lib/queue', () => ({ MINT_QUEUE: 'mint', mintQueue: {} }))`), so if `mint.job.ts` also imports `../lib/redis` at the top, the import must not throw; keep redis.ts side-effect free at import. Note `queue.ts` builds `new Queue(...)` at module scope, so `queueConnection()` there must stay lazy and must not throw when `REDIS_URL` is unset in the mocked/test path (`TEST_ENV` sets it per RESEARCH).

---

### `backend/src/lib/bootGuards.ts` (utility, request-response) and `index.ts` / `contract.ts` changes

**Analog for hasRole read:** `backend/src/services/onchain.service.ts` (hasAdminRoleOnChain, line 9; tokenBalanceOnChain, line 19). Re-read it at implementation time (not excerpted here). Role constants: `backend/src/lib/roles.ts`:
```typescript
export const ADMIN_ROLE = keccak256(toBytes('ADMIN_ROLE'));
export const RELAY_ROLE = keccak256(toBytes('RELAY_ROLE'));
```
There is no `DEFAULT_ADMIN_ROLE` constant; use `'0x' + '00'.repeat(32)` (`zeroHash` from viem).

**Boot pattern to extend** (`backend/src/index.ts` lines 6-33):
```typescript
const required = ['DATABASE_URL','REDIS_URL','ALCHEMY_API_KEY','CONTRACT_ADDRESS','RELAY_PRIVATE_KEY','ADMIN_SIGNER_PRIVATE_KEY','PRIVY_APP_ID','PRIVY_APP_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) {
    logger.error({ msg: `Missing required environment variable: ${key}` });
    process.exit(1);
  }
}
const app = createApp();
const PORT = parseInt(process.env.PORT ?? '3001');
app.listen(PORT, () => {
  logger.info({ msg: `Backend listening on port ${PORT}` });
  startMintWorker();
});
export default app;
```
Add `'CHAIN_ID'` to `required`. Important: static `import { startMintWorker }` / `createApp` at top of index.ts pull in `lib/contract.ts`, which runs `privateKeyToAccount(process.env.RELAY_PRIVATE_KEY)` at import, before the required-env loop. A missing key therefore throws at import with an unfriendly error; if the guard must run first, do the env loop in a `main()` and dynamic-import app/contract after it (or accept current ordering). `export default app;` at the bottom: grep for importers before removing (research says none).

**Logging:** `import logger from './lib/logger'` (pino); `logger.error({ msg: '...', err: (err as Error).message })` is the project shape (see sessions.ts:57). Never log the RPC URL (it embeds `ALCHEMY_API_KEY`, contract.ts:9).

**contract.ts change** (line 5-6): `const chainId = parseInt(process.env.CHAIN_ID ?? '84532'); export const chain: Chain = chainId === 8453 ? base : baseSepolia;` Remove default, throw if not 84532 or 8453. `defaultAdminAccount` optional pattern (lines 38-44) stays.

---

### `backend/scripts/chain-inspect.ts` and `gen-wallets.ts` (utility scripts)

**Analog:** `backend/scripts/grant-admin.ts` (full file read). Copy: dotenv import, address validation with `isAddress`/`getAddress`, `main().catch` with exit(1), `prisma.$disconnect()` only if DB used (inspect/gen need no DB, avoid importing `../src/lib/prisma`).

Reuse `publicClient`, `relayAccount`, `adminAccount`, `defaultAdminAccount` from `../src/lib/contract` (exports at contract.ts lines 11, 16, 20, 38) and `ATTENDANCE_ABI` from `../src/lib/abi`. Caveat: `contract.ts` throws on import if `RELAY_PRIVATE_KEY`/`ADMIN_SIGNER_PRIVATE_KEY` are undefined (privateKeyToAccount of undefined), which is a problem for `chain-inspect` run BEFORE wallets exist and for `gen-wallets`. So `gen-wallets.ts` must not import `contract.ts`, and `chain-inspect.ts` should build its own `createPublicClient` from viem directly (public RPC `https://sepolia.base.org` fallback) rather than importing `contract.ts`.

Role grant helpers (relay.service.ts lines 90, 109): `grantAdminRoleOnChain(wallet)` and `revokeAdminRoleOnChain(wallet)` exist, signed with `defaultAdminWalletClient`, using `ADMIN_ROLE` only. There is NO helper to grant `RELAY_ROLE`; keep-path needs a new small `grantRole(RELAY_ROLE, relay)` call (backend ABI already includes `grantRole`/`revokeRole`, per research) in a script using `defaultAdminWalletClient`. Check lines 90-125 of relay.service.ts at implementation time to copy the write+`waitForTransactionReceipt` shape:
```typescript
const hash = await adminWalletClient.writeContract({
  address: contractAddress, abi: ATTENDANCE_ABI, functionName: 'createSession',
  args: [...], account: adminAccount, chain,
});
logger.info({ msg: 'createSession tx submitted', hash, sessionIdOnchain });
await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
```
(relay.service.ts lines 15-24).

---

### `backend/test/bootGuards.test.ts`, `check-sync.test.ts` (tests)

**Analog:** `backend/test/mint.job.test.ts` lines 1-30: vitest imports `describe, it, expect, vi, beforeEach`; `vi.mock` of lib modules with factory objects; `vi.mocked(fn).mockResolvedValue(... as never)`; `beforeEach(() => { vi.clearAllMocks(); ... })`. For bootGuards, inject a fake client object (function takes injected clients per RESEARCH Pattern 2) so no `vi.mock` of contract.ts is needed, which also avoids the import-time key problem. Test env comes from `backend/test/testEnv.ts` (read it when writing tests to see which env vars exist, including `REDIS_URL`). globalSetup needs local Postgres (`TEST_DATABASE_URL`), so pure unit tests still run under `npm test` only with Postgres up.

---

### `.github/workflows/ci.yml` (config, modify)

**Analog:** itself. Node setup block (lines 52-56 and 70-74) to change `node-version: '20'` to `node-version-file: .nvmrc` (path is relative to repo root, not the job's `working-directory`; `setup-node` resolves it from the workspace root, so `.nvmrc` at root works):
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: backend/package-lock.json
```
New `sync-check` job: copy the `contract` job's foundry + dependency clone steps (lines 16-24: `foundry-rs/foundry-toolchain@v1`, clone OZ v5.1.0 and forge-std v1.9.4 into `smart-contract/lib`, with `working-directory: smart-contract`), add `forge build`, then a setup-node step and `cd backend && npm ci && npx tsx scripts/check-sync.ts`. Note the `contract` job's `defaults.run.working-directory: smart-contract`; for a mixed job set `working-directory` per step.

---

### `docker-compose.yml` (config, new)

**Analog:** CI postgres service (ci.yml lines 35-47): user/password `postgres`/`postgres`, port 5432, `pg_isready` healthcheck. Copy health-cmd. Use RESEARCH's compose snippet. Test DB name in CI is `onchain_attendance_test`; rehearsal DB `onchain_attendance`. `test/globalSetup.ts` runs `createdb` (Pitfall 6), so set `TEST_DATABASE_URL` to the compose Postgres.

---

### `backend/scripts/check-sync.ts` (utility script, transform)

No code analog. Inputs: `smart-contract/out/AttendanceRegistry.sol/AttendanceRegistry.json` (needs `forge build`), `backend/src/lib/abi.ts` (`ATTENDANCE_ABI`), `frontend/lib/contracts/abi.ts` (no imports; loadable by tsx), `addresses.json` (shape: `{"AttendanceRegistry":{"base-sepolia":"0x7bEf..."}}`). Follow grant-admin.ts shell. Use `getAddress` from viem for case-insensitive comparison. Ensure it does not import `src/lib/contract.ts` (import-time env requirement).

## Shared Patterns

### Error envelope
**Source:** `backend/src/routes/sessions.ts` lines 34, 58; `check-in.ts` 36, 118
```typescript
res.status(409).json({ error: { code: 'CONFLICT', message: 'Session already exists' } });
```
Apply to any new route (none planned); rehearsal asserts against these codes.

### Logging (src only)
**Source:** `backend/src/lib/logger.ts` (pino default export), usage `logger.error({ msg: '...', err: (err as Error).message })`. Scripts may use `console` (grant-admin.ts does). Never print private keys or the RPC URL.

### Env-at-import hazard
`lib/contract.ts`, `services/qr.service.ts` (line 6 `QR_TTL_MS`), `services/relay.service.ts` (line 7 `CONTRACT_ADDRESS`) read env when first imported. Any script or test that imports them must load dotenv/set env first. Scripts that must run before wallets exist must avoid importing them.

### Secrets hygiene
Scripts append `KEY=value` to `backend/.env` without echo; print addresses only. Do not read or print root `/.env` values.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `.nvmrc`, `engines` fields | config | n/a | No existing Node pin anywhere; CI uses literal `'20'` |
| `backend/scripts/check-sync.ts` core comparator | utility | transform | No ABI/diff tooling exists; use RESEARCH Pattern 4 |
| RELAY_ROLE grant helper | service | request-response | `relay.service.ts` only has `grantAdminRoleOnChain`/`revokeAdminRoleOnChain` (ADMIN_ROLE); copy their shape for a RELAY_ROLE variant or use a script-local `writeContract` |

## Metadata

**Analog search scope:** `backend/src/{routes,services,middleware,jobs,lib}`, `backend/scripts`, `backend/test`, `.github/workflows`, `addresses.json`
**Files scanned:** ~16 read in full or partial (sessions.ts, check-in.ts, qr.service.ts, auth.ts, admin.ts, index.ts, queue.ts, mint.job.ts, contract.ts, roles.ts, grant-admin.ts, ci.yml, mint.job.test.ts head, relay.service.ts head and export list)
**Pattern extraction date:** 2026-10-27
