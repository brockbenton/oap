import { describe, it, expect } from 'vitest';
import {
  buildMemberStats,
  buildPersonalStats,
  buildMemberVault,
  buildAdminOverview,
} from '../src/services/stats.service';

const ALICE = '0x1111111111111111111111111111111111111111';
const DAVE = '0x4444444444444444444444444444444444444444';
const CAROL = '0x3333333333333333333333333333333333333333';
const UNKNOWN = '0x0000000000000000000000000000000000000009';

describe('buildPersonalStats', () => {
  it('alice: perfect attendance, founding, full streak', async () => {
    const s = await buildPersonalStats(ALICE);
    expect(s.found).toBe(true);
    expect(s.tokensEarned).toBe(16);
    expect(s.totalSessions).toBe(16);
    expect(s.allTimeAttendancePct).toBe(100);
    expect(s.currentSemesterAttendancePct).toBe(100);
    expect(s.statusTier).toBe('Official Member');
    expect(s.foundingMember).toBe(true);
    expect(s.currentStreak).toBe(16);
    expect(s.longestStreak).toBe(16);
  });

  it('dave: PENDING Demo Day mint is excluded from tokens and streak', async () => {
    const s = await buildPersonalStats(DAVE);
    expect(s.tokensEarned).toBe(1); // only the CONFIRMED 3011
    expect(s.currentStreak).toBe(0); // most recent session (3012) is still PENDING
    expect(s.meetingsLast30Days).toBe(1);
    expect(s.statusTier).toBe('General Member');
  });

  it('carol: general member, broken streak, longest run of 5', async () => {
    const s = await buildPersonalStats(CAROL);
    expect(s.statusTier).toBe('General Member');
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(5);
  });

  it('unknown wallet: found=false but club totals still present', async () => {
    const s = await buildPersonalStats(UNKNOWN);
    expect(s.found).toBe(false);
    expect(s.tokensEarned).toBe(0);
    expect(s.totalSessions).toBe(16);
    expect(s.currentStreak).toBe(0);
  });
});

describe('buildMemberVault', () => {
  it('dave: lists all check-ins incl. the pending mint, with meeting numbers + art', async () => {
    const v = await buildMemberVault(DAVE);
    expect(v.found).toBe(true);
    expect(v.tokenCount).toBe(2);
    expect(v.tokens.filter((t) => t.mintStatus === 'PENDING')).toHaveLength(1);
    expect(v.tokens.every((t) => t.meetingNumber > 0)).toBe(true);
    expect(v.tokens.every((t) => t.imageUrl.startsWith('http'))).toBe(true);
    // newest first
    expect(new Date(v.tokens[0].date).getTime()).toBeGreaterThanOrEqual(
      new Date(v.tokens[1].date).getTime(),
    );
  });

  it('unknown wallet: empty vault', async () => {
    const v = await buildMemberVault(UNKNOWN);
    expect(v.found).toBe(false);
    expect(v.tokenCount).toBe(0);
  });
});

describe('buildMemberStats', () => {
  it('public projection (no Privy) counts only CONFIRMED mints and omits PII', async () => {
    const { members, totalSessions } = await buildMemberStats(false);
    expect(totalSessions).toBe(16);
    const alice = members.find((m) => m.walletAddress === ALICE)!;
    expect(alice.tokensEarned).toBe(16);
    expect(members.every((m) => m.linkedAccount === null)).toBe(true);
  });
});

describe('buildAdminOverview', () => {
  it('computes headcount, eligibility-based rate, and session-over-session delta', async () => {
    const o = await buildAdminOverview();
    expect(o.totalSessions).toBe(16);
    expect(o.series).toHaveLength(16);

    const demoDay = o.series[o.series.length - 1];
    expect(demoDay.sessionIdOnchain).toBe('3012');
    expect(demoDay.headcount).toBe(3); // alice, bob, frank CONFIRMED; dave PENDING excluded
    expect(demoDay.eligibleMembers).toBe(6);
    expect(demoDay.attendanceRate).toBe(50);

    expect(o.wow).not.toBeNull();
    expect(o.wow!.headcountDelta).toBe(-1); // 3 vs previous 4
    expect(o.currentSemester).toBe('Spring 2026');
  });
});
