# Onchain Club Protocol (OCP)

Onchain Club Protocol (OCP) — an onchain protocol for running clubs, starting with a university blockchain club. Members check in at a meeting by scanning a time‑boxed, admin‑signed QR and receive a non‑transferable ERC‑1155 attendance token — minting is **gasless** (a backend relay sponsors it). Tokens power attendance stats, member tiers, and an admin dashboard.

## Club DAO v1 design (planned)

OCP's v1 DAO gives members nontransferable **Rep** for verified attendance. Rep sets voting influence and gradually decays, so continued participation maintains it. This is the **target design**, not what the deployed attendance registry does today. See [MASTER_PLAN.md](MASTER_PLAN.md#phase-5--club-dao-v1-our-club) and issues #50, #61, #68 and #77.

## Structure

- `smart-contract/` — Solidity + Foundry; soulbound ERC‑1155 `AttendanceRegistry` on Base.
- `backend/` — Node/Express/TypeScript, PostgreSQL + Prisma, BullMQ mint relay, QR signing.
- `frontend/` — Next.js 14, Privy (email/Google/passkey), viem, Tailwind.

## Quick start

- Contract: `cd smart-contract && forge test`
- Backend: `cd backend && npm i && npm run dev` — needs Postgres + Redis (copy `.env`).
- Frontend: `cd frontend && npm i && npm run dev`

CI (GitHub Actions) runs contract tests, backend build/tests, and the frontend build on every PR. See `MASTER_PLAN.md` for the full design.

