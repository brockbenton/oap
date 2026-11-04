# Frontend — Rules & Conventions

## Phase 5 v1 target: participation reputation

Follow `../MASTER_PLAN.md` for the planned DAO.

## Stack
- **Next.js 14** (App Router, `app/` directory)
- **TypeScript** — strict mode, no `any`
- **Tailwind CSS** — UI primitives live in `components/ui/`
- **Privy** (`@privy-io/react-auth`) — wallet connection, social login, embedded wallets
- **viem** — chain definitions and typed addresses
- **TanStack Query** (`@tanstack/react-query`) — all async data fetching and caching

## Project Structure
```
frontend/
  app/                    # Next.js App Router pages
    admin/                # Admin-only pages (role-gated)
    check-in/             # QR scan + check-in flow
    vault/                # Member's token gallery
    stats/                # Personal attendance stats
  components/
    ui/                   # Shared UI primitives
    shared/               # Reusable app-level components
    features/             # Feature-specific components (check-in/, vault/, admin/)
  lib/
    api/                  # Typed fetch wrappers for backend API
  hooks/                  # Custom React hooks
  types/                  # Shared TypeScript types/interfaces
```

## Conventions

### Components
- One component per file. Filename = PascalCase component name.
- Co-locate styles with the component (Tailwind only — no CSS modules, no inline styles).
- Server Components by default. Add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Props interfaces named `{ComponentName}Props`, defined directly above the component.

### Data Fetching
- All API calls go through typed wrappers in `lib/api/` — never raw `fetch` in components.
- Use TanStack Query for all async data. No `useEffect` + `useState` for data fetching.
- Query keys are defined as constants in `lib/api/queryKeys.ts`.

### Contract Interaction
- The frontend does not read or write the contract today. Minting goes through the backend relay.
- The contract address comes from `CONTRACT_ADDRESS` in `lib/constants.ts` (env var, never hardcoded).

### Auth / Wallet
- Use `usePrivy()` and `useWallets()` from Privy everywhere. Never access `window.ethereum` directly.
- Gate admin pages with role check from backend — do not trust on-chain role reads alone for UI gating.
- Wallet address is always lowercase (`address.toLowerCase()`).

### Error Handling
- All API errors are typed (never `catch (e: any)`).
- User-facing errors display inline — no raw `alert()`.
- Loading states are always handled — no unhandled suspense boundaries.

## FORBIDDEN
- `any` type — use `unknown` and narrow, or define proper types
- `console.log` in committed code — use a logger utility
- Hardcoded contract addresses or API URLs — use env vars (`NEXT_PUBLIC_*`)
- Direct DOM manipulation outside of refs
- `useEffect` for data fetching — use TanStack Query

## Environment Variables
```
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_CONTRACT_ADDRESS
NEXT_PUBLIC_API_URL
```

