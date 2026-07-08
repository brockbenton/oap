import { MemberVault, PersonalStats } from '@/types';
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
