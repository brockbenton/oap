import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import type { LiveMeeting } from '@/types';

export const MOCK_LIVE_MEETING: LiveMeeting = {
  topic: 'Intro to Zero-Knowledge Proofs',
  week: 9,
  club: 'Blockchain at Berkeley',
  checkedIn: 34,
  totalMembers: 52,
  elapsedSeconds: 612,
  roster: [
    { handle: 'you.base.eth', avatarSeed: 'you', secondsAgo: 8 },
    { handle: 'zk.wizard', avatarSeed: 'zkwizard', secondsAgo: 21 },
    { handle: 'gm.frens', avatarSeed: 'gmfrens', secondsAgo: 46 },
    { handle: 'basedbuilder', avatarSeed: 'basedbuilder', secondsAgo: 73 },
    { handle: 'defidegen', avatarSeed: 'defidegen', secondsAgo: 118 },
    { handle: 'nft.curator', avatarSeed: 'nftcurator', secondsAgo: 154 },
    { handle: 'mev.searcher', avatarSeed: 'mevsearcher', secondsAgo: 202 },
    { handle: 'anon.eth', avatarSeed: 'anon', secondsAgo: 271 },
  ],
};

export function useLiveMeeting(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.liveMeeting(sessionId),
    queryFn: async () => MOCK_LIVE_MEETING,
    staleTime: Infinity,
  });
}
