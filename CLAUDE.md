**ALWAYS RESPOND IN ENGLISH**

## Club DAO v1 design authority

For Phase 5 work, follow `MASTER_PLAN.md` and the owner-approved Colony-inspired model: full 10 nominal Rep per verified eligible attendance after two-officer approval, gradual decay in v1, fixed voting snapshots, and permanent AT/lifetime history. The 180-day half-life is provisional. No supply-based session reduction, weekly Rep budgets/caps or deferred claims. `ClubRep` needs decay-aware IVotes; ordinary OZ Votes alone is insufficient. Financial budgets are separate. See #50, #61, #68 and #77.

## Rules
- Run independent tool calls in parallel
- Never create files unless strictly required; always prefer editing existing files
- Never proactively create `.md` or README files
- Do what was asked; nothing more, nothing less

## Stack
- Smart contract: Solidity/Foundry — use `~/.foundry/bin/forge` (`/usr/bin/forge` is an unrelated binary)
- Frontend: Next.js 14 (App Router) / TypeScript / Tailwind / Privy / viem+wagmi
- Backend: Node.js / Express / TypeScript / PostgreSQL / Prisma
- Chain: Base Sepolia (testnet) → Base Mainnet

