# Frontend — Rules & Conventions

## Stack
- **Next.js 14** (App Router, `app/` directory)
- **TypeScript** — strict mode, no `any`
- **Tailwind CSS** + **shadcn/ui** for all UI components
- **Privy** (`@privy-io/react-auth`) — wallet connection, social login, embedded wallets
- **viem** + **wagmi** — type-safe contract reads/writes
- **TanStack Query** (`@tanstack/react-query`) — all async data fetching and caching
- **zod** — runtime validation for form inputs and API responses

## Project Structure
```
frontend/
  app/                    # Next.js App Router pages
    (auth)/               # Route group: requires wallet connection
    admin/                # Admin-only pages (role-gated)
    check-in/             # QR scan + check-in flow
    vault/                # Member's token gallery
    stats/                # Personal attendance stats
  components/
    ui/                   # shadcn/ui primitives (DO NOT modify)
    shared/               # Reusable app-level components
    features/             # Feature-specific components (check-in/, vault/, admin/)
  lib/
    contracts/            # ABI + contract address constants
    api/                  # Typed fetch wrappers for backend API
    utils/                # Pure utility functions
  hooks/                  # Custom React hooks (useAttendance, useSession, etc.)
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
- ABIs live in `lib/contracts/abis/`. Never inline ABIs in components.
- Contract addresses in `lib/contracts/addresses.ts` — use env vars, never hardcoded.
- All contract reads via `useReadContract` (wagmi). Writes go through backend relay — do not call `useWriteContract` for minting.

### Auth / Wallet
- Use `usePrivy()` and `useWallets()` from Privy everywhere. Never access `window.ethereum` directly.
- Gate admin pages with role check from backend — do not trust on-chain role reads alone for UI gating.
- Wallet address is always lowercase (`address.toLowerCase()`).

### Error Handling
- All API errors are typed (never `catch (e: any)`).
- User-facing errors display via shadcn `toast` — no raw `alert()`.
- Loading states are always handled — no unhandled suspense boundaries.

## FORBIDDEN
- `any` type — use `unknown` and narrow, or define proper types
- `console.log` in committed code — use a logger utility
- Hardcoded contract addresses or API URLs — use env vars (`NEXT_PUBLIC_*`)
- Direct DOM manipulation outside of refs
- `useEffect` for data fetching — use TanStack Query
- Modifying files in `components/ui/` — these are shadcn managed

## Environment Variables
```
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_CONTRACT_ADDRESS
NEXT_PUBLIC_CHAIN_ID
NEXT_PUBLIC_API_URL
```
