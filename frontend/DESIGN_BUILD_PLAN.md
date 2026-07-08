# Frontend Design Build Plan — OAP (Hubble recreation)

Recreate the full OAP design handoff in the existing Next.js frontend. Work is broken
into bite-sized, checkbox-driven tasks so each can be attacked independently. Check items
off as they land.

## Decisions (locked)
- **Scope:** full recreation of all 24 design frames (marketing, member app desktop + mobile, organizer console, edge states).
- **Data:** features with no backend (XP, levels, leaderboard, rewards, multi-club, explore feed) use **sample data behind a typed data layer** (`lib/mock/*` + typed hooks) so real endpoints can be swapped in later. Design states "all numbers are sample data."
- **Theme:** light mode only (Hubble light tokens).
- **Fonts:** `Geist` (UI) + `Geist Mono` (all numbers/hashes/addresses/eyebrows), `tabular-nums`.
- **Mobile:** each route renders **responsively** (desktop + mobile layouts via breakpoints / conditional subcomponents). We do **not** duplicate routes for mobile — the mobile frames are the small-screen rendering of the same routes. The phone/browser chrome in the handoff is presentation only and is NOT built.

## Source of truth
- Design canvas: `~/Downloads/design_handoff_oap/OAP.dc.html` (1747 lines; frame line refs below).
- Tokens: `~/Downloads/design_handoff_oap/tokens.css`.
- Handoff README: `~/Downloads/design_handoff_oap/README.md` (design language + per-screen intent).
- Each task lists its frame `id`, `data-screen-label`, and HTML line number for pixel-faithful reference.

## Frame index (HTML line → frame)
| Frame | Label | Line |
|---|---|---|
| 1a | Landing | 1426 |
| 1b | Home A (member) | 1535 |
| 1d | Check-in scan | 1678 |
| 1d | Mint success | 1707 |
| 2a | Protocol | 1030 |
| 2b | Clubs | 1112 |
| 2c | Explore | 1235 |
| 2d | Docs | 1322 |
| 3a | Clubs empty | 905 |
| 3b | Explore empty | 954 |
| 4a | Vault | 617 |
| 4b | Leaderboard | 673 |
| 4c | Rewards | 767 |
| 4d | Account menu | 848 |
| 5a | Mobile Home | 413 |
| 5b | Mobile Vault | 458 |
| 5c | Mobile Leaderboard | 494 |
| 5d | Mobile Rewards | 529 |
| 5e | Mobile Account | 561 |
| 6a | Create club | 184 |
| 6b | Organizer dashboard | 237 |
| 6c | Run meeting (projector) | 294 |
| 6d | Members & attendance | 342 |
| 7a | Token detail (modal) | 39 |
| 7b | New member home (empty) | 83 |
| 7c | Check-in error states (×3) | 121 |

## Proposed routing map
| Route | Screen(s) | Backing data |
|---|---|---|
| `/` | Landing (logged out) → Home (logged in) 1a/1b/7b | mock (marketing) + real (member stats) |
| `/protocol` | Protocol 2a | static |
| `/clubs` | Clubs 2b / empty 3a | mock |
| `/explore` | Explore 2c / empty 3b | mock |
| `/docs` | Docs 2d | static |
| `/vault` | Vault 4a / 5b (+ token detail 7a) | **real** (getMemberVault) |
| `/leaderboard` | Leaderboard 4b / 5c | mock |
| `/rewards` | Rewards 4c / 5d | mock |
| `/check-in` | Scan → Mint success → error states 1d/7c | **real** (check-in flow) |
| `/account` | Account 5e (mobile) + AccountMenu dropdown 4d | **real** (Privy) |
| `/organizer` (or `/c/[handle]`) | Organizer console 6a–6d | **real admin backend** + mock club metadata |

Existing `/admin/*` pages are **superseded** by the organizer console (reuse their API wiring, restyle to the design). `/stats` folds into Home + Vault + Leaderboard.

## Data layer strategy
Every screen reads through typed hooks in `lib/api/` (real) or `lib/mock/` (sample). Mock hooks
mirror the shape of a future endpoint so wiring is a one-line swap. Track what's real vs mock:

| Domain | Status | Source |
|---|---|---|
| Member vault (tokens) | real | `getMemberVault` |
| Personal stats (attendance %, streak, tiers, semester) | real | `getPersonalStats` |
| Admin overview / members / sessions / roles / QR | real | `lib/api/admin.ts` |
| Check-in submit + QR verify | real | `lib/api/check-in.ts` |
| XP / level / rank / leaderboard | **mock** | `lib/mock/gamification.ts` |
| Rewards catalog + claim state | **mock** | `lib/mock/rewards.ts` |
| Clubs directory + club profile | **mock** | `lib/mock/clubs.ts` |
| Explore live mint feed + collectors + trending | **mock** | `lib/mock/explore.ts` |
| Organizer live meeting roster/counter | **mock** (poll stub) | `lib/mock/meeting.ts` |

---

## Milestone 0 — Foundation (BLOCKS everything)
Build and get a clean `npm run typecheck` before starting screens.

- [x] **0.1 Design tokens → `app/globals.css`.** Port the Hubble light-mode token layer from `tokens.css` (colors, semantic light vars, type scale, spacing, radius, control heights, elevation, motion). Add `@keyframes oapSheen` (translateX -120%→220%, 3s) and `@keyframes oapPulse`. Add `.num` tabular-nums utility. Set body font to Geist, bg `#fbfbfc`/white per screen. Remove the old Arial/dark-mode stub.
- [x] **0.2 Tailwind theme → `tailwind.config.ts`.** Map tokens to Tailwind: `colors` (black `#010304`, brand-cyan, blue/purple/green/yellow/red/orange/lime scales, semantic content/border/card/status), `fontFamily` (sans=Geist, mono=Geist Mono), `borderRadius` (sm5/md10/lg20/panel20/context24/full999), `boxShadow` (elev-sm/md/lg), `fontSize` (display/heading/body/num scales), `spacing` (4pt), `transitionTimingFunction` (ease-out), `keyframes`+`animation` (sheen, pulse, fadeInUp). Keep `content` globs.
- [x] **0.3 Fonts.** Add `Geist Mono` to `app/layout.tsx` via `next/font/local` (`--font-geist-mono`); copy `GeistMono-VariableFont_wght.ttf` from handoff into `app/fonts/` (existing `GeistVF.woff` covers UI). Wire both variables onto `<body>`.
- [x] **0.4 Token gradient map + helpers → `lib/tokenArt.ts`.** The 6 topic gradients (135deg): blue `#005cf0→#26ddf9`, purple `#6833ff→#a485ff`, green `#0e8535→#c8f028`, orange `#fb6832→#f7b133`, red/orange `#fc4848→#f59e00`, teal `#00a6a6→#26ddf9`. `gradientForTopic(topic)` deterministic picker + `avatarGradient(seed)` for member avatars.
- [x] **0.5 Types for new domains → `types/index.ts` (extend).** Add `Level/XP`, `LeaderboardEntry`, `Reward` (`ready|locked|claimed`), `Club`, `MintFeedItem`, `Collector`, `TrendingTopic`, `LiveMeeting`, `RosterEntry`. Keep existing types.
- [x] **0.6 Mock data layer → `lib/mock/*.ts` + typed hooks.** `gamification.ts`, `rewards.ts`, `clubs.ts`, `explore.ts`, `meeting.ts`. Each exports sample fixtures + a `useX()` hook (TanStack Query returning the fixture with realistic latency) matching a future endpoint shape. Add query keys to `lib/api/queryKeys.ts`.

### Shared components (foundation)
- [x] **0.7 Primitives → `components/ui/`.** `Button` (pill, black/cyan-on-dark/outline/ghost/destructive variants, `scale(0.98)` press, sizes xs/sm/md/lg), `Card` (white, 1px border, radius 16–20, elev-sm), `Badge`/`Pill` (status + neutral + eyebrow-mono), `StatTile` (mono numeral + label + optional progress bar / delta), `ProgressBar` (gradient fill), `Input`/`Textarea`/`Select` (Hubble input styling), `Avatar` (gradient monogram), `IconButton`, `CopyChip` (mono text + Copy button), `MonoNum`. No inline magic values — reference token classes.
- [x] **0.8 Icon set → `components/ui/icons.tsx`.** Inline stroke SVGs (`currentColor`): QR, chevrons, arrows, search, gear, wallet, lock, trophy, gift, home, grid, user, sign-out, close, check, clock, plus, external-link, flame. One export per icon.
- [x] **0.9 Token art card → `components/shared/TokenCard.tsx`.** Rounded card, per-topic gradient hero panel, large mono edition `#128`, topic title, date + edition ratio meta, optional `RARE` tag, animated sheen for freshly-minted/featured. Click → opens Token Detail modal (7a). Replaces the current plain vault card.
- [x] **0.10 Layout shells → `components/shared/`.** `MemberTopNav` (OAP logo w/ cyan dot · Home/Vault/Leaderboard/Rewards active-pill nav · 🔥 streak pill · avatar→AccountMenu), `OrganizerTopNav` (adds purple `ORGANIZER` badge + Overview/Meetings/Members/Settings), `MarketingNav` (Protocol·Clubs·Explore·Docs + Sign in/Launch app), `MobileTabBar` (Home·Vault·raised black Scan·Ranks·Rewards, fixed bottom), `PageContainer` (~1180px max, responsive). Active pill = `bg-[rgba(1,3,4,0.06)]`.

**Milestone 0 done when:** tokens/tailwind/fonts wired, mock layer + hooks typecheck, primitives + shells render in isolation, `npm run typecheck` clean.

---

## Milestone 1 — Public / marketing (desktop, ~1180px)
- [x] **1.1 Landing (1a, L1426).** MarketingNav; hero display headline "Proof you showed up. Onchain." + subcopy + primary/secondary CTA + 3 stat figures; right = cluster of 3 rotated TokenCards; "How it works" 3 numbered steps.
- [x] **1.2 Protocol (2a, L1030).** Hero; 4-col mint pipeline (01 open → 02 scan → 03 relayer sponsors gas → 04 minted); token-anatomy section (sample card + Chain/Standard/Metadata/Gas facts + contract-address CopyChip).
- [x] **1.3 Clubs (2b, L1112) + empty (3a, L905).** Header + "Start a club", search field, filter chips (All/Universities/DAOs/Meetups), 3-col club-card grid (monogram, name, org, members/meetings/tokens stats, Join/Open) + dashed "start your own" tile. Empty: centered gradient glyph, CTA pair, 3 trust points.
- [x] **1.4 Explore (2c, L1235) + empty (3b, L954).** Search bar, 4 stat tiles, two-col body: live mint feed (44px token thumb, who minted what, club · time-ago, tx link) + sidebar (top collectors, trending chips). Empty: zeroed tiles + 2 faded ghost rows.
- [x] **1.5 Docs (2d, L1322).** 3-col: left TOC sidebar, center "Quickstart" article (h2/h3, inline code pill, dark code block w/ Copy, info callout), right "On this page" rail.

---

## Milestone 2 — Signed-in member app (desktop)
- [ ] **2.1 Home (1b, L1535) + new-member empty (7b, L83).** Greeting + next-meeting note; left col: black "Meeting is live — check in now" card (QR icon + cyan Scan CTA), 3 stat tiles (Level+progress / Streak / Rank+delta), My Vault preview (4 TokenCards); right col: Leaderboard top-3 + highlighted "you" row + "Next reward at Level 7" chip. Empty variant: black "Mint your first token" glow card, Level 1 (0/500 XP), Streak 0, empty-vault tile.
- [ ] **2.2 Vault (4a, L617).** Header stats (tokens · rare · club), filter chips + sort, **5-wide** TokenCard grid (RARE tags), dashed "+N more tokens" tile. Wire to **real** `getMemberVault`; degrade gamified bits to mock. Collapses 5→2 cols mobile (5b).
- [ ] **2.3 Leaderboard (4b, L673).** Timeframe segmented control (Semester/Month/All time), top-3 podium (raised gold winner, 🏆), ranked table (Rank/Member/Streak/Tokens/XP) with blue "you" row. Mock data.
- [ ] **2.4 Rewards (4c, L767).** Black Level banner (glyph, purple→cyan progress, XP-to-next, available-to-claim count); grid of reward cards in 3 states: ready (green border + Claim + READY badge), locked (muted, lock, LEVEL n badge, disabled), + "more each semester" info tile. Mock; claim = optimistic toast.
- [ ] **2.5 Account dropdown (4d, L848).** Avatar menu over blurred page: header (avatar, handle, LVL badge, club, wallet CopyChip), items (Profile/Wallet & keys/Settings/Help & docs), destructive red Sign out. Upgrade existing `AccountMenu.tsx`.
- [ ] **2.6 Token detail modal (7a, L39).** 760px modal: left full-bleed gradient art + big edition # + sheen + "Edition 128 of 240"; right close btn, "ATTENDANCE TOKEN" badge, title + club/week, meta grid (Minted/Chain/Standard/XP), Traits chips, tx CopyChip, "View on Basescan" + Share. Opened from any TokenCard.

---

## Milestone 3 — Member app (mobile) + check-in flow
- [ ] **3.1 Mobile shell.** Verify `MobileTabBar` (0.10) fixed-bottom with raised black center Scan (cyan QR). Wire into member routes at `sm` breakpoint.
- [ ] **3.2 Mobile Home (5a, L413).** Greeting, black live check-in card (cyan CTA), 3 stat tiles, 2 recent TokenCards. (Responsive variant of 2.1.)
- [ ] **3.3 Mobile Vault (5b, L458).** Header count, filter chips, 2-col TokenCard grid. (Responsive variant of 2.2.)
- [ ] **3.4 Mobile Leaderboard (5c, L494).** Segmented control, compact top-3, ranked list w/ "you" highlight. (Variant of 2.3.)
- [ ] **3.5 Mobile Rewards (5d, L529).** Compact black level banner + claimable/locked reward rows. (Variant of 2.4.)
- [ ] **3.6 Mobile Account (5e, L561).** Centered profile (avatar, handle, LVL), 3 stat tiles, wallet chip, settings list w/ Sign out.
- [ ] **3.7 Check-in scan + mint success (1d, L1678/L1707).** Scan: meeting header, QR, "Secured by Privy · gas-free", Open scanner. Success: green "Minted onchain" chip, freshly-minted TokenCard (sheen), "🔥 Streak extended → 8 weeks", "+180 XP", Add to vault / Share. Restyle existing `CheckInFlow.tsx`/`QrScanner.tsx`; keep **real** submit.
- [ ] **3.8 Check-in error states (7c, L121).** Three states: "You're already in" (blue check), "Check-in has closed" (yellow clock), "Code not recognized" (red ✕) — icon, title, explanation, recovery action. Map to real check-in error codes.

---

## Milestone 4 — Organizer console (desktop)
Reuse existing admin API wiring (`lib/api/admin.ts`); club-level metadata is mock.
- [ ] **4.1 Create club (6a, L184).** Centered 600px form: "Step 1 of 2 · Basics", logo dropzone, Club name (focused input), Handle (`oap.xyz/c/` prefix), Description textarea, Category select, Chain (Base, locked), Cancel/Continue. Mock submit.
- [ ] **4.2 Club dashboard (6b, L237).** Club header (logo, name, handle) + Invite members / Start a meeting; 4 stat cards (Members/Meetings/Avg attendance/Tokens, deltas) — wire to **real** `getAdminOverview`; Recent meetings table (real sessions) + Next meeting card w/ Open meeting.
- [ ] **4.3 Run meeting projector (6c, L294).** Top bar "Meeting live · timer" + Pause / End (red); left big 280px QR (real `getSessionQR`) + topic; right black counter card ("42 checked in of 312") + live "Just checked in" roster (poll stub / mock). Restyle existing `/admin/sessions/[id]/qr`.
- [ ] **4.4 Members & attendance (6d, L342).** Search + Export CSV (real `downloadMembersCSV`); table Member (avatar+join date) / Tokens / Streak / **6-week attendance matrix** (green ✓ / gray empty) / Rate %. Wire to real `listAdminMembers` + derive matrix from sessions/check-ins.

---

## Milestone 5 — Integration, polish, verify
- [ ] **5.1 Routing + nav wiring.** Add all routes; logged-out `/` = Landing, logged-in `/` = Home; active-pill states correct across MemberTopNav/OrganizerTopNav/MarketingNav; mobile tab bar routes.
- [ ] **5.2 Real-data wiring pass.** Confirm vault/stats/check-in/admin read real endpoints through the typed hooks; mock hooks isolated and clearly swappable.
- [ ] **5.3 Interactions.** Token card → detail modal everywhere; rewards claim; sheen on fresh/featured; button press scale; 200ms hover transitions; segmented controls + filter chips functional.
- [ ] **5.4 Responsive audit.** Every route degrades cleanly desktop→mobile (5→2 vault cols, 3→1 stat rows, tab bar appears < sm). No horizontal body scroll.
- [ ] **5.5 Verify.** `npm run typecheck` + `npm run build` clean; `npm run dev` smoke test each route; screenshot key screens vs handoff frames for fidelity.

---

## How to attack
1. Do **Milestone 0** fully first — it blocks everything and must be exactly right.
2. Then milestones can go in parallel per person/session; within a milestone, tasks are mostly independent once shells + primitives exist.
3. Each task is self-contained: open the referenced HTML frame line, reuse the primitive/shell it needs, wire the listed data source.
4. Keep `typecheck` green after every task. Do a fidelity screenshot check per milestone.

## Open items to confirm as we go
- Organizer route shape: single `/organizer` vs per-club `/c/[handle]` (design shows handles → lean `/c/[handle]`, `/organizer` for the console chrome).
- Whether to delete old `/admin/*` + `/stats` once superseded, or leave as redirects.
- Real vs mock line for the 6-week attendance matrix (4.4) — derive from real check-ins if the query is cheap, else mock.
