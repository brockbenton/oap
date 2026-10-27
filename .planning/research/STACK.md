# Technology Stack (Go-Live Additions)

**Project:** OAP (Onchain Attendance), subsequent milestone "go live on Base Sepolia"
**Researched:** 2026-10-27
**Scope:** Only additions to the existing stack (see `.planning/codebase/STACK.md`). Versions come from `npm view` on 2026-10-27 (HIGH for "this version exists and its engines/peers are as listed"; MEDIUM/LOW for opinions on pricing and behavior, flagged per row).

## Cross-cutting prerequisite: bump Node 20 to Node 22

CI and docs say Node 20. Node 20 reached end of life in April 2026 (from my knowledge, MEDIUM). Many current tool majors now require newer Node (verified via npm `engines`):

| Package | Latest | Node requirement |
|---|---|---|
| vitest 5.0.5 | latest | ^22.12 or >=24 |
| vitest 4.1.12 | 4.x | ^20 or ^22 or >=24 |
| jsdom 27.4.0 | 27.x | ^20.19 or ^22.12 or >=24 |
| @testing-library/jest-dom 7.0.1 | latest | >=22 |
| @sentry/nextjs / @sentry/node 11.9.0 | latest | >=20.19 (excl. 21) or >=22.12 |
| @vitejs/plugin-react 5.2.0 | 5.x | ^20.19 or >=22.12 |

Action: set `engines.node` to `>=22.12`, add `.nvmrc` (22), update `.github/workflows/ci.yml` to `node-version: 22`, and set Railway/Vercel Node to 22 (Railway Nixpacks honors `engines.node` or the `NIXPACKS_NODE_VERSION` env var). Confidence: HIGH on the engines table, MEDIUM on the Railway mechanism.

## Recommended Stack

### Hosting

| Technology | Version/Plan | Purpose | Why | Confidence |
|---|---|---|---|---|
| Railway (Hobby) | $5/mo, includes $5 usage | Backend API + worker + Postgres + Redis in one project | `railway.toml` already exists, so there is zero migration cost. Free plan is $1/mo credit with 0.5 GB RAM / 1 vCPU per service (official docs), which is not enough for API + worker + Postgres + Redis. The one-time $5 trial credit is fine for the first smoke test only. Expect about $5-8/mo total at club scale. | MEDIUM (official page confirms plan numbers; DB-on-plan rules not confirmed, check railway.com/pricing before committing) |
| Railway Postgres plugin | managed | `DATABASE_URL` | Same private network as the API, so no egress or latency concerns. Prisma `migrate deploy` already runs on start. | MEDIUM |
| Railway Redis plugin | managed | `REDIS_URL` for BullMQ | Must set `maxmemory-policy noeviction` and enable AOF persistence. BullMQ docs call `noeviction` "very important" (HIGH, official docs). Verify these on the Railway Redis service; if you cannot control them, use a Redis template with a custom config. | MEDIUM |
| Vercel (Hobby) | free | Next.js frontend | Already believed deployed. Free tier is fine for non-commercial club use. Confirm the deployment exists and set `NEXT_PUBLIC_API_URL` to the Railway public domain. | MEDIUM |

Split into two Railway services from the same repo (`backend/` root): `api` (`node dist/index.js`) and `worker` (a separate entrypoint that only starts BullMQ workers and sweeper schedulers). Today the worker shares the API process, so a crash or deploy restarts both. Splitting is a small change and removes the worst coupling, but it also doubles the compute bill. At one club, running them in one process is acceptable for launch. Recommendation: keep one service for launch, structure the code so the worker can be spun off by env flag (`RUN_WORKER=true/false`). Confidence: MEDIUM (design opinion).

### Security middleware

| Library | Version | Purpose | Why |
|---|---|---|---|
| helmet | ^8.3.0 | Security headers | Current major; Node >=18; API-only server so defaults are fine. HIGH |
| cors | already ^2.8.5 (latest 2.8.6) | Restrict to frontend origin | Already installed, only configure. Use an allowlist from env `FRONTEND_ORIGIN` (comma separated, include the Vercel production URL and localhost:3000 for dev). Do not use `origin: true` or `*` with bearer auth. HIGH |
| `app.set('trust proxy', 1)` | built-in Express | Correct client IP behind Railway's proxy | Required or `express-rate-limit` keys on the proxy IP and throttles everyone together. Use `1` (one hop), not `true`, to prevent X-Forwarded-For spoofing. express-rate-limit v7 also validates this and logs warnings if it is wrong. HIGH |

Do not migrate to Express 5 (5.3.0 is current); it is out of scope and not needed.

### Error tracking

| Technology | Version | Purpose | Why | Confidence |
|---|---|---|---|---|
| Sentry (SaaS, Developer free plan) | n/a | Error aggregation for backend and frontend | Free tier (about 5k errors/month, from my knowledge; verify on sentry.io/pricing) is plenty for one club. One vendor covers both Express and Next.js and supports alert emails out of the box. | MEDIUM |
| @sentry/node | ^10.77.1 | Express API + BullMQ worker | `Sentry.init` first in `index.ts`, `Sentry.setupExpressErrorHandler(app)` after routes. Capture failures in the BullMQ `worker.on('failed')` handler manually, since a job failure is not an HTTP error. Node >=18. | MEDIUM-HIGH |
| @sentry/nextjs | ^10.77.1 | Next.js 14 App Router | Peer range `^13.2 || ^14 || ^15 || ^16` includes 14.2.35. Use `npx @sentry/wizard@latest -i nextjs` to generate `instrumentation.ts`, `sentry.*.config.ts`, and `global-error.tsx`. | MEDIUM-HIGH |

Why v10 and not the newer v11.9.0: v11 (latest) lists Next peer `^14.0 || ^15 || ^16` and Node >=20.19, so it likely works too after the Node 22 bump. I did not verify v11 breaking changes or Next 14.2 behavior in v11. v10 explicitly lists Next 13.2+ and Node >=18, and is the safer pick for an app pinned on Next 14.2. Either is acceptable; do not mix majors between backend and frontend.

Privacy rules: never attach `RELAY_PRIVATE_KEY` or auth headers. Set `sendDefaultPii: false` and scrub `authorization` headers in `beforeSend`. Disable Sentry tracing/replay on the free tier (`tracesSampleRate: 0`, no Replay) to save quota and bundle size. Wrap the `next.config.mjs` with `withSentryConfig` only if you want source maps; skip tunnel routes and the Sentry Vercel integration for launch.

### Relay wallet operations, gas monitoring, and sweeper

No new heavy dependencies. Use what is already installed.

| Concern | Tool | Notes | Confidence |
|---|---|---|---|
| Sweeper for stuck PENDING check-ins | BullMQ job scheduler (`queue.upsertJobScheduler`) on existing BullMQ 5.x | In BullMQ 5 (current 5.81.5), `upsertJobScheduler` replaces the deprecated `repeat` option. Schedule every 1-2 minutes: select `CheckIn` rows with status PENDING older than N minutes, re-enqueue with a deterministic `jobId` (e.g. `mint:${checkInId}`) so duplicates are dropped, and let the existing idempotent worker reconcile against `balanceOf`. Do NOT use node-cron or a separate cron service: it would add a second scheduler with no queue-level dedupe. If Redis is down at enqueue, the scheduler is also down, so also run a startup sweep and a DB-driven `setInterval` fallback inside the API process. | MEDIUM (BullMQ API from docs and knowledge, not re-fetched this session) |
| Nonce management | viem `nonceManager` (from `viem/nonce`) on the relay account OR worker `concurrency: 1` | One relay wallet with concurrent workers causes "nonce too low/replacement underpriced". Simplest and safest for launch: worker concurrency 1 for the mint queue, and wait for the receipt before the next send. Add `nonceManager` only if raising concurrency. Check `viem` ^2.23 has `nonceManager` (it has since 2.x). | MEDIUM |
| Gas balance monitor | BullMQ scheduler job every 5-10 min calling `publicClient.getBalance({address: relay})`, compare with `RELAY_MIN_BALANCE_ETH` (already in env list) | On breach: `Sentry.captureMessage('relay low balance', 'warning')` (Sentry alert rule emails you) and optionally POST to a Discord webhook (free, plain `fetch`, no library). Also expose balance in `/health` details (not public) so uptime tools can see it. | MEDIUM |
| Uptime monitoring | UptimeRobot or Better Stack free tier pinging the Railway `/health` URL | Catches the "API is down" case that Sentry cannot (a dead process sends nothing). Free tiers exist for both (from my knowledge, MEDIUM-LOW; verify limits). | LOW-MEDIUM |
| RELAY_ROLE verification | One-off script using `cast call <contract> "hasRole(bytes32,address)(bool)" $(cast keccak "RELAY_ROLE") <relay>` with `~/.foundry/bin/cast`; then also run it as a startup check in the backend using the viem `readContract` call on `hasRole` | Fail fast at boot (log + Sentry) if the relay lacks the role. If not granted, the DEFAULT_ADMIN holder calls `grantRole`. The deploy script used `RELAY_WALLET`; confirm that address equals the key you load in Railway. | HIGH for approach |
| Funding the relay | Coinbase CDP faucet (0.1 ETH per address per rolling 24h; each claim 0.0001 ETH, per official CDP API reference) or Alchemy faucet (0.1 ETH/24h per search result, unverified) | Mint gas on Base Sepolia is a tiny fraction of that; a 0.05 ETH balance should cover thousands of mints. Set `RELAY_MIN_BALANCE_ETH` around 0.01. Use a dedicated relay key that is not the admin or deployer key. | MEDIUM (CDP limits from official docs; Alchemy from search only) |

### Frontend testing

| Technology | Version | Purpose | Why | Confidence |
|---|---|---|---|---|
| vitest | ^4.1.12 | Test runner | Backend already uses Vitest (2.1.9), so one mental model. Native ESM and TypeScript with no Babel config, unlike Jest with Next 14 (needs `next/jest` + SWC wiring). v4 supports Node 20/22/24. Vitest 5.0.5 exists but requires Node ^22.12 and is brand new; choose 4.x unless you want to track latest. Do not upgrade backend Vitest in this milestone. | HIGH on version/engines, MEDIUM on fit |
| vite | ^7.3.7 (peer of vitest 4; installed transitively) | Bundler for tests | Needs Node ^20.19 or >=22.12. Don't import `vite` directly except for config. | MEDIUM |
| @vitejs/plugin-react | ^5.2.0 | JSX transform for tests | v6 targets Vite 8 only (peer `vite ^8`); v5 matches Vite 7. If Node stays on 20.x below 20.19, use 4.7.0. | MEDIUM |
| jsdom | ^27.4.0 (^26.1.0 if Node 20.x) | DOM environment | Use jsdom, not happy-dom: it is the better-known default with Testing Library and fewer surprises. jsdom 30 needs Node ^22.22; stay on 27. | MEDIUM |
| @testing-library/react | ^16.3.3 | Component tests | Peer deps support React 18 and need `@testing-library/dom` ^10. | HIGH |
| @testing-library/dom | ^10.4.2 | Required peer | Must be installed explicitly. | HIGH |
| @testing-library/user-event | ^14.6.8 | Click/type interactions | Standard. | HIGH |
| @testing-library/jest-dom | ^6.x on Node 20, 7.0.1 on Node >=22 | `toBeInTheDocument` matchers | v7 requires Node >=22. Import `@testing-library/jest-dom/vitest` in setup. | MEDIUM |
| msw | ^2.15.0 | Mock backend HTTP (`/api/v1/checkin`, admin routes) | Intercepts `fetch` at network level, so tests exercise the real fetch wrapper. msw 3.0.3 exists; v2 is the safe choice and I did not verify v3 migration effort. | MEDIUM |

How to test the two target areas without running Privy or a chain:
- Mock `@privy-io/react-auth` with `vi.mock`: return `{ authenticated, ready, user, getAccessToken }` and an embedded wallet object whose `signMessage` / `signTypedData` is a `vi.fn()`. Assert `CheckInFlow` calls it with the exact payload from the QR and posts the signature to the API (verified via msw). This tests the regression-prone code (PRs #40, #41) without Privy's iframe.
- Admin gate: render the gated component or layout with mocked auth state in three states (loading, non-admin, admin) and assert redirect/hidden behavior. Mock `next/navigation` (`useRouter`, `usePathname`) with `vi.mock`.
- Do not test Privy's own UI or iframes. Do not do real wallet E2E for this milestone.
- Alias `@/` paths in `vitest.config.ts` to match `tsconfig.json` (`resolve.alias` or `vite-tsconfig-paths`).
- Add `npm test` for the frontend and a `test` job step in CI.

Server Components and `async` pages: Vitest cannot render async Server Components. Keep the tested logic in client components or pure functions (as the check-in flow already is). Playwright is the route for E2E later; it is out of scope now.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| Backend host | Railway Hobby | Render free web service | Free Render instances spin down after idle time (from my knowledge), which would stall BullMQ worker and the sweeper; free Render Postgres expires. Not reliable for a worker. |
| Backend host | Railway | Fly.io | Needs Dockerfile/config, no existing config in repo, no gain for this size. |
| Postgres | Railway plugin | Neon / Supabase free | Both are workable and free, and are a reasonable fallback if Railway cost matters. Adds a second vendor and cross-network latency. Choose only to drop Postgres cost. |
| Redis | Railway Redis | Upstash free | BullMQ polls constantly; per-command billing and daily command caps on Upstash free tier are a known mismatch (from my knowledge, LOW; verify before ruling out) and eviction/persistence settings are not under your control. |
| Error tracking | Sentry | Self-hosted GlitchTip, Highlight, Datadog | Extra ops or cost. Sentry SDKs are the most mature for Next.js and Express. |
| Error tracking | Sentry | Pino logs only (status quo) | No alerting or grouping; a stuck mint would go unnoticed. |
| Sweeper | BullMQ `upsertJobScheduler` | node-cron, Railway cron service | Second scheduler, no dedupe, extra service. |
| Frontend tests | Vitest | Jest + `next/jest` | More config for ESM deps (viem, wagmi, privy), slower; Vitest matches the backend. |
| Frontend tests | jsdom | happy-dom | Fewer Testing Library compatibility surprises with jsdom. |
| Alerting | Sentry alert + Discord webhook | PagerDuty / Grafana stack | Overkill for one club. |

## Installation

```bash
# backend
cd backend
npm install helmet@^8.3.0 @sentry/node@^10.77.1
# cors, express-rate-limit, bullmq, viem, pino already installed

# frontend
cd ../frontend
npm install @sentry/nextjs@^10.77.1
npm install -D vitest@^4.1.12 @vitejs/plugin-react@^5.2.0 jsdom@^27.4.0 \
  @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2 \
  @testing-library/user-event@^14.6.8 @testing-library/jest-dom@^7.0.1 msw@^2.15.0
# (on Node 20.x < 20.19 use jsdom@^26.1.0, @vitejs/plugin-react@^4.7.0, @testing-library/jest-dom@^6)
```

## What NOT to use

- Express 5 (5.3.0): out of scope; no deployment benefit.
- Vitest 5 / msw 3 / Sentry 11 right now: all brand-new majors; nothing in this milestone needs them, and I did not verify their migration notes. Revisit later.
- `trust proxy: true`: lets clients spoof IPs. Use `1`.
- Upstash free Redis for BullMQ: see above.
- A separate cron service or `node-cron` for the sweeper.
- Reusing the admin or deployer key as the relay key.
- Real-chain or real-Privy tests in CI.

## Sources

- npm registry (`npm view`, 2026-10-27): helmet 8.3.0, cors 2.8.6, express 5.3.0, @sentry/node and @sentry/nextjs 11.9.0 / 10.77.1 (engines and Next peer ranges), vitest 5.0.5 / 4.1.12 / 3.2.7, vite 7.3.7, jsdom 30.1.3 / 27.4.0 / 26.1.0, @vitejs/plugin-react 6.1.2 / 5.2.0 / 4.7.0, @testing-library/react 16.3.3 (peers), jest-dom 7.0.1, user-event 14.6.8, msw 3.0.3 / 2.15.0, bullmq 5.81.5 (HIGH)
- Railway plans: https://docs.railway.com/pricing/plans (trial $5 one-time, Free $1/mo credit with 0.5 GB / 1 vCPU, Hobby $5/mo with $5 usage) (MEDIUM-HIGH); https://docs.railway.com/pricing
- BullMQ production guide: https://docs.bullmq.io/guide/going-to-production (noeviction, AOF, maxRetriesPerRequest null) (HIGH)
- Coinbase CDP faucet reference: https://docs.cdp.coinbase.com/api-reference/v2/rest-api/faucets/request-funds-on-evm-test-networks (0.1 ETH/24h, 0.0001 ETH per request) (MEDIUM-HIGH); Base faucets list: https://docs.base.org/chain/network-faucets
- Third-party Railway pricing summaries disagreed on the free tier; only the official page was relied on.
- Not verified this session (training knowledge): Sentry free quota, Upstash/Render free-tier behavior, UptimeRobot/Better Stack limits, Node 20 EOL date, `upsertJobScheduler` exact signature. Confirm during the phase that uses them.
