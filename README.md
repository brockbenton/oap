# Onchain Club Protocol (OCP)

Onchain Club Protocol (OCP) — an onchain protocol for running clubs, starting with a university blockchain club. Members check in at a meeting by scanning a time‑boxed, admin‑signed QR and receive a non‑transferable ERC‑1155 attendance token — minting is **gasless** (a backend relay sponsors it). Tokens power attendance stats, member tiers, and an admin dashboard.

## Club DAO v1 design (planned)

OCP's v1 DAO uses **Colony-inspired participation reputation**: each verified eligible session attendance earns **10 nontransferable Rep**, after two different officers approve the attendee list. Rep gives voting influence and **gradually decays over time**, so continued participation maintains influence while inactivity reduces it. Rep cannot be bought, sold, transferred or delegated and is not a financial reward.

The provisional decay half-life is **180 days**: without new participation, 100 Rep becomes 50 after 180 days and 25 after 360 days. The exact half-life and fixed-point implementation require validation before deployment. Attendance tokens and lifetime attendance history remain permanent. Proposal voting weights and quorum use fixed historical snapshots, so an active vote does not change as Rep decays.

Rep issuance grows with verified attendance. There is **no weekly Rep budget, per-member weekly cap, pro-rata session reduction or deferred-credit queue**. Organizer-set attendee caps, duplicate prevention, two-officer sign-off and anomaly monitoring protect attendance integrity; decay does not prevent fake accounts or colluding officers. Any treasury spending has a separate budget.

This is the **target design**, not a claim that the current deployed attendance registry implements DAO governance or decay. See [MASTER_PLAN.md](MASTER_PLAN.md#phase-5--club-dao-v1-our-club), particularly the implementation and security gates, and issues #50, #61, #68 and #77. Multi-club and approval-voting elections remain later work.

## Structure

- `smart-contract/` — Solidity + Foundry; soulbound ERC‑1155 `AttendanceRegistry` on Base.
- `backend/` — Node/Express/TypeScript, PostgreSQL + Prisma, BullMQ mint relay, QR signing.
- `frontend/` — Next.js 14, Privy (email/Google/passkey), wagmi/viem, Tailwind.

## Quick start

- Contract: `cd smart-contract && forge test`
- Backend: `cd backend && npm i && npm run dev` — needs Postgres + Redis (copy `.env`).
- Frontend: `cd frontend && npm i && npm run dev`

CI (GitHub Actions) runs contract tests, backend build/tests, and the frontend build on every PR. See `MASTER_PLAN.md` for the full design.

