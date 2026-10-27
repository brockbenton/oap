# Feature Landscape

**Domain:** Club attendance / proof-of-attendance (POAP-style, soulbound, gasless) dApp, single university club, Base Sepolia
**Researched:** 2026-10-27
**Confidence:** MEDIUM. Based on the repo (mock files, Prisma schema, PROJECT.md) plus knowledge of POAP, Luma, Gitcoin Passport, Galxe and Guild-style products. No web verification was done this round, so ecosystem claims are from training data. The repo-grounded mapping is HIGH confidence.

## What the mocks promise vs. what one club can actually supply

| Mock file | Promises | Real data available today | Verdict |
|---|---|---|---|
| `clubs.ts` | 7 clubs across Universities/DAOs/Meetups, member counts, meetings, tokens, `joined` flag | One club. There is no `Club` table. `Member`, `Session` and `CheckIn` give counts. | Collapse to a single club page or card with real counts. Remove the multi-club list. |
| `explore.ts` feed | Global mint feed, handle, topic, club, time ago, txHash, edition number | `CheckIn` joined to `Session` and `Member` gives all of it. Edition number is a rank by `checkedInAt` within a session. | Real and cheap. Only confirmed mints should show a txHash link. |
| `explore.ts` collectors | Top collectors | Same as the existing leaderboard: `COUNT(check_ins)` per member | Reuse the existing leaderboard query. |
| `explore.ts` trending | Trending topics with counts | `Session.name` and the count of check-ins per session | Rename to "Popular sessions". The topic taxonomy is fake. |
| `explore.ts` stats | tokens minted, members, clubs, meetingsThisWeek | All derivable. `clubs` is always 1. | Drop the clubs stat. |
| `gamification.ts` | Level/XP, rank + delta, leaderboard with streakWeeks and xp, timeframe tabs | Tokens and rank are real. Streak is computable from `Session.date` (it needs a definition of "consecutive"). XP and level have no source. Rank delta needs historical snapshots. | Derive XP as attendance count times a constant. Cut rank delta. |
| `meeting.ts` | Live meeting: elapsed time, checked-in vs total, live roster | An open session (`closedAt` null) with its `CheckIn` rows. Total members is `Member` count. | Real via polling, no websockets. |
| `rewards.ts` | 7 rewards gated by level, with claimed/ready/locked status | There is no `Reward` or `Claim` model. Every reward is a computable badge except Community Pin (needs 3 clubs) and Speaker Spotlight (hosting). | Reframe as derived achievements. Do not build a claim or mint flow. |

Schema note: the existing `Member.foundingMember` flag supports the "Founding Member" reward directly. `Member.username`, `avatarColor` and `bio` support real handles in feeds (replace the `avatarSeed` strings).

## Table Stakes

For a single-club testnet launch. Missing any of these means the pages look broken or lying.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Member-facing mint status (PENDING / CONFIRMED / FAILED) on check-in result and on the member's history | The check-in returns 202 and mints asynchronously. Users who scan and see nothing assume it failed. This is the top support question for POAP-style flows. | Low-Med | `CheckIn.mintStatus` and `txHash` already exist. Needs a status endpoint plus the frontend polling it (3-5 s, stop on terminal state). Use friendly copy for PENDING ("minting, usually under a minute"). |
| Link from a confirmed mint to the BaseScan tx and token | Verifiability is the point of onchain attendance. | Low | `txHash` exists. The chain id and explorer base URL must be configurable (Sepolia now, mainnet later). |
| Honest FAILED state with retry path | Failed mints must not look like success. | Med | Depends on the sweeper (PROJECT.md reliability item). The member sees "we're retrying", not an error dead end. |
| "My attendance" history list | Members expect to see every session they attended and the mint state of each. | Low | Query `CheckIn` by member. Probably partly exists in stats. |
| Real club page (name, member count, session count, tokens minted, upcoming and past sessions) | The clubs page is the product's identity. | Low | Needs only config or a constants file, or a minimal `Club` row. There is no multi-club join model. |
| Real explore stats and recent-mint feed (anonymized or username-based) | Proves the product is alive. An empty or fake feed kills credibility. | Low-Med | Aggregates over `check_ins`. Cache for 30-60 s. Show an empty state for zero data. |
| Leaderboard on real data (semester / all-time) | Already exists. Mocks must be removed and the timeframe tabs made truthful. | Low | The `month` tab needs a real date filter or must be removed. |
| Empty and loading states for all three pages | Day one has zero check-ins, so every page is empty at launch. | Low | An easy thing to forget when replacing mocks that were always populated. |
| Privacy-safe public feed | A global feed shows wallet addresses and attendance. Show username or truncated address. Respect any opt-out. | Low | A feed that links names to wallets is the main privacy risk. |
| Rewards page as derived achievements (earned vs locked, with progress) | The mock UI shows claimed/ready/locked. With no data it must still be truthful. | Med | Compute from `CheckIn` and `Session`. See the reward mapping below. |
| Live meeting view for admin (count, roster) | The admin watches check-ins arrive at a meeting. The data is already in the database. | Low-Med | Poll every few seconds. Total members is the denominator. Make sure "elapsed" comes from `Session` start, not a client timer. |

### Reward mapping (derived, no new onchain mints)

| Mock reward | Realistic? | Rule |
|---|---|---|
| Founding Member | Yes | `Member.foundingMember` |
| Early Bird | Yes | Among the first 5 `checkedInAt` in any session |
| Five-Week Streak | Yes | 5 consecutive weekly sessions (define "consecutive" by session sequence, not calendar, to avoid holiday gaps) |
| Perfect Semester | Yes | Attended every session in a `Session.semester` (only evaluate when closed) |
| Semester MVP | Yes | Top 3 at semester end (only meaningful after the semester closes) |
| Community Pin | No | Needs multiple clubs. Drop it or rename it ("Attend 10 sessions"). |
| Speaker Spotlight | Deferred | Needs a "host" concept. Drop it or add an admin-assigned `Session.speaker`. |
| `requiredLevel` gating | Drop | Levels have no real source. Gate by the rule itself, not by level. |

## Differentiators

Not expected for launch, but valuable. Pick at most one or two.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Gasless, passkey/email onboarding (already built) | The main differentiator over POAP, which needs a wallet and a claim link. Don't regress it. | Done | Protect it with the frontend tests. |
| Streak display on profile and leaderboard | A known retention driver in attendance products | Med | A pure query over sessions. Define the rule once and share it with the rewards logic. |
| Shareable attendance card / OG image per mint | Social proof, free marketing for the club | Med | Needs a public mint page and an image route. Defer past launch. |
| Public verify page (`/token/:checkInId` or wallet profile) | Lets anyone verify attendance without logging in, useful for résumés | Med | Needs privacy opt-in. |
| Attendance export for officers (CSV, already built) | Officers need it for university funding reports | Done | Keep. |
| Edition numbers ("#12 of 40") | A cheap collectible feel from data you already have | Low | Rank by `checkedInAt` within a session. |
| Rank delta ("up 3") | Motivating | Med-High | Needs periodic snapshots. Not worth it for one small club. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Multi-club directory, join/leave flow, per-club membership | There is one club, so the data would be invented or the model overbuilt. Mock clubs like Stanford and MIT are fabricated and the last commit already removed fabricated data. | A single club page. Add a `Club` table only when a second club exists. |
| Fabricated or seeded feed entries, fake counts, fake "you" rows | A live demo that shows fake users destroys trust. | Honest empty states. |
| Level and XP system with invented weights | Nothing in the data defines levels, and arbitrary XP invites disputes. | Show attendance count and streak. If a level is needed, use `floor(attendance / N)` and say so. |
| Claimable or mintable reward tokens | A second token type means a new contract, role handling and audit scope. This is out of scope for testnet. | Derived badges only, shown in the UI. |
| Onchain indexer (`TokenEvent`) for the feed | Explicitly out of scope in PROJECT.md. The `check_ins` table is the source of truth. | Reconcile with the sweeper. |
| Websocket or SSE live roster | Extra infrastructure for one club of about 50 people | Poll every 3-5 s. |
| Trending-topics taxonomy | Session names are free text, so topic extraction would be invented. | "Popular sessions" ranked by attendance. |
| Transferable or tradable tokens, marketplace | This contradicts the soulbound design. | None. |
| Per-member public wallet leaderboard with no opt-out | Privacy exposure | Usernames, with an opt-out later if needed. |
| Mock fallback when the API fails | Hides outages and shows fake data | Show an error state with retry. |

## Feature Dependencies

```
Sweeper for stuck PENDING check-ins -> Honest FAILED/retry state -> Member mint status UI
Mint status endpoint -> My attendance history -> Rewards page (derived rules)
Session sequence definition ("consecutive") -> Streak -> Five-Week Streak reward, leaderboard streak
Session.semester closed -> Perfect Semester, Semester MVP
Member.username / avatarColor -> Privacy-safe feed, leaderboard, live roster
check_ins aggregate endpoints -> Explore stats, Recent mints feed, Popular sessions, Collectors
Open-session query (closedAt null) -> Live meeting view
Explorer URL config (chain-aware) -> txHash links in feed and history
Replace mocks (clubs, explore, gamification, meeting, rewards) -> Frontend tests no longer assert on mock data
```

## MVP Recommendation

Prioritize:
1. Member mint status (endpoint, polling UI, explorer link) with the sweeper behind it. This directly serves the core value.
2. Explore page on real aggregates (stats, recent mints, collectors, popular sessions) with proper empty states and privacy-safe handles.
3. Clubs page reduced to the single real club.
4. Rewards page as derived achievements (Founding Member, Early Bird, Streak, Perfect Semester, Semester MVP).
5. Live meeting view on real data for the admin.

Defer: shareable cards and public verify page (needs privacy decisions), rank delta, level and XP, Community Pin and Speaker Spotlight (no data source), any multi-club model.

## Open Questions

- Does the owner want the "level" concept kept? If so, define it as a pure function of attendance count.
- Is the explore feed public, or only for logged-in members? This decides the privacy approach.
- What is a "week" for streak purposes (calendar week vs. session sequence)? Recommend session sequence.
- Do the existing stats endpoints already compute streak and total attendance? Check `backend/src` before building new queries (not verified here).

## Sources

- `/Users/joelgaikwad/Desktop/Computer Science/clubs:personal/Blockchain/oap/frontend/lib/mock/*.ts` (HIGH, read directly)
- `/Users/joelgaikwad/Desktop/Computer Science/clubs:personal/Blockchain/oap/backend/prisma/schema.prisma` (HIGH)
- `/Users/joelgaikwad/Desktop/Computer Science/clubs:personal/Blockchain/oap/.planning/PROJECT.md` (HIGH)
- Domain norms from POAP, Luma, Galxe and Guild-style products (LOW to MEDIUM, training data, not re-verified)
