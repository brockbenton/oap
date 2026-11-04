# AGENTS.md — Review & contribution guidelines

Onchain Club Protocol (OCP): members check in to club meetings with signed QR codes and receive soulbound ERC-1155 attendance tokens; Phase 5 adds participation-earned, gradually decaying soulbound Rep and on-chain governance (Governor + Timelock) for our club. Plan of record: `MASTER_PLAN.md`. Security inventory and review checklist: `SECURITY.md`.

## Stack
- `smart-contract/` — Solidity ^0.8.24, Foundry, OpenZeppelin v5. Use `~/.foundry/bin/forge` (`/usr/bin/forge` is an unrelated binary).
- `backend/` — Node.js, Express, TypeScript, PostgreSQL + Prisma, BullMQ relay, viem.
- `frontend/` — Next.js 14 App Router, TypeScript, Tailwind, Privy, viem + wagmi, TanStack Query.
- Chain: Base Sepolia → Base Mainnet.

Each package has a `CLAUDE.md` with its conventions and FORBIDDEN list — treat those as binding review rules.

## Review priorities (in order)
1. **Security** — run the checklist in `SECURITY.md`. Any change to keys, roles, signatures, Rep crediting, or auth must update `SECURITY.md`.
2. **Correctness** — on-chain/off-chain consistency (DB `check_ins` vs contract state), error paths, retries, nonce handling in the relay.
3. **No fabricated data** — UI must show real data or an honest empty state. Flag hardcoded stats, mock data presented as real, or placeholder claims (e.g. adoption numbers).
4. **Conventions** — package `CLAUDE.md` rules (e.g. no `any`, no `console.log`, Zod validation on every endpoint, custom errors + events in contracts, `s_` storage prefix).
5. **Tests** — every new public contract function and every new endpoint has tests; contract changes include revert-path tests.

## Hard rules to flag
- Contracts: no upgradeable proxies, no `tx.origin`, no `selfdestruct`, no `block.timestamp` in access control, governance parameters must have on-chain bounds, soulbound tokens and Rep must not be transferable.
- Backend: private keys only from env vars; never call contracts directly from a route handler (go through the relay queue); never return PII on unauthenticated endpoints; admin/officer checks read the chain and fail closed.
- Frontend: no secrets, no hardcoded contract addresses or API URLs (`NEXT_PUBLIC_*` env vars), no `useEffect` data fetching (use TanStack Query).
- Never enable Privy delegated actions / session signers.

## Club DAO v1 reputation rules
- Full **10 nominal Rep per verified eligible attendance**, after two distinct officers approve the final AT-holder list; replay-safe permissionless paged credit with a common recognition timestamp.
- Gradual decay is **required in v1**. Half-life **180 days is provisional** for 5a validation. Lifetime attendance/ATs never decay; no semester or officer-controlled epoch rollover.
- No supply-based session reduction, weekly Rep caps/budgets, deferred balances or claim jobs. Gas and treasury budgets are separate.
- Use decay-aware IVotes with consistent historical account/total power, fixed proposal snapshots, fixed-point units and bounded reads. Ordinary OZ Votes does not decay automatically. New credits must not rejuvenate old Rep or rewrite past snapshots.
- Passive decay emits no events; indexers/UI need timestamped current-power reads/reconstruction and separate lifetime history.
- Decay does not prevent fake accounts or colluding officers. No aggregate issuance-rate bound is claimed. Review that threat model and resolve below-threshold/zero-supply governance recovery before deployment (#50, #52, #61, #68).
- For the complete v1 design, align this security inventory with PR #45 Revision 3.3; do not implement older no-decay or epoch-budget requirements from historical issue context.

## Commands
```bash
cd smart-contract && ~/.foundry/bin/forge test
cd backend && npm run typecheck && npm test      # tests need a local Postgres
cd frontend && npm run typecheck && npm run lint && npm run build
```

