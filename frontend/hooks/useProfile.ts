'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getIdentityToken, usePrivy, useWallets } from '@privy-io/react-auth';
import { getMyProfile, updateMyProfile, type ProfilePatch } from '@/lib/api/profile';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden } from '@/lib/api/client';
import { shortenAddress } from '@/lib/address';

async function requireToken(): Promise<string> {
  const token = await getIdentityToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useProfile() {
  const { ready, authenticated, user } = usePrivy();
  return useQuery({
    queryKey: queryKeys.myProfile(user?.id),
    queryFn: async () => getMyProfile(await requireToken()),
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
  });
}

export function useUpdateProfile() {
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => updateMyProfile(patch, await requireToken()),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.myProfile(user?.id), data);
    },
  });
}

export function useEmbeddedAddress(): string | undefined {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  return (
    wallets.find((w) => w.walletClientType === 'privy')?.address ?? user?.wallet?.address
  )?.toLowerCase();
}

// Never the raw email: chosen username → shortened wallet → generic fallback.
export function useDisplayName(): string {
  const { data: profile } = useProfile();
  const address = useEmbeddedAddress();
  if (profile?.username) return profile.username;
  if (address) return shortenAddress(address);
  return 'Member';
}
