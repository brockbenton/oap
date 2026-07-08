import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import type { LeaderboardEntry, Level } from '@/types';

export type LeaderboardTimeframe = 'semester' | 'month' | 'all';

export interface RankSummary {
  rank: number;
  delta: number;
}

export const MOCK_LEVEL: Level = {
  level: 7,
  xp: 4820,
  xpIntoLevel: 320,
  xpForNextLevel: 500,
};

export const MOCK_RANK: RankSummary = {
  rank: 6,
  delta: 3,
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: 'satoshi.base.eth', avatarSeed: 'satoshi', streakWeeks: 18, tokens: 142, xp: 9840, isYou: false },
  { rank: 2, handle: 'vitalik.jr', avatarSeed: 'vitalikjr', streakWeeks: 16, tokens: 128, xp: 8720, isYou: false },
  { rank: 3, handle: 'zk.wizard', avatarSeed: 'zkwizard', streakWeeks: 15, tokens: 119, xp: 7610, isYou: false },
  { rank: 4, handle: 'mev.searcher', avatarSeed: 'mevsearcher', streakWeeks: 12, tokens: 101, xp: 6480, isYou: false },
  { rank: 5, handle: 'basedbuilder', avatarSeed: 'basedbuilder', streakWeeks: 9, tokens: 88, xp: 5390, isYou: false },
  { rank: 6, handle: 'you.base.eth', avatarSeed: 'you', streakWeeks: 6, tokens: 74, xp: 4820, isYou: true },
  { rank: 7, handle: 'gm.frens', avatarSeed: 'gmfrens', streakWeeks: 6, tokens: 69, xp: 4210, isYou: false },
  { rank: 8, handle: 'defidegen', avatarSeed: 'defidegen', streakWeeks: 5, tokens: 61, xp: 3680, isYou: false },
  { rank: 9, handle: 'nft.curator', avatarSeed: 'nftcurator', streakWeeks: 4, tokens: 52, xp: 3150, isYou: false },
  { rank: 10, handle: 'anon.eth', avatarSeed: 'anon', streakWeeks: 3, tokens: 44, xp: 2740, isYou: false },
];

export function useLevel() {
  return useQuery({
    queryKey: queryKeys.level(),
    queryFn: async () => MOCK_LEVEL,
    staleTime: Infinity,
  });
}

export function useLeaderboard(timeframe: LeaderboardTimeframe) {
  return useQuery({
    queryKey: queryKeys.leaderboard(timeframe),
    queryFn: async () => MOCK_LEADERBOARD,
    staleTime: Infinity,
  });
}

export function useRank() {
  return useQuery({
    queryKey: queryKeys.rank(),
    queryFn: async () => MOCK_RANK,
    staleTime: Infinity,
  });
}
