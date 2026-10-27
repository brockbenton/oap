# Phase 1: Chain Readiness & Local Mint Rehearsal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-27
**Phase:** 01-chain-readiness-local-mint-rehearsal
**Areas discussed:** Keep-or-redeploy policy, Wallets & key custody

---

## Keep-or-redeploy policy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, I have the deployer key | Re-grant roles without redeploying | ✓ |
| Not sure | hasRole checks decide | |
| No / lost it | Redeploy required | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep if fixable | Re-grant, keep address | |
| Always redeploy fresh | Clean deploy, sync everywhere | |
| You decide | Based on hasRole results | |

**User's choice (free text):** "this is my friends codebase I also put api keys into the .env"

| Option | Description | Selected |
|--------|-------------|----------|
| Verify on Basescan | Compare source | |
| Assume it matches | ABI check catches drift | ✓ |
| Redeploy if unsure | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Personal wallet | Not on backend | |
| Backend-held key | DEFAULT_ADMIN_PRIVATE_KEY on Railway | ✓ |
| Same as admin-signer | | |

**Notes:** Follow-up asked about deployer identity and the types of the root `.env` values. User: "I dont know what each does but I dont really want to mess with that part". Resolved as a hasRole-driven decision rule (D-02/D-03) at Claude's discretion.

---

## Wallets & key custody

Not discussed separately. The user deferred key handling to Claude (D-05, D-06).

## Claude's Discretion

- Keep-or-redeploy outcome (rule-based on hasRole)
- Wallet generation and funding
- Rehearsal driver, drift check design, boot-guard strictness

## Deferred Ideas

None.
