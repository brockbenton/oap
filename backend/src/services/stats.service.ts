import prisma from '../lib/prisma';
import { getPrivy } from '../middleware/auth';
import logger from '../lib/logger';
import { tokenImageUrl, tokenMetadataUri, buildMeetingNumberMap } from './ipfs.service';

export type StatusTier = 'General Member' | 'Official Member';

const CONFIRMED_STATUS = 'CONFIRMED' as const;
const OFFICIAL_TIER: StatusTier = 'Official Member';
const GENERAL_TIER: StatusTier = 'General Member';
const DEFAULT_OFFICIAL_THRESHOLD = 75;
const MS_PER_DAY = 86_400_000;
const ROLLING_WINDOW_DAYS = [30, 90, 180] as const;

/**
 * Attendance % denominator (resolved Open Question #3): ALL confirmed sessions
 * to date, so every member is measured against the same club-wide meeting count.
 * This matches the Phase 2 member table exactly — the vault and personal-stats
 * views reuse this definition so numbers never disagree across pages.
 */
function officialThreshold(): number {
  const parsed = parseInt(
    process.env.OFFICIAL_MEMBER_THRESHOLD ?? String(DEFAULT_OFFICIAL_THRESHOLD),
    10,
  );
  return Number.isFinite(parsed) ? parsed : DEFAULT_OFFICIAL_THRESHOLD;
}

function tierFor(allTimePct: number): StatusTier {
  return allTimePct >= officialThreshold() ? OFFICIAL_TIER : GENERAL_TIER;
}

function toPct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export interface MemberStat {
  id: string;
  walletAddress: string;
  linkedAccount: string | null;
  foundingMember: boolean;
  tokensEarned: number;
  allTimeAttendancePct: number;
  currentSemesterAttendancePct: number;
  statusTier: StatusTier;
  lastSeen: string | null;
}

export async function buildMemberStats(includeLinkedAccount = true): Promise<{
  members: MemberStat[];
  totalSessions: number;
  currentSemester: string | null;
}> {
  // 1. All confirmed sessions (needed for attendance % denominators)
  const sessions = await prisma.session.findMany({
    where: { onchainStatus: CONFIRMED_STATUS },
    select: { id: true, semester: true },
    orderBy: { date: 'desc' },
  });

  const totalSessions = sessions.length;
  const currentSemester = sessions[0]?.semester ?? null;
  const confirmedSessionIds = new Set(sessions.map((s) => s.id));
  const currentSemesterSessionIds = new Set(
    sessions.filter((s) => s.semester === currentSemester).map((s) => s.id),
  );
  const currentSemesterTotal = currentSemesterSessionIds.size;

  // 2. All members with their check-ins (latest first for lastSeen)
  const members = await prisma.member.findMany({
    include: {
      checkIns: {
        select: { sessionId: true, checkedInAt: true, mintStatus: true },
        orderBy: { checkedInAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Resolve privyUserId → display name. Skipped for the public directory, which
  // strips linkedAccount (PII) anyway — avoids a needless Privy round-trip and
  // never fetches PII on the unauthenticated path (see AUDIT.md).
  const privyDisplayMap = new Map<string, string | null>();
  if (includeLinkedAccount) {
    try {
      const privyUsers = await getPrivy().getUsers();
      for (const u of privyUsers) {
        const display =
          u.email?.address ??
          u.google?.email ??
          u.discord?.email ??
          u.discord?.username ??
          null;
        privyDisplayMap.set(u.id, display);
      }
    } catch (err) {
      logger.warn({ msg: 'Failed to fetch Privy users for member list', err: (err as Error).message });
    }
  }

  // 4. Compute per-member stats
  const data: MemberStat[] = members.map((m) => {
    // A token is "earned" only once its mint CONFIRMS on-chain — PENDING/FAILED
    // must not be counted as a held token (see AUDIT.md). Stats stay ≤ on-chain holdings.
    const earnedCheckIns = m.checkIns.filter(
      (c) => confirmedSessionIds.has(c.sessionId) && c.mintStatus === CONFIRMED_STATUS,
    );
    const tokensEarned = earnedCheckIns.length;

    const allTimeAttendancePct = toPct(tokensEarned, totalSessions);

    const semesterCheckIns = earnedCheckIns.filter((c) =>
      currentSemesterSessionIds.has(c.sessionId),
    ).length;
    const currentSemesterAttendancePct = toPct(semesterCheckIns, currentSemesterTotal);

    const statusTier = tierFor(allTimeAttendancePct);

    return {
      id: m.id,
      walletAddress: m.walletAddress,
      linkedAccount: m.privyUserId != null ? (privyDisplayMap.get(m.privyUserId) ?? null) : null,
      foundingMember: m.foundingMember,
      tokensEarned,
      allTimeAttendancePct,
      currentSemesterAttendancePct,
      statusTier,
      lastSeen: m.checkIns[0]?.checkedInAt.toISOString() ?? null,
    };
  });

  data.sort(
    (a, b) => b.allTimeAttendancePct - a.allTimeAttendancePct || b.tokensEarned - a.tokensEarned,
  );

  return { members: data, totalSessions, currentSemester };
}

// ── Phase 3: per-member vault & personal stats ──────────────────────────────
// Attendance is sourced from confirmed-session check-ins (there is no on-chain
// event indexer; check_ins is the recorded-attendance table — see AUDIT.md).

export interface VaultToken {
  tokenId: string;
  sessionIdOnchain: string;
  name: string;
  date: string;
  semester: string;
  meetingNumber: number;
  mintStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash: string | null;
  imageUrl: string;
  metadataUri: string | null;
}

export interface MemberVault {
  walletAddress: string;
  found: boolean;
  tokenCount: number;
  tokens: VaultToken[];
}

export async function buildMemberVault(address: string): Promise<MemberVault> {
  const walletAddress = address.toLowerCase();

  const confirmedSessions = await prisma.session.findMany({
    where: { onchainStatus: CONFIRMED_STATUS },
    select: { sessionIdOnchain: true, date: true, semester: true },
  });
  const meetingNumbers = buildMeetingNumberMap(confirmedSessions);

  const member = await prisma.member.findUnique({
    where: { walletAddress },
    include: {
      checkIns: {
        where: { session: { onchainStatus: CONFIRMED_STATUS } },
        include: { session: true },
        orderBy: { session: { date: 'desc' } },
      },
    },
  });

  if (!member) {
    return { walletAddress, found: false, tokenCount: 0, tokens: [] };
  }

  const tokens: VaultToken[] = member.checkIns.map((c) => ({
    tokenId: c.session.sessionIdOnchain,
    sessionIdOnchain: c.session.sessionIdOnchain,
    name: c.session.name,
    date: c.session.date.toISOString(),
    semester: c.session.semester,
    meetingNumber: meetingNumbers.get(c.session.sessionIdOnchain) ?? 0,
    mintStatus: c.mintStatus,
    txHash: c.txHash,
    imageUrl: tokenImageUrl(c.session.semester),
    metadataUri: tokenMetadataUri(c.session.sessionIdOnchain),
  }));

  return { walletAddress, found: true, tokenCount: tokens.length, tokens };
}

export interface PersonalStats {
  walletAddress: string;
  found: boolean;
  foundingMember: boolean;
  tokensEarned: number;
  totalSessions: number;
  allTimeAttendancePct: number;
  currentSemester: string | null;
  currentSemesterTotal: number;
  currentSemesterAttendancePct: number;
  statusTier: StatusTier;
  meetingsLast30Days: number;
  meetingsLast90Days: number;
  meetingsLast180Days: number;
  currentStreak: number;
  longestStreak: number;
  lastSeen: string | null;
}

export async function buildPersonalStats(
  address: string,
  now: number = Date.now(),
): Promise<PersonalStats> {
  const walletAddress = address.toLowerCase();

  const confirmedSessions = await prisma.session.findMany({
    where: { onchainStatus: CONFIRMED_STATUS },
    select: { sessionIdOnchain: true, date: true, semester: true },
    orderBy: { date: 'desc' },
  });

  const totalSessions = confirmedSessions.length;
  const currentSemester = confirmedSessions[0]?.semester ?? null;
  const currentSemesterTotal = confirmedSessions.filter(
    (s) => s.semester === currentSemester,
  ).length;

  const member = await prisma.member.findUnique({
    where: { walletAddress },
    include: {
      checkIns: {
        where: { session: { onchainStatus: CONFIRMED_STATUS } },
        include: { session: { select: { sessionIdOnchain: true, date: true, semester: true } } },
        orderBy: { checkedInAt: 'desc' },
      },
    },
  });

  const base = {
    walletAddress,
    totalSessions,
    currentSemester,
    currentSemesterTotal,
  };

  if (!member) {
    return {
      ...base,
      found: false,
      foundingMember: false,
      tokensEarned: 0,
      allTimeAttendancePct: 0,
      currentSemesterAttendancePct: 0,
      statusTier: tierFor(0),
      meetingsLast30Days: 0,
      meetingsLast90Days: 0,
      meetingsLast180Days: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSeen: null,
    };
  }

  // Stats count only CONFIRMED mints (tokens actually held); PENDING/FAILED are
  // shown in the vault but excluded here so numbers never exceed on-chain holdings.
  const earnedCheckIns = member.checkIns.filter((c) => c.mintStatus === CONFIRMED_STATUS);
  const tokensEarned = earnedCheckIns.length;
  const allTimeAttendancePct = toPct(tokensEarned, totalSessions);
  const semesterAttended = earnedCheckIns.filter(
    (c) => c.session.semester === currentSemester,
  ).length;

  const [meetingsLast30Days, meetingsLast90Days, meetingsLast180Days] = ROLLING_WINDOW_DAYS.map(
    (days) =>
      earnedCheckIns.filter((c) => c.session.date.getTime() >= now - days * MS_PER_DAY).length,
  );

  const attendedIds = new Set(earnedCheckIns.map((c) => c.session.sessionIdOnchain));
  const currentStreak = computeCurrentStreak(confirmedSessions, attendedIds);
  const longestStreak = computeLongestStreak(confirmedSessions, attendedIds);

  return {
    ...base,
    found: true,
    foundingMember: member.foundingMember,
    tokensEarned,
    allTimeAttendancePct,
    currentSemesterAttendancePct: toPct(semesterAttended, currentSemesterTotal),
    statusTier: tierFor(allTimeAttendancePct),
    meetingsLast30Days,
    meetingsLast90Days,
    meetingsLast180Days,
    currentStreak,
    longestStreak,
    lastSeen: member.checkIns[0]?.checkedInAt.toISOString() ?? null,
  };
}

/** Consecutive most-recent meetings attended, counting back until the first miss. */
function computeCurrentStreak(
  sessionsDesc: { sessionIdOnchain: string }[],
  attendedIds: Set<string>,
): number {
  let streak = 0;
  for (const s of sessionsDesc) {
    if (!attendedIds.has(s.sessionIdOnchain)) break;
    streak += 1;
  }
  return streak;
}

function computeLongestStreak(
  sessionsDesc: { sessionIdOnchain: string }[],
  attendedIds: Set<string>,
): number {
  let longest = 0;
  let run = 0;
  for (const s of sessionsDesc) {
    if (attendedIds.has(s.sessionIdOnchain)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return longest;
}

// ── Phase 2: admin overview (attendance over time, headcount, WoW delta) ─────

export interface OverviewSessionPoint {
  sessionIdOnchain: string;
  name: string;
  date: string;
  semester: string;
  headcount: number;
  eligibleMembers: number;
  attendanceRate: number;
}

export interface AdminOverview {
  totalMembers: number;
  totalSessions: number;
  currentSemester: string | null;
  avgHeadcount: number;
  series: OverviewSessionPoint[];
  latest: { headcount: number; attendanceRate: number } | null;
  previous: { headcount: number; attendanceRate: number } | null;
  wow: { headcountDelta: number; attendanceRateDelta: number } | null;
}

export async function buildAdminOverview(): Promise<AdminOverview> {
  const [sessions, members] = await Promise.all([
    prisma.session.findMany({
      where: { onchainStatus: CONFIRMED_STATUS },
      select: {
        sessionIdOnchain: true,
        name: true,
        date: true,
        semester: true,
        checkIns: { where: { mintStatus: CONFIRMED_STATUS }, select: { id: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.member.findMany({ select: { createdAt: true } }),
  ]);

  // A member is "eligible" for a session only if they had joined by its date, so
  // early sessions aren't diluted by members who joined later.
  const memberJoinTimes = members.map((m) => m.createdAt.getTime());

  const series: OverviewSessionPoint[] = sessions.map((s) => {
    const headcount = s.checkIns.length;
    const joinedByDate = memberJoinTimes.filter((t) => t <= s.date.getTime()).length;
    // Attendees are definitionally eligible — a first-time attendee whose join
    // timestamp lands after the scheduled date must not push the rate above 100%.
    const eligibleMembers = Math.max(headcount, joinedByDate);
    return {
      sessionIdOnchain: s.sessionIdOnchain,
      name: s.name,
      date: s.date.toISOString(),
      semester: s.semester,
      headcount,
      eligibleMembers,
      attendanceRate: toPct(headcount, eligibleMembers),
    };
  });

  const totalSessions = series.length;
  const currentSemester = totalSessions > 0 ? series[totalSessions - 1].semester : null;
  const avgHeadcount =
    totalSessions > 0
      ? Math.round(series.reduce((sum, p) => sum + p.headcount, 0) / totalSessions)
      : 0;

  const latestPoint = series[totalSessions - 1] ?? null;
  const previousPoint = series[totalSessions - 2] ?? null;
  const latest = latestPoint
    ? { headcount: latestPoint.headcount, attendanceRate: latestPoint.attendanceRate }
    : null;
  const previous = previousPoint
    ? { headcount: previousPoint.headcount, attendanceRate: previousPoint.attendanceRate }
    : null;
  const wow =
    latest && previous
      ? {
          headcountDelta: latest.headcount - previous.headcount,
          attendanceRateDelta: latest.attendanceRate - previous.attendanceRate,
        }
      : null;

  return {
    totalMembers: members.length,
    totalSessions,
    currentSemester,
    avgHeadcount,
    series,
    latest,
    previous,
    wow,
  };
}
