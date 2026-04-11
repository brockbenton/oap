import prisma from '../lib/prisma';
import { getPrivy } from '../middleware/auth';
import logger from '../lib/logger';

export interface MemberStat {
  id: string;
  walletAddress: string;
  linkedAccount: string | null;
  foundingMember: boolean;
  tokensEarned: number;
  allTimeAttendancePct: number;
  currentSemesterAttendancePct: number;
  statusTier: 'General Member' | 'Official Member';
  lastSeen: string | null;
}

export async function buildMemberStats(): Promise<{
  members: MemberStat[];
  totalSessions: number;
  currentSemester: string | null;
}> {
  // 1. All confirmed sessions (needed for attendance % denominators)
  const sessions = await prisma.session.findMany({
    where: { onchainStatus: 'CONFIRMED' },
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
  const threshold = parseInt(process.env.OFFICIAL_MEMBER_THRESHOLD ?? '75', 10);

  // 2. All members with their check-ins (latest first for lastSeen)
  const members = await prisma.member.findMany({
    include: {
      checkIns: {
        select: { sessionId: true, checkedInAt: true },
        orderBy: { checkedInAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Fetch all Privy users in one call to build privyUserId → display name map
  const privyDisplayMap = new Map<string, string | null>();
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

  // 4. Compute per-member stats
  const data: MemberStat[] = members.map((m) => {
    const confirmedCheckIns = m.checkIns.filter((c) => confirmedSessionIds.has(c.sessionId));
    const tokensEarned = confirmedCheckIns.length;

    const allTimeAttendancePct =
      totalSessions > 0 ? Math.round((tokensEarned / totalSessions) * 100) : 0;

    const semesterCheckIns = confirmedCheckIns.filter((c) =>
      currentSemesterSessionIds.has(c.sessionId),
    ).length;
    const currentSemesterAttendancePct =
      currentSemesterTotal > 0
        ? Math.round((semesterCheckIns / currentSemesterTotal) * 100)
        : 0;

    const statusTier: 'General Member' | 'Official Member' =
      allTimeAttendancePct >= threshold ? 'Official Member' : 'General Member';

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
