'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { getAdminMe } from '@/lib/api/admin';
import { requireIdentityToken, retryUnlessForbidden } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

// Authorization must be per-identity and never served stale: key by Privy user
// id and disable caching so a different (or signed-out) user can never inherit
// a previous admin's cached verdict on a shared/kiosk browser.
export function useAdminMe() {
  const { ready, authenticated, user } = usePrivy();
  return useQuery({
    queryKey: queryKeys.adminMe(user?.id),
    queryFn: async () => {
      const token = await requireIdentityToken();
      return getAdminMe(token);
    },
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
    staleTime: 0,
    gcTime: 0,
  });
}
