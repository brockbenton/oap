# Coding Conventions

**Analysis Date:** 2026-10-27

No Prettier or Biome config exists. Style is by convention: 2-space indent, single quotes, semicolons, trailing commas in multiline TS. Match surrounding files.

## Naming Patterns

**Files:**
- Backend: `camelCase.ts` for lib/middleware/routes (`src/routes/check-in.ts` is kebab for multiword routes); services are `<name>.service.ts` (`src/services/art.service.ts`); jobs `<name>.job.ts`.
- Backend tests: `<subject>.test.ts` in `backend/test/`.
- Frontend components: `PascalCase.tsx` (`components/ui/Button.tsx`, `components/features/check-in/CheckInFlow.tsx`). Non-component modules are `camelCase.ts` (`lib/tokenArt.ts`) or kebab (`lib/api/check-in.ts`). Hooks are `useXxx.ts` in `frontend/hooks/`.
- Next.js App Router: `app/<route>/page.tsx`.
- Solidity: `PascalCase.sol`; interfaces prefixed `I` in `smart-contract/src/interfaces/`; tests `<Contract>.t.sol`.

**Functions:** camelCase, verb-first (`buildMemberStats`, `runMintJob`, `updateMyProfile`). Solidity tests: `test_<function>_<behavior>` and `testFuzz_<function>_<property>`.

**Variables/constants:** camelCase; module constants UPPER_SNAKE_CASE (`AVATAR_COLOR_COUNT`, `USERNAME_REGEX`, `BASE_CLASSES`). Solidity storage vars use `s_` prefix (`s_sessions`, `s_baseCid`); `foundry.toml` disables the `mixed-case-variable` lint for this. Constants UPPER_SNAKE; custom errors PascalCase.

**Types:** PascalCase interfaces/types (`MemberProfile`, `ButtonProps`). Props interfaces named `<Component>Props` and re-exported via `components/ui/index.ts`.

## Code Style

**Formatting:** none enforced; long lines are tolerated (see zod schemas in `backend/src/routes/members.ts`).

**Linting:**
- Frontend: ESLint `next/core-web-vitals` + `next/typescript` (`frontend/.eslintrc.json`); run `npm run lint`, `npm run typecheck`.
- Backend: no linter; `npm run typecheck` (`tsc --noEmit`). `strict: true` in both TS configs. Backend is CommonJS (`module: commonjs`); frontend ESM with `@/*` alias.
- Solidity: `forge lint` config in `smart-contract/foundry.toml`; solc 0.8.24.

## Import Organization

**Order (observed):**
1. Framework/third-party packages (`express`, `zod`, `viem`, `@prisma/client`, `react`, `next/*`, `@privy-io/*`, `@tanstack/react-query`)
2. Local modules (backend: relative `../middleware/...`, `../lib/...`, `../services/...`; frontend: `@/lib/...`, `@/components/...`, `@/types`)
3. Relative sibling imports last.

**Path Aliases:** frontend `@/*` -> frontend root. Backend uses relative paths only.

In backend tests, `vi.mock(...)` calls come BEFORE the imports of the modules under test.

## Error Handling

**Backend:**
- Uniform error envelope: `{ error: { code: 'UPPER_SNAKE', message: '...' } }`; success envelope `{ data: ... }`. Validation errors add `issues: [{field, message}]` with code `VALIDATION_ERROR` (`backend/src/middleware/validate.ts`).
- Validate bodies with zod via `validate(schema)` middleware; schema declared next to the route.
- Route handlers are `async (req: Request, res: Response): Promise<void>` and may throw: `express-async-errors` is imported first in `backend/src/app.ts`, and the final error middleware returns 500 `INTERNAL_ERROR`. Handle expected Prisma errors explicitly (e.g. `P2002` unique violation in `routes/members.ts`).
- Auth: `authMiddleware` (`middleware/auth.ts`) sets `req.user = { privyUserId, walletAddress }` (wallet lowercased); admin authorization is the on-chain role (`middleware/admin.ts`). Use `req.user!` in authenticated handlers.
- Unknown routes return 404 `NOT_FOUND`.

**Frontend:** `apiRequest<T>` in `frontend/lib/api/client.ts` throws `ApiRequestError(code, message, status)`; components branch on `instanceof ApiRequestError`. TanStack Query `retry` uses `retryUnlessForbidden`. Surface errors in UI (see `components/shared/LoadError.tsx`) rather than swallowing them.

**Solidity:** custom errors (`revert SessionDoesNotExist()`), no require strings; soulbound transfers revert with `Soulbound()`.

## Logging

**Framework:** pino (`backend/src/lib/logger.ts`, default export). Structured object form with `msg` field:
```ts
logger.error({ msg: 'On-chain admin role check failed', wallet: walletAddress, err: (err as Error).message });
```
Never log secrets/private keys. Frontend: no logging framework.

## Comments

- Explain WHY and non-obvious constraints, not what. Section banners in routes: `// ── GET /api/v1/members/me ───...`; Solidity uses `// ----` banner blocks and NatSpec `/// @dev`.
- JSDoc used sparingly on exported builders (`/** Builds the Express app ... */`).
- `eslint-disable-next-line` only with a specific rule.

## Function Design

- Keep route handlers thin; put business logic in `backend/src/services/*.service.ts` and job logic in `src/jobs/`.
- Factory over singleton for testability (`createApp()` in `backend/src/app.ts`; lazy `getPrivy()`).
- Return explicit `Promise<void>` from handlers; `return` after sending a response.

## Module Design

**Exports:** backend uses named exports for functions, default export for `prisma` and `logger` and routers. Frontend components use `export default function`; UI primitives are re-exported from the barrel `frontend/components/ui/index.ts` (import from `@/components/ui`).
- Tailwind class composition via `cn()` from `frontend/lib/cn.ts`; variant maps as `Record<Variant, string>` constants (`components/ui/Button.tsx`).
- Client components start with `'use client'`. API calls live in `frontend/lib/api/*.ts` (one function per endpoint, token passed explicitly); query keys in `lib/api/queryKeys.ts`.
- Placeholder data lives in `frontend/lib/mock/` (do not present fabricated data as real).

## Project Rules (CLAUDE.md)

- Use `~/.foundry/bin/forge` (not `/usr/bin/forge`).
- Prefer editing existing files; don't create docs/README unprompted; run independent tool calls in parallel.

---

*Convention analysis: 2026-10-27*
