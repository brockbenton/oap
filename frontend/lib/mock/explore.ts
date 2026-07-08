import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Collector, MintFeedItem, TrendingTopic } from '@/types';

export interface ExploreStats {
  tokensMinted: number;
  members: number;
  clubs: number;
  meetingsThisWeek: number;
}

export const MOCK_FEED: MintFeedItem[] = [
  {
    id: 'mint-1',
    handle: 'you.base.eth',
    avatarSeed: 'you',
    topic: 'Intro to Zero-Knowledge Proofs',
    gradient: 'purple',
    club: 'Blockchain at Berkeley',
    timeAgo: '2m ago',
    txHash: '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    editionNumber: 128,
  },
  {
    id: 'mint-2',
    handle: 'zk.wizard',
    avatarSeed: 'zkwizard',
    topic: 'Account Abstraction Deep Dive',
    gradient: 'blue',
    club: 'Stanford Crypto Club',
    timeAgo: '11m ago',
    txHash: '0xb2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
    editionNumber: 64,
  },
  {
    id: 'mint-3',
    handle: 'gm.frens',
    avatarSeed: 'gmfrens',
    topic: 'Rollups and Data Availability',
    gradient: 'teal',
    club: 'Optimism Collective',
    timeAgo: '24m ago',
    txHash: '0xc3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
    editionNumber: 210,
  },
  {
    id: 'mint-4',
    handle: 'defidegen',
    avatarSeed: 'defidegen',
    topic: 'DeFi Risk and Liquidations',
    gradient: 'green',
    club: 'ETHGlobal DAO',
    timeAgo: '38m ago',
    txHash: '0xd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
    editionNumber: 45,
  },
  {
    id: 'mint-5',
    handle: 'basedbuilder',
    avatarSeed: 'basedbuilder',
    topic: 'Building on Base',
    gradient: 'blue',
    club: 'Bay Area Web3 Meetup',
    timeAgo: '52m ago',
    txHash: '0xe5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
    editionNumber: 89,
  },
  {
    id: 'mint-6',
    handle: 'nft.curator',
    avatarSeed: 'nftcurator',
    topic: 'Onchain Provenance for Art',
    gradient: 'orange',
    club: 'NYC Ethereum Meetup',
    timeAgo: '1h ago',
    txHash: '0xf60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5',
    editionNumber: 17,
  },
  {
    id: 'mint-7',
    handle: 'mev.searcher',
    avatarSeed: 'mevsearcher',
    topic: 'MEV and Fair Ordering',
    gradient: 'red',
    club: 'MIT Bitcoin Club',
    timeAgo: '2h ago',
    txHash: '0x0718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6',
    editionNumber: 133,
  },
  {
    id: 'mint-8',
    handle: 'vitalik.jr',
    avatarSeed: 'vitalikjr',
    topic: 'The Merge, One Year Later',
    gradient: 'purple',
    club: 'Blockchain at Berkeley',
    timeAgo: '3h ago',
    txHash: '0x18293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f607',
    editionNumber: 240,
  },
];

export const MOCK_COLLECTORS: Collector[] = [
  { rank: 1, handle: 'satoshi.base.eth', avatarSeed: 'satoshi', tokens: 142 },
  { rank: 2, handle: 'vitalik.jr', avatarSeed: 'vitalikjr', tokens: 128 },
  { rank: 3, handle: 'zk.wizard', avatarSeed: 'zkwizard', tokens: 119 },
  { rank: 4, handle: 'mev.searcher', avatarSeed: 'mevsearcher', tokens: 101 },
  { rank: 5, handle: 'basedbuilder', avatarSeed: 'basedbuilder', tokens: 88 },
  { rank: 6, handle: 'you.base.eth', avatarSeed: 'you', tokens: 74 },
  { rank: 7, handle: 'gm.frens', avatarSeed: 'gmfrens', tokens: 69 },
  { rank: 8, handle: 'defidegen', avatarSeed: 'defidegen', tokens: 61 },
];

export const MOCK_TRENDING: TrendingTopic[] = [
  { topic: 'Zero-Knowledge Proofs', count: 128 },
  { topic: 'Account Abstraction', count: 96 },
  { topic: 'Rollups', count: 87 },
  { topic: 'DeFi Risk', count: 64 },
  { topic: 'Building on Base', count: 52 },
  { topic: 'MEV', count: 41 },
];

export const MOCK_EXPLORE_STATS: ExploreStats = {
  tokensMinted: 31840,
  members: 1641,
  clubs: 7,
  meetingsThisWeek: 12,
};

export function useMintFeed() {
  return useQuery({
    queryKey: queryKeys.mintFeed(),
    queryFn: async () => MOCK_FEED,
    staleTime: Infinity,
  });
}

export function useCollectors() {
  return useQuery({
    queryKey: queryKeys.collectors(),
    queryFn: async () => MOCK_COLLECTORS,
    staleTime: Infinity,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: queryKeys.trending(),
    queryFn: async () => MOCK_TRENDING,
    staleTime: Infinity,
  });
}

export function useExploreStats() {
  return useQuery({
    queryKey: queryKeys.exploreStats(),
    queryFn: async () => MOCK_EXPLORE_STATS,
    staleTime: Infinity,
  });
}
