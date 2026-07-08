import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Reward } from '@/types';

export const MOCK_REWARDS: Reward[] = [
  {
    id: 'rw-founding-member',
    title: 'Founding Member',
    description: 'Awarded to the first cohort to join your club on OAP.',
    requiredLevel: 1,
    status: 'claimed',
  },
  {
    id: 'rw-early-bird',
    title: 'Early Bird',
    description: 'Be among the first five to check in to a live meeting.',
    requiredLevel: 3,
    status: 'claimed',
  },
  {
    id: 'rw-five-week-streak',
    title: 'Five-Week Streak',
    description: 'Check in to five consecutive weekly meetings.',
    requiredLevel: 5,
    status: 'ready',
  },
  {
    id: 'rw-community-pin',
    title: 'Community Pin',
    description: 'Collect attendance tokens from three different clubs.',
    requiredLevel: 7,
    status: 'ready',
  },
  {
    id: 'rw-perfect-semester',
    title: 'Perfect Semester',
    description: 'Attend every meeting in a single semester.',
    requiredLevel: 10,
    status: 'locked',
  },
  {
    id: 'rw-speaker-spotlight',
    title: 'Speaker Spotlight',
    description: 'Host a session and mint tokens for your attendees.',
    requiredLevel: 12,
    status: 'locked',
  },
  {
    id: 'rw-semester-mvp',
    title: 'Semester MVP',
    description: 'Finish a semester ranked in your club leaderboard top three.',
    requiredLevel: 15,
    status: 'locked',
  },
];

export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards(),
    queryFn: async () => MOCK_REWARDS,
    staleTime: Infinity,
  });
}
