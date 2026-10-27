---
phase: 1
slug: chain-readiness-local-mint-rehearsal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.1.9 + supertest (backend); forge test (contract) |
| **Config file** | `backend/vitest.config.ts` (globalSetup needs Postgres via `TEST_DATABASE_URL`, point at Docker compose DB) |
| **Quick run command** | `cd backend && npm run typecheck && npx vitest run test/bootGuards.test.ts test/check-sync.test.ts` |
| **Full suite command** | `cd backend && npm test` ; `cd smart-contract && ~/.foundry/bin/forge test -vvv` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (plus any touched tests)
- **After every plan wave:** Run the full suite command + `cd backend && npx tsx scripts/check-sync.ts`
- **Before `/gsd:verify-work`:** Full suite green AND a captured successful `npx tsx scripts/rehearse.ts` run under Node 22
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | CHAIN-01 | — | Role holders listed without printing keys | script + manual | `cd backend && npx tsx scripts/chain-inspect.ts` | ❌ W0 | ⬜ pending |
| TBD | — | — | CHAIN-02 | — | relay ≠ admin-signer; roles held; funded | script | `cd backend && npx tsx scripts/chain-inspect.ts --check` (non-zero on failure) | ❌ W0 | ⬜ pending |
| TBD | — | — | CHAIN-03 | — | Drift between layers fails the check | unit + CI | `cd backend && npx vitest run test/check-sync.test.ts && npx tsx scripts/check-sync.ts` | ❌ W0 | ⬜ pending |
| TBD | — | — | CHAIN-04 | — | Boot refuses wrong chain / no code / no relay role / Redis down | unit + smoke | `cd backend && npx vitest run test/bootGuards.test.ts` | ❌ W0 | ⬜ pending |
| TBD | — | — | DEPLOY-01 | — | `REDIS_URL` honored from one module | unit + grep | `grep -rn "REDIS_URL" backend/src` only matches `lib/redis.ts` (+ env check) | ❌ W0 | ⬜ pending |
| TBD | — | — | DEPLOY-05 | — | Node 22 pinned everywhere | grep + CI | `cat .nvmrc; grep -rn "node-version" .github; grep -n engines backend/package.json frontend/package.json` | ❌ W0 | ⬜ pending |
| TBD | — | — | DEPLOY-06 | — | check-in → CONFIRMED → token | e2e script | `docker compose up -d && cd backend && npx prisma migrate deploy && npx tsx scripts/rehearse.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are filled in once plans exist.*

---

## Wave 0 Requirements

- [ ] `backend/test/bootGuards.test.ts`, `backend/test/check-sync.test.ts`
- [ ] `backend/scripts/{gen-wallets,chain-inspect,check-sync,rehearse}.ts`
- [ ] `docker-compose.yml`, `.nvmrc`
- [ ] Install Foundry; clone `smart-contract/lib` (OZ 5.1.0, forge-std 1.9.4); `forge build` to produce `out/`
- [ ] Node 22 available on the owner's machine

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keep-or-redeploy decision recorded | CHAIN-01 | Depends on which keys the owner actually holds | Run `chain-inspect.ts`, paste `hasRole` evidence + decision into phase SUMMARY |
| Wallets funded from faucet | CHAIN-02 | Faucet requires human login/captcha | Claim Base Sepolia ETH to printed address, then re-run `chain-inspect.ts --check` |
| Boot refuses misconfig end-to-end | CHAIN-04 | Real process exit | Start backend with `CHAIN_ID=8453` or wrong address; expect exit code 1 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
