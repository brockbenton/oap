import { CheckInResponse } from '@/types';
import { apiRequest } from './client';

interface CheckInParams {
  qrPayload: string;
  memberSignature: `0x${string}`;
  signedAt: number;
  token: string;
}

export async function submitCheckIn(params: CheckInParams): Promise<CheckInResponse> {
  const { token, ...body } = params;
  return apiRequest<CheckInResponse>('/check-in', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}
