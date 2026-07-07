# Onchain Attendance

Soulbound onchain attendance for a university blockchain club. Members check in at a meeting by scanning a time‑boxed, admin‑signed QR and receive a non‑transferable ERC‑1155 attendance token — minting is **gasless** (a backend relay sponsors it). Tokens power attendance stats, member tiers, and an admin dashboard.

## Structure

- `smart-contract/` — Solidity + Foundry; soulbound ERC‑1155 `AttendanceRegistry` on Base.
- `backend/` — Node/Express/TypeScript, PostgreSQL + Prisma, BullMQ mint relay, QR signing.
- `frontend/` — Next.js 14, Privy (email/Google/passkey), wagmi/viem, Tailwind.

## Quick start

- Contract: `cd smart-contract && forge test`
- Backend: `cd backend && npm i && npm run dev` — needs Postgres + Redis (copy `.env`).
- Frontend: `cd frontend && npm i && npm run dev`

CI (GitHub Actions) runs contract tests, backend build/tests, and the frontend build on every PR. See `MASTER_PLAN.md` for the full design.
