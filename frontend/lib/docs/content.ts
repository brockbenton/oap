import type { DocSection } from './types';

// Generated from a codebase-grounded, fact-checked docs pass. Edit the source
// sections rather than hand-tweaking prose here.
export const DOC_SECTIONS: DocSection[] = [
  {
    "id": "quickstart",
    "group": "Getting started",
    "title": "Quickstart",
    "status": "partial",
    "lede": "The fastest way in: a new member scans a QR, signs in with email or Google, and a gas-free attendance token mints to a wallet they never had to set up — while an organizer needs one CLI command plus the admin dashboard to spin up a session QR and run the room.",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Two paths get you from zero to a minted attendance token. A brand-new member needs a phone camera and an email address; an organizer needs one CLI command and the admin dashboard."
      },
      {
        "type": "subheading",
        "text": "For a new member (about 5 minutes)"
      },
      {
        "type": "steps",
        "items": [
          "Open the app and hit Launch app in the top nav. That triggers Privy login — no download, no wallet extension.",
          "Sign in with email, Google, or passkey (all three are enabled). If you have no wallet, Privy creates an embedded one for you on Base Sepolia (`createOnLogin: 'users-without-wallets'`), so there's nothing to install and no seed phrase to write down.",
          "Go to the Check in screen (`/check-in`) and tap Open scanner. Point your camera at the QR on the projector or shared screen. (The page requires you to be signed in — it bounces to the landing page otherwise.)",
          "Approve the Sign & Check In prompt in the Privy popup. The app signs a plain message binding you to the session: `I am checking into session <id> as <your address> at <timestamp>`.",
          "The backend verifies the QR and your signature, records the check-in, and queues your attendance token to mint on-chain via the relay. You land on a confirmation screen while the mint completes in the background."
        ]
      },
      {
        "type": "callout",
        "tone": "info",
        "text": "The mint is gas-free: a backend relay wallet (holding RELAY_ROLE on the contract) pays and submits the transaction, queued as an async job — `POST /api/v1/check-in` returns 202 with a PENDING status. Members never touch gas, RPC, or contract calls. Chain is Base Sepolia testnet (`defaultChain: baseSepolia`)."
      },
      {
        "type": "subheading",
        "text": "For an organizer: get a session running"
      },
      {
        "type": "paragraph",
        "text": "Grant yourself admin, create a session, and put its QR on the screen — everyone who scans it checks in and mints."
      },
      {
        "type": "steps",
        "items": [
          "Grant admin to your wallet with the grant-admin CLI in `backend/`. It writes ADMIN_ROLE on-chain and mirrors the grant into the DB (`admin_roles`). Note: the signing key (`DEFAULT_ADMIN_PRIVATE_KEY`) must itself hold the contract's DEFAULT_ADMIN_ROLE — the gate is enforced on-chain.",
          "In the app, open the admin dashboard at `/admin/sessions` and use Create Session (meeting name, date/time, semester). This creates the session in the DB and on-chain via the relay (`POST /api/v1/sessions`); it moves from Pending to Active once confirmed on-chain.",
          "Open that session's QR page at `/admin/sessions/<sessionId>/qr` (the QR link appears once the session is CONFIRMED and not closed) and display it — it auto-refreshes before the signed payload expires. Members scan it from the Check in screen; each check-in is recorded and a token is queued to mint. Review attendees and per-member mint status by expanding the session back on `/admin/sessions`."
        ]
      },
      {
        "type": "code",
        "language": "bash",
        "code": "# in backend/ — grant on-chain ADMIN_ROLE to your wallet\nnpm run grant-admin -- 0xYourWalletAddress"
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "A few surrounding pieces are UI previews, not live. The Create your club builder at `/organizer/new` doesn't persist — there's no clubs backend yet, so a session is the real unit; its Continue button only navigates. The XP, edition number, and Share to feed flair on the check-in success screen are sample values (the check-in response carries no XP/edition data). And the branded `oap.xyz/c/...` link plus the live \"just checked in\" roster and counts on the organizer run view (`/organizer/run`) come from mock data (`lib/mock/meeting.ts`), not the backend — members enter through the in-app scanner, and organizers hand out QR codes from `/admin/sessions/<id>/qr`."
      }
    ]
  },
  {
    "id": "what-is-oap",
    "group": "Getting started",
    "title": "What is OAP?",
    "status": "live",
    "lede": "OAP (the Onchain Attendance Protocol) turns showing up to a meeting into a permanent, non-transferable token in the member's own wallet. Instead of a name in a spreadsheet, every check-in is a soulbound token minted on Base — a record that is tamper-proof, publicly verifiable, and owned by the member.",
    "blocks": [
      {
        "type": "subheading",
        "text": "Soulbound attendance tokens"
      },
      {
        "type": "paragraph",
        "text": "The protocol is a single smart contract, `AttendanceRegistry` — an ERC-1155 built on OpenZeppelin v5. An admin opens a session (one meeting) with `createSession`, and that session's `id` becomes the token id. When a member checks in, the contract mints exactly one token of that id to their address. Two invariants make the record trustworthy:"
      },
      {
        "type": "bullets",
        "items": [
          "Non-transferable — `_update` reverts on any movement where `from != address(0)`, and `setApprovalForAll` reverts outright with `Soulbound()`. Tokens can only be minted, never sent, sold, or gifted.",
          "One per member per session — `mint` reverts with `AlreadyCheckedIn` if the address already holds the token, so a single check-in can't be double-counted."
        ]
      },
      {
        "type": "code",
        "language": "solidity",
        "code": "// Soulbound: revert all transfers except mints (from == address(0))\nfunction _update(\n    address from,\n    address to,\n    uint256[] memory ids,\n    uint256[] memory values\n) internal override {\n    if (from != address(0)) revert Soulbound();\n    super._update(from, to, ids, values);\n}"
      },
      {
        "type": "subheading",
        "text": "Why onchain instead of a spreadsheet"
      },
      {
        "type": "bullets",
        "items": [
          "Tamper-proof and timestamped — a mint is a transaction on Base; it can't be backdated, edited, or quietly added after the meeting is over.",
          "Can't be faked or shared — because the token is soulbound, attendance can't be handed to someone who wasn't there.",
          "Publicly verifiable — anyone can read balances and the `TokenMinted` event on the block explorer, with no need to trust the organizer's private copy of the sheet.",
          "Owned by the member — the token stays in their wallet after they leave the club, rather than being locked inside an organizer's file."
        ]
      },
      {
        "type": "subheading",
        "text": "Gasless UX"
      },
      {
        "type": "paragraph",
        "text": "Members never touch crypto plumbing. Signing in with email or Google through Privy provisions an embedded wallet — no seed phrase, no browser extension, and no ETH to buy. Minting is sponsored, so the member never submits a transaction or pays gas."
      },
      {
        "type": "steps",
        "items": [
          "The member signs in and Privy creates or loads their embedded wallet.",
          "They check in by scanning the meeting QR; the frontend signs a check-in message and calls the backend rather than the chain directly.",
          "The backend verifies the QR and signature, records the check-in, and queues a mint job. The relay wallet — the only holder of `RELAY_ROLE` — submits `mint(to, sessionId)` and pays the gas.",
          "The soulbound token lands in the member's wallet at $0 cost to them."
        ]
      },
      {
        "type": "callout",
        "tone": "info",
        "text": "Relaying is the only path to a mint: session control lives with `ADMIN_ROLE` (`createSession` / `closeSession`), and only the backend's `RELAY_ROLE` wallet can call `mint`. Members hold neither role and pay nothing."
      },
      {
        "type": "subheading",
        "text": "Where it runs"
      },
      {
        "type": "paragraph",
        "text": "OAP runs on Base, an Ethereum L2 whose low fees make sponsoring every mint practical. Token metadata (the session's name, date, and semester) is served from IPFS — `uri()` returns `ipfs://{baseCid}/{sessionId}.json`."
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "The contract is currently deployed only to the Base Sepolia testnet (chain 84532) at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192`; a Base mainnet deployment is planned but not live yet. Note also that the contract itself has no concept of editions, XP, streaks, or leaderboards — the edition numbers, level progress, and headline counts (members, tokens minted) shown in the app are illustrative placeholders backed by mock data, not onchain state."
      }
    ]
  },
  {
    "id": "create-a-club",
    "group": "For organizers",
    "title": "Create a club",
    "status": "partial",
    "lede": "This build has no \"clubs\" backend — there is no Club model in `prisma/schema.prisma` and no club endpoints. The whole deployment behaves as one implicit club, so you don't create a club so much as get granted organizer access to the one that exists. Club creation as a persisted feature is not built; organizer administration is.",
    "blocks": [
      {
        "type": "callout",
        "tone": "warn",
        "text": "The in-app **Create your club** screen (`/organizer/new`, `frontend/app/organizer/new/page.tsx`) is a non-persisting design stub. Its fields come pre-filled with sample data, the eyebrow reads \"Step 1 of 2 · Basics\" but there is no step 2, and both **Cancel** and **Continue** just `router.push('/organizer')`. Nothing is written to the backend. Likewise the public `/clubs` directory (`frontend/app/clubs/page.tsx`) is served from `MOCK_CLUBS` in `frontend/lib/mock/clubs.ts`. Treat both as mockups of a planned multi-club flow, not working features."
      },
      {
        "type": "subheading",
        "text": "How organizer access actually works"
      },
      {
        "type": "paragraph",
        "text": "Authorization is the on-chain `ADMIN_ROLE`. `backend/src/middleware/admin.ts` verifies it via `hasAdminRoleOnChain` and fails closed — the contract is the source of truth, and the `admin_roles` DB table is only a mirror for display. So becoming an organizer means being granted `ADMIN_ROLE` on the deployed contract; there is no self-serve sign-up."
      },
      {
        "type": "paragraph",
        "text": "Two ways to grant it:"
      },
      {
        "type": "bullets",
        "items": [
          "**CLI** — from the `backend/` directory, run the grant-admin script (below). It signs with `DEFAULT_ADMIN_PRIVATE_KEY`, which must hold `DEFAULT_ADMIN_ROLE` on the contract, then mirrors the wallet into `admin_roles` (with `grantedBy: 'grant-admin-cli'`).",
          "**From an existing admin session** — `POST /api/v1/admin/roles` with `{ \"walletAddress\": \"0x…\" }`. Requires `DEFAULT_ADMIN_PRIVATE_KEY` set on the server (returns `503 NOT_CONFIGURED` otherwise). Revoke with `DELETE /api/v1/admin/roles/:walletAddress`; you cannot revoke your own role. List active roles with `GET /api/v1/admin/roles`."
        ]
      },
      {
        "type": "code",
        "language": "bash",
        "code": "cd backend\nnpm run grant-admin -- 0xYourWalletAddress"
      },
      {
        "type": "subheading",
        "text": "What you get as an organizer"
      },
      {
        "type": "paragraph",
        "text": "Once your wallet holds `ADMIN_ROLE`, the organizer console at `/organizer` unlocks. It is gated on `GET /api/v1/admin/me` (200 => admin, 403 => not), and the dashboard is backed by real data:"
      },
      {
        "type": "bullets",
        "items": [
          "**Overview stats** — the four tiles (members, meetings held, avg attendance, tokens minted) all come from `GET /api/v1/admin/overview`; tokens minted is derived client-side by summing per-session headcount. The recent-meetings table below them comes from `GET /api/v1/admin/sessions`.",
          "**Members, roles, and CSV exports** — `GET /api/v1/admin/members`, `GET /api/v1/admin/roles`, `GET /api/v1/admin/export/members`, `GET /api/v1/admin/export/sessions/:sessionId`.",
          "**Running meetings** — the real unit of work is a Session (see the meetings docs), created via `POST /api/v1/sessions`, not a club."
        ]
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "The club identity in the dashboard header — name, handle, and logo (\"Blockchain Club\", `oap.xyz/c/blockchain-club`) — is hardcoded sample data in `frontend/app/organizer/page.tsx`, not editable or persisted. There is currently no way to name, brand, or configure a club."
      }
    ]
  },
  {
    "id": "run-a-meeting",
    "group": "For organizers",
    "title": "Run a meeting",
    "status": "partial",
    "lede": "Open a session on-chain, project its signed short-lived QR, and members scan to mint their attendance token — with the admin closing the session when the meeting ends.",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Running a meeting is three moves: open a session on-chain, put its QR on the projector, and let members scan to mint. The check-in QR is short-lived and signed by the club's admin signer, so a screenshot taken after the meeting won't work."
      },
      {
        "type": "subheading",
        "text": "1. Open the session"
      },
      {
        "type": "paragraph",
        "text": "An admin creates the session with `POST /api/v1/sessions` (body: `sessionId`, `date`, `name`, `semester`). The handler writes the row in Postgres as `PENDING`, submits the create-session transaction on-chain in the same request, and marks `onchainStatus` `CONFIRMED` on success (or `FAILED` if the chain call reverts). The QR endpoint stays locked until the session is confirmed — `GET /api/v1/sessions/:sessionId/qr` returns `409 CONFLICT` while the session is unconfirmed or already closed."
      },
      {
        "type": "subheading",
        "text": "2. Display the QR"
      },
      {
        "type": "paragraph",
        "text": "The reliable projector surface today is the per-session page `/admin/sessions/[sessionId]/qr`. It fetches the signed payload from the admin-only `GET /api/v1/sessions/:sessionId/qr`, renders it with `react-qr-code`, shows a live countdown decoded from the payload's `expiresAt`, and auto-refetches ~90s before expiry. There's also a manual \"Refresh now\" button. If the session is closed or not yet confirmed, the page shows that state instead of a code."
      },
      {
        "type": "subheading",
        "text": "3. How the QR is secured"
      },
      {
        "type": "paragraph",
        "text": "`generateQR(sessionId)` in `qr.service.ts` builds a payload, signs the JSON with the admin signer (viem account from `ADMIN_SIGNER_PRIVATE_KEY`, via `signMessage`), and base64-encodes an envelope of `{ payload, signature }`:"
      },
      {
        "type": "code",
        "language": "ts",
        "code": "type QRPayload = {\n  sessionId: string;   // on-chain session ID\n  issuedAt: number;    // Date.now() in ms\n  expiresAt: number;   // issuedAt + QR_TTL_MS\n  nonce: string;       // uuid v4, fresh per generation\n};\n// envelope: { payload, signature }  →  base64(JSON)"
      },
      {
        "type": "bullets",
        "items": [
          "Time-boxed: TTL comes from `QR_TTL_MS` (default `600000` = 10 minutes). On check-in, `verifyQR` rejects the code once `Date.now() > expiresAt`.",
          "Signed: `verifyQR` re-serializes the payload and checks the signature against the admin signer's address with viem `verifyMessage`; a tampered payload or a signature from any other key is rejected.",
          "Rotating: the projector page pulls a fresh payload (new `issuedAt`/`expiresAt`/`nonce`, new signature) before the current one expires, so the displayed code keeps working through a long meeting."
        ]
      },
      {
        "type": "callout",
        "tone": "info",
        "text": "On the nonce: it's a fresh uuid per QR *generation*, not per scan. Every member who scans the same displayed code sends the same nonce, and the backend stores it on the check-in row purely for audit — it does not enforce it as a one-time token. Duplicate check-ins are prevented by the `@@unique([memberId, sessionId])` constraint on the `CheckIn` model, which surfaces as `409 ALREADY_CHECKED_IN`."
      },
      {
        "type": "subheading",
        "text": "4. Members check in"
      },
      {
        "type": "steps",
        "items": [
          "A signed-in member opens `/check-in` and scans the projected code with their camera.",
          "The app decodes the `sessionId` from the QR and asks the member to sign `I am checking into session <sessionId> as <address> at <signedAt>` via their Privy wallet.",
          "It calls `POST /api/v1/check-in` with the QR payload, the member signature, and `signedAt`.",
          "The backend rejects stale signatures (older than 60s or more than 10s in the future), verifies the QR (admin signature + expiry), recovers the member address and confirms it matches their Privy-linked wallet, then re-checks the session is `CONFIRMED` and open.",
          "It records the check-in and enqueues a gas-free mint (Bull `mintQueue`), responding `202` with `status: PENDING`. The token mints asynchronously."
        ]
      },
      {
        "type": "subheading",
        "text": "5. Close the meeting"
      },
      {
        "type": "paragraph",
        "text": "When the meeting ends, an admin calls `POST /api/v1/sessions/:sessionId/close` (submits the on-chain close and stamps `closedAt`). After that, both the QR endpoint and any further check-ins are rejected with `409`, so no late attendance slips in."
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "The dedicated \"run meeting\" console at `/organizer/run` is only partially built. It renders a real, live QR for the auto-selected active session, but the attendance count, the total-members figure, the \"Just checked in\" roster, and the elapsed timer are placeholder data from `lib/mock/meeting.ts`, and the \"Pause check-in\" / \"End meeting\" buttons are not wired to anything yet. For a live meeting, drive check-in from the per-session QR page (`/admin/sessions/[sessionId]/qr`) and close the session via the close endpoint."
      }
    ]
  },
  {
    "id": "rewards-and-levels",
    "group": "For organizers",
    "title": "Rewards & levels",
    "status": "partial",
    "lede": "Streaks, attendance %, and the General/Official member tier are computed from real check-in data and shown on the member stats page. XP-style numeric levels, claimable rewards, and the leaderboard are still mock UI with no backend behind them.",
    "blocks": [
      {
        "type": "subheading",
        "text": "Live today: streaks, attendance, and member tier"
      },
      {
        "type": "paragraph",
        "text": "These numbers are computed from real check-in data by `buildPersonalStats` in `backend/src/services/stats.service.ts`, served at `GET /api/v1/members/:address/stats`, and rendered on the member `/stats` page. They count only check-ins whose token mint is `CONFIRMED` on-chain (and whose session is confirmed), so stats never exceed a member's actual holdings."
      },
      {
        "type": "bullets",
        "items": [
          "Current streak — consecutive most-recent confirmed meetings attended, counting back until the first miss (`computeCurrentStreak`).",
          "Longest streak — the longest run of consecutive attended meetings (`computeLongestStreak`).",
          "Tokens earned and all-time attendance % (tokens earned / all confirmed sessions to date).",
          "Current-semester attendance % plus a per-semester breakdown (`semesterBreakdown`).",
          "Rolling activity: meetings attended in the last 30 / 90 / 180 days.",
          "Status tier and badge (see below)."
        ]
      },
      {
        "type": "paragraph",
        "text": "The only real \"level\" is the member tier: General Member vs Official Member. A member becomes an Official Member once their all-time attendance % reaches `OFFICIAL_MEMBER_THRESHOLD` (default 75). This sets the `statusTier` field and drives the badge art (`badgeTierFor` / `tierBadgeUrl` in `backend/src/services/art.service.ts`); founding members carry an additional `foundingMember` flag, which outranks the attendance tier for the badge."
      },
      {
        "type": "paragraph",
        "text": "There is also a real club-wide ranking: the public directory `GET /api/v1/members` (`buildMemberStats`) returns every member sorted by all-time attendance %, then by tokens earned. This is genuine ranking data — but note the `/leaderboard` page does not use it yet (see below)."
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "The \"Rewards\" page, the XP / numeric level, and the `/leaderboard` page are mock UI backed by `frontend/lib/mock/*` — not real data. Do not present these to members as working features."
      },
      {
        "type": "subheading",
        "text": "Planned / mock (not built yet)"
      },
      {
        "type": "bullets",
        "items": [
          "XP & numeric levels — `/rewards` shows \"Level N\" and an XP progress bar from `MOCK_LEVEL` in `frontend/lib/mock/gamification.ts`. The tier-name ladder (Newcomer → Legend) is a hardcoded `LEVEL_TIERS` map in `frontend/app/rewards/page.tsx`, keyed off that mock level number. No XP is computed anywhere in the backend.",
          "Claimable rewards — the reward cards (Founding Member, Early Bird, Five-Week Streak, …) are hardcoded in `frontend/lib/mock/rewards.ts`; the Claim button only flips local React state (`claimedIds`) and persists nothing.",
          "Leaderboard — `/leaderboard` renders `MOCK_LEADERBOARD` with placeholder handles (e.g. `satoshi.base.eth`), and the Semester / Month / All-time toggle returns the same static list. There is no backend endpoint behind it.",
          "The member home (`frontend/components/features/member/MemberHome.tsx`) reads the same mock `useLevel` / `useRank` / `useLeaderboard` hooks."
        ]
      }
    ]
  },
  {
    "id": "architecture",
    "group": "Developers",
    "title": "Architecture",
    "status": "live",
    "lede": "The system is one repo with three packages — a Foundry smart contract, an Express/Prisma/Postgres backend, and a Next.js frontend — wired so that scanning a QR at an event mints a soulbound attendance token. The contract is deployed to Base Sepolia, and the backend relays every mint: a member signs a message with their Privy embedded wallet but never sends a transaction or pays gas.",
    "blocks": [
      {
        "type": "subheading",
        "text": "The three packages"
      },
      {
        "type": "bullets",
        "items": [
          "`smart-contract/` — `AttendanceRegistry.sol` (Solidity ^0.8.24, OpenZeppelin v5). An `ERC1155 + AccessControl + ReentrancyGuard` contract that is soulbound: `_update` reverts any transfer where `from != address(0)` and `setApprovalForAll` always reverts. Roles are `DEFAULT_ADMIN_ROLE` (grant/revoke roles, `setBaseCid`), `ADMIN_ROLE` (`createSession`, `closeSession`), and `RELAY_ROLE` (`mint`). Built/tested/deployed with Foundry.",
          "`backend/` — Node + Express + TypeScript. Postgres via Prisma, viem for signing and contract calls over an Alchemy RPC URL, BullMQ + Redis for the async mint queue, Privy identity-token verification for auth (`PrivyClient.getUser({ idToken })`), and zod for request validation. JSON routes live under `/api/v1/` (`sessions`, `check-in`, `members`, `admin`); the art router (mounted at `/api/v1`) also serves generated SVG badges at `/api/v1/art/:semester` and `/api/v1/badge/:tier`.",
          "`frontend/` — Next.js 14 (App Router) + TypeScript + Tailwind/shadcn. Privy for wallet + embedded-wallet auth, TanStack Query for data fetching against the backend API (typed wrappers in `lib/api/`). The check-in flow (`components/features/check-in/`) opens the camera, decodes the QR, and asks the member's Privy embedded wallet to sign — it never touches the contract directly: writes go through the backend relay and reads come from the backend, not the chain. (wagmi/viem are dependencies but the app does no direct on-chain reads.)"
        ]
      },
      {
        "type": "subheading",
        "text": "Deployment target"
      },
      {
        "type": "bullets",
        "items": [
          "Chain: Base Sepolia testnet (`CHAIN_ID=84532`; the backend switches viem from `baseSepolia` to `base` when `CHAIN_ID=8453`).",
          "`AttendanceRegistry` on base-sepolia: `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` (`addresses.json`).",
          "Token metadata resolves off-chain: `uri(id)` returns `ipfs://{baseCid}/{id}.json`."
        ]
      },
      {
        "type": "subheading",
        "text": "Check-in data flow"
      },
      {
        "type": "steps",
        "items": [
          "Issue QR (admin). Admin calls `GET /api/v1/sessions/:sessionId/qr` (auth + admin gated). `generateQR` builds `{ sessionId, issuedAt, expiresAt, nonce }`, signs the JSON with the admin signer key, and base64-encodes a `{ payload, signature }` envelope. TTL defaults to 10 min (`QR_TTL_MS`, 600000). The session must already be open and `onchainStatus: CONFIRMED`.",
          "Scan + sign (member). `CheckInFlow` opens `QrScanner` (client-only), base64-decodes the payload to read `sessionId`, then has the member's embedded wallet sign `I am checking into session {sessionId} as {address} at {signedAt}` via Privy. It POSTs `{ qrPayload, memberSignature, signedAt }` with a Privy identity token to `/api/v1/check-in`.",
          "Verify (backend). `POST /api/v1/check-in` rejects stale signatures (older than 60s or >10s in the future), runs `verifyQR` (admin signature + expiry), recovers the signer from `memberSignature` and requires it to equal the Privy-authenticated wallet, then loads the session (must exist, be open, and be `CONFIRMED`). It upserts the member, inserts a `CheckIn` row (`@@unique(memberId, sessionId)` → `409 ALREADY_CHECKED_IN`), enqueues a BullMQ `mint` job, and returns `202` with `status: PENDING`.",
          "Relay mint (worker). The mint worker (`concurrency: 1` to avoid nonce collisions; 3 attempts, exponential backoff) runs `runMintJob`, which is idempotent: it skips if the row is already `CONFIRMED`, reconciles if on-chain `balanceOf > 0`, otherwise calls `mintOnChain` → `mint(to, sessionId)` from the `RELAY_ROLE` wallet and waits for the receipt. The contract re-checks session exists + active + `balanceOf == 0` and mints one soulbound token.",
          "Record (persist). On confirmation the worker writes `txHash` + `mintStatus: CONFIRMED` back to Postgres. Terminal failures (`reconcileFailedMint`) re-check on-chain `balanceOf` before marking `FAILED`. The `check_ins` table is the attendance record that the vault and personal/admin stats read from."
        ]
      },
      {
        "type": "code",
        "language": "solidity",
        "code": "// On-chain surface (AttendanceRegistry.sol)\nfunction createSession(uint256 id, uint64 date, string name, string semester) onlyRole(ADMIN_ROLE)\nfunction closeSession(uint256 id) onlyRole(ADMIN_ROLE)\nfunction mint(address to, uint256 sessionId) onlyRole(RELAY_ROLE)  // one soulbound token per (holder, session)\nfunction setBaseCid(string baseCid) onlyRole(DEFAULT_ADMIN_ROLE)\nfunction uri(uint256 id) view returns (string)                     // ipfs://{baseCid}/{id}.json"
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "There is no on-chain event indexer or Alchemy webhook. `backend/CLAUDE.md`'s documented file layout lists an `indexer.service.ts` (and an `ALCHEMY_WEBHOOK_SECRET` env var), but no such service or webhook route exists in the code. Attendance is recorded by the relay worker writing the confirmed `txHash`/`mintStatus` to the `check_ins` table and reconciling against on-chain `balanceOf` — that DB row, not a chain scan, is the source of truth for vaults and stats."
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "Not all of the frontend is live yet. Several surfaces render `lib/mock/` fixtures rather than real data: clubs, rewards/XP/levels, the leaderboard, the explore feed, the organizer live-meeting view, and the XP/edition flair on the check-in success screen. The genuinely backend-backed surfaces are the check-in flow, the member vault, and personal/admin stats."
      }
    ]
  },
  {
    "id": "smart-contract",
    "group": "Developers",
    "title": "Smart contract",
    "status": "live",
    "lede": "`AttendanceRegistry` is the single on-chain contract for the app: a soulbound ERC-1155 that mints one non-transferable attendance token per wallet per session. It inherits OpenZeppelin v5 `ERC1155`, `AccessControl`, and `ReentrancyGuard`, and implements the `IAttendanceRegistry` interface (`smart-contract/src/AttendanceRegistry.sol`).",
    "blocks": [
      {
        "type": "subheading",
        "text": "Deployment"
      },
      {
        "type": "paragraph",
        "text": "The contract targets Base Sepolia (testnet). Its address is recorded in `addresses.json` at the repo root."
      },
      {
        "type": "code",
        "language": "json",
        "code": "{\n  \"AttendanceRegistry\": {\n    \"base-sepolia\": \"0x7bEf8C32157C0A40A51b9bebeb7B36f236316192\"\n  }\n}"
      },
      {
        "type": "paragraph",
        "text": "The constructor is `constructor(address relayWallet, string baseCid)`. On deploy it grants `DEFAULT_ADMIN_ROLE` and `ADMIN_ROLE` to the deployer (`msg.sender`), grants `RELAY_ROLE` to `relayWallet`, and stores `baseCid` as the IPFS base for token metadata."
      },
      {
        "type": "paragraph",
        "text": "Deployment runs through `smart-contract/script/Deploy.s.sol`, which reads the `RELAY_WALLET` (address) and `BASE_CID` (string) environment variables and passes them straight to the constructor."
      },
      {
        "type": "subheading",
        "text": "Soulbound enforcement"
      },
      {
        "type": "paragraph",
        "text": "Tokens cannot be transferred. Enforcement happens in two places:"
      },
      {
        "type": "bullets",
        "items": [
          "`_update(...)` (the OZ v5 transfer hook) reverts with `Soulbound()` whenever `from != address(0)`. Mints have `from == address(0)`, so only minting is allowed; every `safeTransferFrom` / `safeBatchTransferFrom` reverts.",
          "`setApprovalForAll(address, bool)` is overridden as `pure` and always reverts with `Soulbound()`, so no operator approvals can ever be granted."
        ]
      },
      {
        "type": "code",
        "language": "solidity",
        "code": "function _update(address from, address to, uint256[] memory ids, uint256[] memory values)\n    internal override {\n    if (from != address(0)) revert Soulbound();\n    super._update(from, to, ids, values);\n}"
      },
      {
        "type": "subheading",
        "text": "Roles & access control"
      },
      {
        "type": "bullets",
        "items": [
          "`DEFAULT_ADMIN_ROLE` — OZ role admin; grants/revokes all roles and calls `setBaseCid`. Held by the deployer.",
          "`ADMIN_ROLE` (`keccak256(\"ADMIN_ROLE\")`) — calls `createSession` and `closeSession`. Held by the deployer.",
          "`RELAY_ROLE` (`keccak256(\"RELAY_ROLE\")`) — the only role allowed to call `mint`. Held by the backend relay wallet passed to the constructor."
        ]
      },
      {
        "type": "subheading",
        "text": "External functions"
      },
      {
        "type": "code",
        "language": "solidity",
        "code": "// Admin (ADMIN_ROLE)\nfunction createSession(uint256 id, uint64 date, string name, string semester);\nfunction closeSession(uint256 id);\n\n// Admin (DEFAULT_ADMIN_ROLE)\nfunction setBaseCid(string baseCid);\n\n// Relay (RELAY_ROLE, nonReentrant)\nfunction mint(address to, uint256 sessionId);\n\n// Views (open)\nfunction uri(uint256 id) returns (string);        // ipfs://{baseCid}/{id}.json\nfunction getSession(uint256 id) returns (Session); // {uint64 date; string name; string semester; bool active;}\nfunction balanceOf(address, uint256) returns (uint256); // inherited ERC-1155\nfunction supportsInterface(bytes4) returns (bool);"
      },
      {
        "type": "bullets",
        "items": [
          "`createSession` — reverts `InvalidDate()` if `date == 0` (0 is the sentinel for \"does not exist\") and `SessionAlreadyExists()` if the id is already used (including a previously closed id). Creates the session as `active`.",
          "`closeSession` — sets `active = false`; reverts `SessionDoesNotExist()` or `SessionNotActive()`.",
          "`mint` — mints exactly 1 token of `sessionId` to `to`. Reverts `SessionDoesNotExist()`, `SessionNotActive()` (closed session), or `AlreadyCheckedIn()` if the wallet already holds a token for that session (one token per wallet per session). Guarded by `nonReentrant`.",
          "`setBaseCid` — updates the IPFS base CID used by `uri`; emits the old and new CID."
        ]
      },
      {
        "type": "subheading",
        "text": "Events"
      },
      {
        "type": "code",
        "language": "solidity",
        "code": "event SessionCreated(uint256 indexed sessionId, uint64 date, string name, string semester);\nevent SessionClosed(uint256 indexed sessionId);\nevent TokenMinted(address indexed to, uint256 indexed sessionId);\nevent BaseCidUpdated(string oldCid, string newCid);"
      },
      {
        "type": "callout",
        "tone": "info",
        "text": "Behavior above is covered by the Foundry suite in `smart-contract/test/AttendanceRegistry.t.sol`, including role checks, revert conditions, soulbound transfer/approval rejection, the `nonReentrant` guard on `mint` (via a malicious ERC-1155 receiver), and `uri` formatting."
      }
    ]
  },
  {
    "id": "rest-api",
    "group": "Developers",
    "title": "REST API",
    "status": "live",
    "lede": "All endpoints live under the `/api/v1` prefix and speak a single JSON envelope — `{ data }` on success, `{ error: { code, message } }` on failure. Access falls into three tiers: public, member (Privy Bearer token), and admin (Bearer token plus an on-chain ADMIN_ROLE check).",
    "blocks": [
      {
        "type": "paragraph",
        "text": "The backend is an Express (TypeScript) API built in `backend/src/app.ts`. Every route is mounted under the `/api/v1` prefix (plus a bare `GET /health` liveness probe). Routers are split by domain in `backend/src/routes/`: `sessions.ts`, `check-in.ts`, `members.ts`, `admin.ts`, and `art.ts` (mounted directly at `/api/v1`)."
      },
      {
        "type": "subheading",
        "text": "Response envelope"
      },
      {
        "type": "paragraph",
        "text": "Every JSON handler returns one of two shapes. Errors carry a stable machine-readable `code` plus a human `message`."
      },
      {
        "type": "code",
        "language": "json",
        "code": "// success\n{ \"data\": <payload> }\n\n// failure\n{ \"error\": { \"code\": \"NOT_FOUND\", \"message\": \"Session not found\" } }"
      },
      {
        "type": "paragraph",
        "text": "Status codes in use: 200, 201, 202, 400, 401, 403, 404, 409, 429, 500, 503. A few endpoints intentionally break the JSON envelope — the CSV exports return `text/csv`, the SVG asset routes return `image/svg+xml`, and `GET /health` returns `{ \"status\": \"ok\" }`."
      },
      {
        "type": "subheading",
        "text": "Authentication"
      },
      {
        "type": "paragraph",
        "text": "There are three access tiers, enforced by middleware:"
      },
      {
        "type": "bullets",
        "items": [
          "Public — no header required.",
          "Member — `Authorization: Bearer <Privy idToken>`. `authMiddleware` verifies the token against Privy and requires a linked wallet (`403 NO_WALLET` otherwise, `401 UNAUTHORIZED` on a missing/invalid token). It populates `req.user = { privyUserId, walletAddress }` with the address lowercased.",
          "Admin — member auth plus `adminMiddleware`, which checks the on-chain `ADMIN_ROLE` (the contract is the source of truth, not the DB; it fails closed). Non-admins get `403 FORBIDDEN`; if the on-chain check itself errors you get `503 ROLE_CHECK_FAILED`."
        ]
      },
      {
        "type": "subheading",
        "text": "Public endpoints"
      },
      {
        "type": "bullets",
        "items": [
          "`GET /api/v1/members` — Member directory with attendance stats. PII (linked email/social account) is stripped on this public path.",
          "`GET /api/v1/members/:address/tokens` — A wallet's attendance-token vault. Returns `400 BAD_REQUEST` for a malformed address.",
          "`GET /api/v1/members/:address/stats` — A wallet's personal attendance statistics. Returns `400 BAD_REQUEST` for a malformed address.",
          "`GET /api/v1/art/:semester` — Generated per-semester token badge as an SVG (cached 24h).",
          "`GET /api/v1/badge/:tier` — Generated member-tier badge as an SVG (cached 24h)."
        ]
      },
      {
        "type": "subheading",
        "text": "Member endpoints (Bearer token)"
      },
      {
        "type": "bullets",
        "items": [
          "`POST /api/v1/check-in` — Check into a session. Body: `{ qrPayload, memberSignature, signedAt }`. Verifies the admin-signed QR, recovers the member signature and binds it to the authenticated wallet, records the check-in, and queues the mint asynchronously. Returns `202` with `{ checkInId, jobId, sessionId, memberAddress, status: \"PENDING\" }`. Rate limited to 30 requests / 60s per Privy user (`429 RATE_LIMITED`). Signatures older than 60s (or >10s in the future) are rejected as `400 STALE_SIGNATURE`; a repeat check-in returns `409 ALREADY_CHECKED_IN`.",
          "`GET /api/v1/sessions/:sessionId` — Fetch a single session by its on-chain id.",
          "`GET /api/v1/members/me` — The caller's own profile (username, avatarColor, bio, notifyEmail); returns defaults if no row exists yet.",
          "`PATCH /api/v1/members/me` — Upsert the caller's profile. A taken username returns `409 USERNAME_TAKEN`."
        ]
      },
      {
        "type": "subheading",
        "text": "Admin endpoints (Bearer + on-chain ADMIN_ROLE)"
      },
      {
        "type": "bullets",
        "items": [
          "`POST /api/v1/sessions` — Create a session in the DB and on-chain. Body: `{ sessionId, date, name, semester }`. Returns `201`; `409 CONFLICT` if the session id already exists.",
          "`POST /api/v1/sessions/:sessionId/close` — Close a session on-chain and stamp `closedAt`.",
          "`GET /api/v1/sessions/:sessionId/qr` — Generate a time-limited, admin-signed QR payload for a confirmed, open session.",
          "`GET /api/v1/admin/me` — Admin-gate probe: `200` = admin, `403` = not.",
          "`GET /api/v1/admin/overview` — Dashboard overview: attendance-over-time series, per-session headcount, and session-over-session delta.",
          "`GET /api/v1/admin/sessions` — All sessions ordered by date (desc), each with an `attendeeCount`.",
          "`GET /api/v1/admin/sessions/:sessionId/attendees` — Attendee list for a session (`walletAddress`, `checkedInAt`, `mintStatus`, `txHash`).",
          "`GET /api/v1/admin/members` — Full member roster including linked-account PII.",
          "`PATCH /api/v1/admin/members/:memberId/founding-member` — Set/unset the founding-member flag. Body: `{ founding: boolean }`.",
          "`GET /api/v1/admin/export/sessions/:sessionId` — CSV export of a session's attendees.",
          "`GET /api/v1/admin/export/members` — CSV export of the full member roster.",
          "`GET /api/v1/admin/roles` — List active (non-revoked) admin roles.",
          "`POST /api/v1/admin/roles` — Grant `ADMIN_ROLE` on-chain and record it. Body: `{ walletAddress }`. Returns `201`; `409 CONFLICT` if already granted.",
          "`DELETE /api/v1/admin/roles/:walletAddress` — Revoke `ADMIN_ROLE` on-chain and in the DB. Self-revocation is blocked (`400 BAD_REQUEST`) to avoid lockout.",
          "`POST /api/v1/admin/ipfs/publish` — Generate and stage per-semester token metadata for confirmed sessions. With a pinning key (`PINATA_JWT`) set it pins the metadata directory to IPFS and, if `DEFAULT_ADMIN_PRIVATE_KEY` is also set, writes the resulting base CID to the contract. Without `PINATA_JWT` it runs as a dry-run (stage only, no pin, no on-chain write)."
        ]
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "The role-management writes — `POST` / `DELETE /api/v1/admin/roles` — return `503 NOT_CONFIGURED` unless `DEFAULT_ADMIN_PRIVATE_KEY` is set (it signs the on-chain grant/revoke). `POST /api/v1/admin/ipfs/publish` does NOT 503: it simply skips the on-chain base-CID write (leaving `setBaseCidTx: null`) when the run is a dry-run (no `PINATA_JWT`) or `DEFAULT_ADMIN_PRIVATE_KEY` is missing."
      }
    ]
  },
  {
    "id": "local-development",
    "group": "Developers",
    "title": "Local development",
    "status": "partial",
    "lede": "The stack has three packages: smart-contract (Foundry), backend (Express + Prisma + BullMQ), and frontend (Next.js 14). The AttendanceRegistry contract is already deployed to Base Sepolia, so day-to-day local work usually means running the backend and frontend against it — you only need Foundry when changing the contract. Note that several frontend pages still render from mock fixtures rather than live data (see the callout in the frontend section).",
    "blocks": [
      {
        "type": "subheading",
        "text": "Prerequisites"
      },
      {
        "type": "bullets",
        "items": [
          "Node.js + npm — for the backend and frontend packages.",
          "Foundry — invoke as `~/.foundry/bin/forge` (the `/usr/bin/forge` on PATH is an unrelated binary).",
          "PostgreSQL and Redis running locally — the backend hard-requires both (`DATABASE_URL`, `REDIS_URL`) and calls `process.exit(1)` on startup if either is missing.",
          "No local chain needed: `AttendanceRegistry` is deployed on Base Sepolia (chain 84532) at `0x7bEf8C32157C0A40A51b9bebeb7B36f236316192` (see `addresses.json`, key `AttendanceRegistry.base-sepolia`)."
        ]
      },
      {
        "type": "subheading",
        "text": "1. Smart contract (Foundry)"
      },
      {
        "type": "paragraph",
        "text": "Only needed when changing the contract; the backend and frontend point at the already-deployed address. Run from `smart-contract/`."
      },
      {
        "type": "code",
        "language": "bash",
        "code": "~/.foundry/bin/forge build       # compile\n~/.foundry/bin/forge test        # run tests\n~/.foundry/bin/forge coverage    # coverage report\n\n# Deploy.s.sol reads RELAY_WALLET + BASE_CID (constructor args) from env.\n# This is a dry-run simulation; add --rpc-url base_sepolia --broadcast --verify\n# (and a deployer key) for a real deploy.\n~/.foundry/bin/forge script script/Deploy.s.sol"
      },
      {
        "type": "callout",
        "tone": "info",
        "text": "`Deploy.s.sol` requires `RELAY_WALLET` (granted `RELAY_ROLE`) and `BASE_CID` (metadata base CID) in the environment and reverts if either is unset. RPC endpoints and verification resolve `ALCHEMY_API_KEY` and `BASESCAN_API_KEY` (per `foundry.toml`); the deployer key is passed to `forge` at the CLI (e.g. `--private-key $PRIVATE_KEY` or `--account`) — the script itself uses a bare `vm.startBroadcast()`. After a real deploy, update `addresses.json` and regenerate the ABI into `backend/src/lib/abi.ts` and `frontend/lib/contracts/abi.ts` (the `sync-abi` skill)."
      },
      {
        "type": "subheading",
        "text": "2. Backend (port 3001)"
      },
      {
        "type": "steps",
        "items": [
          "`cd backend && npm install`",
          "`cp .env.example .env` and fill in the required values (below).",
          "`npm run db:generate` — generate the Prisma client.",
          "`npm run db:migrate` — apply migrations to your local Postgres.",
          "`npm run db:seed` — optional, seeds sample data (`prisma/seed.ts`).",
          "`npm run dev` — starts on port 3001 with hot reload (`tsx watch src/index.ts`); the BullMQ mint worker starts in the `app.listen` callback."
        ]
      },
      {
        "type": "code",
        "language": "bash",
        "code": "npm run dev                        # tsx watch src/index.ts (hot reload)\nnpm run build                      # prisma generate && tsc\nnpm run typecheck                  # tsc --noEmit\nnpm run test                       # vitest run\nnpm run db:generate                # prisma generate\nnpm run db:migrate                 # prisma migrate dev\nnpm run db:push                    # prisma db push\nnpm run db:seed                    # tsx prisma/seed.ts\nnpm run grant-admin -- <address>   # grant ADMIN_ROLE to a wallet\nnpm run start                      # node dist/index.js (after build)"
      },
      {
        "type": "paragraph",
        "text": "Required backend env vars — startup fails fast (`process.exit(1)`) if any are missing:"
      },
      {
        "type": "bullets",
        "items": [
          "`DATABASE_URL` — local Postgres, e.g. `postgresql://user:password@localhost:5432/onchain_attendance`.",
          "`REDIS_URL` — local Redis, e.g. `redis://localhost:6379`.",
          "`ALCHEMY_API_KEY` — used to build the Base RPC URL (viem over Alchemy).",
          "`CONTRACT_ADDRESS` — deployed AttendanceRegistry (`.env.example` ships the Base Sepolia address).",
          "`RELAY_PRIVATE_KEY` — wallet holding `RELAY_ROLE`; sponsors mints.",
          "`ADMIN_SIGNER_PRIVATE_KEY` — wallet with `ADMIN_ROLE`; also signs QR payloads.",
          "`PRIVY_APP_ID` and `PRIVY_APP_SECRET` — Privy server-side auth."
        ]
      },
      {
        "type": "paragraph",
        "text": "Optional / defaulted: `PORT` (3001), `CHAIN_ID` (84532 → Base Sepolia, 8453 → mainnet), `QR_TTL_MS` (600000). `ALCHEMY_WEBHOOK_SECRET` and `NODE_ENV` ship in `.env.example` but aren't enforced. `DEFAULT_ADMIN_PRIVATE_KEY` (enables on-chain role grant/revoke) and the IPFS/art vars (`PINATA_JWT`, `CONTRACT_BASE_CID`, `SEMESTER_ART_CIDS`/`DEFAULT_SEMESTER_ART_CID`) are read only when those paths run — art staging is a no-op dry-run unless `PINATA_JWT` is set."
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "Use testnet/dev credentials only. These are local development values — never paste production private keys or secrets into `.env`, and never commit real secrets."
      },
      {
        "type": "subheading",
        "text": "3. Frontend (port 3000)"
      },
      {
        "type": "steps",
        "items": [
          "`cd frontend && npm install`",
          "`cp .env.example .env.local` and fill in the values (below).",
          "`npm run dev` — Next.js dev server on http://localhost:3000."
        ]
      },
      {
        "type": "code",
        "language": "bash",
        "code": "npm run dev        # next dev\nnpm run build      # next build\nnpm run typecheck  # tsc --noEmit\nnpm run lint       # next lint\nnpm run start      # next start (after build)"
      },
      {
        "type": "paragraph",
        "text": "Frontend env vars (all `NEXT_PUBLIC_*`, from `.env.example`):"
      },
      {
        "type": "bullets",
        "items": [
          "`NEXT_PUBLIC_PRIVY_APP_ID` — Privy client app ID; without it `AppProviders` skips Privy and only mounts the query client.",
          "`NEXT_PUBLIC_CONTRACT_ADDRESS` — AttendanceRegistry address; required at runtime (`getContractAddress()` throws if unset), and shipped empty in `.env.example`.",
          "`NEXT_PUBLIC_API_URL` — backend base URL; `.env.example` sets `http://localhost:3001`. If unset, the client's `API_BASE` falls back to `''` (same-origin), not localhost.",
          "`NEXT_PUBLIC_CHAIN_ID` — present in `.env.example` (`84532`) but not read by any code; the app hardcodes Base Sepolia in `AppProviders.tsx` (`defaultChain`/`supportedChains`)."
        ]
      },
      {
        "type": "callout",
        "tone": "warn",
        "text": "Not all of the frontend is wired to the backend yet. The core flows — check-in, vault, stats, admin, account — call the API through `lib/api`. The social/gamification pages (`explore`, `clubs`, `leaderboard`, `rewards`, `organizer/run`, and the member home) render from static fixtures in `frontend/lib/mock` and are not backed by the backend or chain."
      },
      {
        "type": "subheading",
        "text": "Recommended start order"
      },
      {
        "type": "steps",
        "items": [
          "Start PostgreSQL and Redis.",
          "Backend: run `npm run db:migrate` (first run), then `npm run dev` — listens on :3001, exposes `/health` (returns `{ status: 'ok' }`).",
          "Frontend: `npm run dev` on :3000; it reaches the backend via `NEXT_PUBLIC_API_URL`.",
          "Run `forge` only when changing the contract — it is already live on Base Sepolia."
        ]
      }
    ]
  }
];
