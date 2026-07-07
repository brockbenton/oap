import 'dotenv/config';
import { PrismaClient, TxStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic dev fixtures. Dates are anchored around 2026-07-07 so the
// rolling-window stats (last 30/90/180 days) and streaks have meaningful values.

interface SeedSession {
  onchainId: string;
  name: string;
  date: string; // ISO
  semester: string;
}

const FALL_2025 = 'Fall 2025';
const SPRING_2026 = 'Spring 2026';

const FALL_SESSIONS: SeedSession[] = [
  { onchainId: '2001', name: 'Intro to Blockchain', date: '2025-09-10T18:00:00.000Z', semester: FALL_2025 },
  { onchainId: '2002', name: 'Wallets & Keys', date: '2025-09-24T18:00:00.000Z', semester: FALL_2025 },
  { onchainId: '2003', name: 'Smart Contracts 101', date: '2025-10-08T18:00:00.000Z', semester: FALL_2025 },
  { onchainId: '2004', name: 'DeFi Foundations', date: '2025-10-22T18:00:00.000Z', semester: FALL_2025 },
];

const SPRING_SESSIONS: SeedSession[] = [
  { onchainId: '3001', name: 'Kickoff & Roadmap', date: '2026-01-21T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3002', name: 'Solidity Deep Dive', date: '2026-02-04T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3003', name: 'ERC Standards', date: '2026-02-18T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3004', name: 'Security & Audits', date: '2026-03-04T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3005', name: 'L2s & Rollups', date: '2026-03-18T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3006', name: 'Account Abstraction', date: '2026-04-01T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3007', name: 'NFTs & Soulbound Tokens', date: '2026-04-15T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3008', name: 'Onchain Identity', date: '2026-04-29T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3009', name: 'Governance & DAOs', date: '2026-05-13T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3010', name: 'MEV & Ordering', date: '2026-05-27T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3011', name: 'Zero Knowledge Proofs', date: '2026-06-17T18:00:00.000Z', semester: SPRING_2026 },
  { onchainId: '3012', name: 'Demo Day', date: '2026-07-01T18:00:00.000Z', semester: SPRING_2026 },
];

const ALL_SESSIONS = [...FALL_SESSIONS, ...SPRING_SESSIONS];

// Attendance is expressed as the set of session onchainIds a member checked into.
interface SeedMember {
  wallet: string;
  privyUserId: string;
  email: string;
  founding: boolean;
  createdAt: string;
  fallIdx: number[]; // indices into FALL_SESSIONS
  springIdx: number[]; // indices into SPRING_SESSIONS
  pendingOnchainIds?: string[]; // check-ins whose mint is still PENDING
}

const MEMBERS: SeedMember[] = [
  {
    wallet: '0x1111111111111111111111111111111111111111',
    privyUserId: 'did:privy:alice',
    email: 'alice@blockchainclub.edu',
    founding: true,
    createdAt: '2025-09-01T00:00:00.000Z',
    fallIdx: [0, 1, 2, 3],
    springIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    wallet: '0x2222222222222222222222222222222222222222',
    privyUserId: 'did:privy:bob',
    email: 'bob@blockchainclub.edu',
    founding: false,
    createdAt: '2025-09-05T00:00:00.000Z',
    fallIdx: [0, 1, 2, 3],
    springIdx: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11], // misses 3001 and 3006
  },
  {
    wallet: '0x3333333333333333333333333333333333333333',
    privyUserId: 'did:privy:carol',
    email: 'carol@blockchainclub.edu',
    founding: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    fallIdx: [],
    springIdx: [0, 1, 2, 3, 4, 6], // tapered off; skipped Demo Day
  },
  {
    wallet: '0x4444444444444444444444444444444444444444',
    privyUserId: 'did:privy:dave',
    email: 'dave@blockchainclub.edu',
    founding: false,
    createdAt: '2026-06-10T00:00:00.000Z',
    fallIdx: [],
    springIdx: [10, 11], // brand-new member, last two meetings
    pendingOnchainIds: ['3012'], // Demo Day mint still processing
  },
  {
    wallet: '0x5555555555555555555555555555555555555555',
    privyUserId: 'did:privy:erin',
    email: 'erin@blockchainclub.edu',
    founding: false,
    createdAt: '2025-09-08T00:00:00.000Z',
    fallIdx: [0, 1, 2, 3],
    springIdx: [0, 1, 2], // stopped attending after February
  },
  {
    wallet: '0x6666666666666666666666666666666666666666',
    privyUserId: 'did:privy:frank',
    email: 'frank@blockchainclub.edu',
    founding: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    fallIdx: [],
    springIdx: [8, 9, 10, 11], // consistent recent streak
  },
];

async function main(): Promise<void> {
  // Idempotent: wipe attendance data (respect FK order).
  await prisma.tokenEvent.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.session.deleteMany();
  await prisma.member.deleteMany();
  await prisma.adminRole.deleteMany();

  // Sessions
  const sessionByOnchainId = new Map<string, string>();
  for (const s of ALL_SESSIONS) {
    const created = await prisma.session.create({
      data: {
        sessionIdOnchain: s.onchainId,
        name: s.name,
        date: new Date(s.date),
        semester: s.semester,
        createdBy: '0x1111111111111111111111111111111111111111',
        txHash: `0x${'a'.repeat(63)}${ALL_SESSIONS.indexOf(s) % 10}`,
        onchainStatus: TxStatus.CONFIRMED,
      },
    });
    sessionByOnchainId.set(s.onchainId, created.id);
  }

  // Members + check-ins
  for (const m of MEMBERS) {
    const member = await prisma.member.create({
      data: {
        walletAddress: m.wallet,
        privyUserId: m.privyUserId,
        foundingMember: m.founding,
        createdAt: new Date(m.createdAt),
      },
    });

    const attended: SeedSession[] = [
      ...m.fallIdx.map((i) => FALL_SESSIONS[i]),
      ...m.springIdx.map((i) => SPRING_SESSIONS[i]),
    ];

    for (const s of attended) {
      const pending = m.pendingOnchainIds?.includes(s.onchainId) ?? false;
      await prisma.checkIn.create({
        data: {
          memberId: member.id,
          sessionId: sessionByOnchainId.get(s.onchainId)!,
          nonce: `seed-${m.privyUserId}-${s.onchainId}`,
          txHash: pending ? null : `0x${'b'.repeat(62)}${s.onchainId.slice(-2)}`,
          mintStatus: pending ? TxStatus.PENDING : TxStatus.CONFIRMED,
          checkedInAt: new Date(new Date(s.date).getTime() + 20 * 60_000),
        },
      });
    }
  }

  // Admin role for alice (so the admin endpoints are exercisable).
  await prisma.adminRole.create({
    data: {
      walletAddress: '0x1111111111111111111111111111111111111111',
      grantedBy: '0x1111111111111111111111111111111111111111',
    },
  });

  const [members, sessions, checkIns] = await Promise.all([
    prisma.member.count(),
    prisma.session.count(),
    prisma.checkIn.count(),
  ]);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ seeded: { members, sessions, checkIns } }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
