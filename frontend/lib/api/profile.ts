import { MemberProfile } from '@/types';
import { apiRequest } from './client';

export interface ProfilePatch {
  username?: string;
  avatarColor?: number | null;
  bio?: string | null;
  notifyEmail?: boolean;
}

export async function getMyProfile(token: string): Promise<MemberProfile> {
  return apiRequest<MemberProfile>('/members/me', { token });
}

export async function updateMyProfile(patch: ProfilePatch, token: string): Promise<MemberProfile> {
  return apiRequest<MemberProfile>('/members/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
    token,
  });
}
