# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-27)

**Core value:** A member who scans the meeting QR code reliably ends up with an attendance token on-chain, without paying gas.
**Current focus:** Phase 1: Chain Readiness & Local Mint Rehearsal

## Current Position

Phase: 1 of 6 (Chain Readiness & Local Mint Rehearsal)
Plan: 0 of 0 in current phase
Status: Ready to plan
Last activity: 2026-10-27 - Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

### Decisions

- Phase 1-2 form the hard gate: no feature work before a real phone check-in mints on Base Sepolia
- Keep API and worker in one Railway service, exactly one replica

### Pending Todos

None yet.

### Blockers/Concerns

- Unknown who holds RELAY_ROLE / DEFAULT_ADMIN_ROLE on the deployed contract (Phase 1 resolves)
- Redis `{ url }` connection bug silently falls back to localhost (DEPLOY-01)
- Railway Redis `noeviction` + persistence support unverified
- Final production domain and Privy token type unconfirmed (passkeys bind to the domain)

## Session Continuity

Last session: 2026-10-27
Stopped at: Roadmap created
Resume file: None
