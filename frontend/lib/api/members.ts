import { LeaderboardEntry, MemberStats, MemberVault, PersonalStats } from '@/types';
import { shortenAddress } from '@/lib/address';
import { apiRequest, ApiRequestError } from './client';

// Public reads by wallet address (no auth token required) — resolved Open Question #5.

const NOT_FOUND_STATUS = 404;

// A wallet with no on-chain / backend record isn't a failure — it's just an empty
// vault. Map a not-found response to `found: false` so brand-new members land on
// the empty state instead of a "couldn't load" connection error.
export async function getMemberVault(address: string): Promise<MemberVault> {
  try {
    return await apiRequest<MemberVault>(`/members/${encodeURIComponent(address)}/tokens`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === NOT_FOUND_STATUS) {
      return { walletAddress: address, found: false, tokenCount: 0, tokens: [] };
    }
    throw error;
  }
}

export async function getPersonalStats(address: string): Promise<PersonalStats> {
  return apiRequest<PersonalStats>(`/members/${encodeURIComponent(address)}/stats`);
}

type PublicMember = Omit<MemberStats, 'id' | 'linkedAccount' | 'joinedAt'>;

// Ranks the public directory by confirmed tokens, then current streak. Members
// with no confirmed tokens aren't ranked.
export async function getLeaderboard(viewerAddress?: string): Promise<LeaderboardEntry[]> {
  const { members } = await apiRequest<{ members: PublicMember[] }>('/members');
  return members
    .filter((member) => member.tokensEarned > 0)
    .sort((a, b) => b.tokensEarned - a.tokensEarned || b.currentStreak - a.currentStreak)
    .map((member, index) => ({
      rank: index + 1,
      rankLabel: `#${String(index + 1).padStart(2, '0')}`,
      handle: shortenAddress(member.walletAddress),
      avatarSeed: member.walletAddress,
      streak: member.currentStreak,
      tokens: member.tokensEarned,
      attendancePct: member.allTimeAttendancePct,
      isYou: member.walletAddress.toLowerCase() === viewerAddress?.toLowerCase(),
    }));
}
