import { MemberVault, PersonalStats } from '@/types';
import { apiRequest } from './client';

// Public reads by wallet address (no auth token required) — resolved Open Question #5.

export async function getMemberVault(address: string): Promise<MemberVault> {
  return apiRequest<MemberVault>(`/members/${encodeURIComponent(address)}/tokens`);
}

export async function getPersonalStats(address: string): Promise<PersonalStats> {
  return apiRequest<PersonalStats>(`/members/${encodeURIComponent(address)}/stats`);
}
