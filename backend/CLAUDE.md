# Backend — Rules & Conventions

## Stack
- **Node.js** + **Express** + **TypeScript** (strict)
- **PostgreSQL** + **Prisma ORM** — all DB access through Prisma client
- **Alchemy SDK** — Base RPC provider, event webhooks
- **viem** — contract interaction, signing, encoding (server-side)
- **Bull** + **Redis** — async job queue for transaction relay
- **zod** — request validation on all endpoints
- **jsonwebtoken** — session tokens for admin auth (Privy-verified)

## Project Structure
```
backend/
  src/
    routes/             # Express routers, one file per domain
      sessions.ts       # Session CRUD + QR generation
      check-in.ts       # Check-in verification + relay queue
      members.ts        # Member stats + token history
      admin.ts          # Admin dashboard endpoints
    services/
      qr.service.ts     # QR payload sign/verify logic
      relay.service.ts  # Transaction relay (mint via contract)
      indexer.service.ts# On-chain event → DB sync
      stats.service.ts  # Attendance stat calculations
    jobs/
      mint.job.ts       # Bull job: send mint transaction
    middleware/
      auth.ts           # Privy JWT verification
      admin.ts          # Admin role check (DB + on-chain)
      validate.ts       # Zod request validation wrapper
    lib/
      prisma.ts         # Prisma client singleton
      alchemy.ts        # Alchemy provider singleton
      contract.ts       # Contract instance + ABI
    types/              # Shared TypeScript types
  prisma/
    schema.prisma
    migrations/
```

## API Conventions

### Routing
- All routes prefixed `/api/v1/`
- RESTful resource naming (nouns, not verbs)
- Admin routes under `/api/v1/admin/` — always require `adminMiddleware`

### Request / Response
- All request bodies validated with Zod schemas before handler logic
- Successful responses: `{ data: T }`
- Error responses: `{ error: { code: string, message: string } }`
- HTTP status codes used correctly: 200, 201, 400, 401, 403, 404, 409, 500
- Never leak stack traces or internal errors to clients

### Auth
- Member auth: Privy JWT in `Authorization: Bearer <token>` header, verified server-side
- Admin auth: Privy JWT + `admin` role check in DB (and optionally on-chain)
- `req.user` is typed as `{ privyUserId: string, walletAddress: string }`

## QR Payload Spec
```ts
type QRPayload = {
  sessionId: string;   // on-chain session ID
  issuedAt: number;    // Unix timestamp ms
  expiresAt: number;   // Unix timestamp ms (issuedAt + QR_TTL_MS)
  nonce: string;       // random uuid, single-use
}
// Signed with ADMIN_SIGNER_PRIVATE_KEY using viem's signMessage
// Encoded as base64 JSON for QR code
```

## Transaction Relay
- Relay wallet address holds `RELAY_ROLE` on the contract
- Mints are queued as Bull jobs — never blocking the HTTP response
- Job retries: max 3, exponential backoff
- Failed mints after retries: logged to DB with `status: 'failed'`, alertable
- Relay wallet balance monitored — alert if below threshold

## Conventions
- All DB queries through Prisma — no raw SQL unless performance-critical (document why)
- Wallet addresses stored lowercase, validated as checksummed on input
- All timestamps stored as UTC in DB
- Sensitive config (private keys, DB URL) via environment variables only — never committed
- BigInt from viem/contracts serialized as strings in JSON responses

## FORBIDDEN
- Raw `fetch` to RPC — use Alchemy SDK
- Directly calling contract from route handler — always go through relay queue
- Storing private keys anywhere except environment variables
- `any` type
- `console.log` — use a structured logger (e.g. `pino`)
- Trusting member-supplied wallet addresses for minting without signature verification

## Environment Variables
```
DATABASE_URL
REDIS_URL
ALCHEMY_API_KEY
ALCHEMY_WEBHOOK_SECRET
CONTRACT_ADDRESS
RELAY_PRIVATE_KEY          # Wallet with RELAY_ROLE
ADMIN_SIGNER_PRIVATE_KEY   # Wallet that signs QR payloads
PRIVY_APP_ID
PRIVY_APP_SECRET
QR_TTL_MS                  # Default: 600000 (10 min)
CHAIN_ID                   # 8453 (Base Mainnet) or 84532 (Base Sepolia)
```
