# Testing Patterns

**Analysis Date:** 2026-10-27

## Test Framework

**Smart contract:** Foundry `forge test` with forge-std `Test` (solc 0.8.24). Config: `smart-contract/foundry.toml`.
**Backend:** Vitest ^2.1.9 + supertest ^7.2.2. Config: `backend/vitest.config.ts`.
**Frontend:** No test runner, no test files. `npm test` is not defined; only `lint` and `typecheck`.

**Run Commands:**
```bash
cd smart-contract && ~/.foundry/bin/forge test -vvv   # contract tests (CI uses -vvv)
cd backend && npm test                                # vitest run (needs local Postgres)
cd backend && npx vitest run test/mint.job.test.ts    # single file
cd frontend && npm run typecheck && npm run lint      # only static checks
```
`.claude/commands/test.md` runs all three layers and reports NOT SET UP for frontend.

## Test File Organization

```
smart-contract/test/AttendanceRegistry.t.sol   # 45 test functions
smart-contract/test/helpers/BaseTest.sol       # shared fixture
backend/test/*.test.ts                         # api, art.service, ipfs.service, members.me, mint.job, stats.service
backend/test/globalSetup.ts, testEnv.ts        # DB bootstrap + env
```
Backend tests are separate from `src/` (`include: ['test/**/*.test.ts']`).

## Test Structure

**Solidity:** `BaseTest` deploys the registry in `setUp()` with named actors (`deployer`, `admin`, `relay`, `alice`, `bob`) via `makeAddr`, and offers helpers `_createActiveSession()`, `_createClosedSession()`. Test contract extends `BaseTest`, overrides `setUp() public override` calling `super.setUp()`. Sections separated by `// ====` banners per function and concern (role access, happy path, reverts). Names: `test_createSession_revertsIfCallerLacksAdminRole`, `testFuzz_createSession_anyNonZeroDateAndId`.
```solidity
vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, adminRole));
vm.prank(alice);
registry.createSession(...);
```
Gotcha: cache role constants (`adminRole`) in `setUp` because calling `registry.ADMIN_ROLE()` inside `expectRevert`/`prank` consumes the prank. Reentrancy tested with a malicious `ReentrantReceiver` contract in the same file. Custom events checked with `vm.expectEmit` + `emit`.

**Backend:** `describe('<METHOD> /path' | 'fn (behavior)')` with `it('<status or behavior> ...')`; assertions on `res.status` and `res.body.data` using `toMatchObject`.
```ts
const app = createApp();
const res = await request(app).get('/api/v1/members/me').set('Authorization', 'Bearer test');
expect(res.status).toBe(200);
```
`beforeEach` resets mutable state (`authState.wallet = ALICE`, `vi.clearAllMocks()`).

## Mocking

**Framework:** Vitest `vi.mock`, `vi.fn`, `vi.hoisted`.

**Patterns:**
```ts
const authState = vi.hoisted(() => ({ wallet: '0x1111...' as string }));
vi.mock('@privy-io/server-auth', () => ({ PrivyClient: class { async getUser() { return { id: `did:privy:${authState.wallet}`, wallet: { address: authState.wallet } }; } } }));
vi.mock('../src/services/onchain.service', () => ({ hasAdminRoleOnChain: async () => false, tokenBalanceOnChain: async () => 0n }));
vi.mock('../src/lib/queue', () => ({ MINT_QUEUE: 'mint', mintQueue: { add: async () => ({ id: 'test' }) } }));
```
Unit tests of jobs/services mock Prisma wholesale: `vi.mock('../src/lib/prisma', () => ({ default: { checkIn: { findUnique: vi.fn(), ... } } }))` then `vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({...} as never)`. `vi.mock` calls precede imports of code under test.

**Mock:** Privy auth, on-chain reads/writes (`onchain.service`, `relay.service`), BullMQ/Redis queue, IPFS.
**Do NOT mock:** Express app (use `createApp()`), the real Postgres DB for route-level tests (seeded).

## Fixtures and Factories

- Fixed addresses: `ALICE = '0x1111...'`, `BOB = '0x2222...'`; `CAROL` (not in seed) for new-member paths.
- DB: `backend/test/globalSetup.ts` runs `createdb onchain_attendance_test`, `prisma db push --force-reset`, then `prisma/seed.ts` once per run. `backend/test/testEnv.ts` supplies `TEST_ENV` (throwaway Anvil keys, `TEST_DATABASE_URL` override, fake Privy creds) injected via `vitest.config.ts` `env`.
- Config: `fileParallelism: false` (shared DB), `testTimeout: 30000`, `hookTimeout: 90000`.
- Redis is not required (queue mocked).

## Coverage

**Requirements:** None enforced; no coverage tooling configured for backend or frontend.

## Test Types

- **Unit:** contract functions (Foundry, incl. fuzz tests `testFuzz_`), backend services/jobs with mocks.
- **Integration:** backend HTTP tests via supertest against real seeded Postgres (`api.test.ts`, `members.me.test.ts`).
- **E2E:** Not used.

## CI (`.github/workflows/ci.yml`)

Three jobs on PR and push to master: `contract` (`forge test -vvv`, deps cloned into gitignored `lib/`), `backend` (Postgres 14 service, `npm ci`, `npm run build`, `npm test --if-present`, `TEST_DATABASE_URL` set), `frontend` (`npm run typecheck`, `npm run build`; no tests).

## Common Patterns

**Async/error testing (backend):**
```ts
vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ mintStatus: 'CONFIRMED' } as never);
await runMintJob(DATA);
expect(mintOnChain).not.toHaveBeenCalled();
```
Auth failure simulated by flipping `authState.throwOnGetUser = true`. Cover 401 (no token), 403, 400 validation, and happy path for each new route.

**Adding tests:** new route -> `backend/test/<name>.test.ts` copying the Privy/onchain/queue mock header from `members.me.test.ts`; new contract behavior -> add to `AttendanceRegistry.t.sol` following banner sections. Frontend testing infrastructure does not exist yet (a gap).

---

*Testing analysis: 2026-10-27*
