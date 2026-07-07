import { SessionWithCount, Attendee, Session, MembersListResponse, AdminRole } from '@/types';
import { apiRequest, API_BASE, ApiRequestError } from './client';

// Download a CSV from an admin export endpoint and trigger a browser save-file dialog.
// Must be called in a browser context (not SSR).
async function downloadCSV(path: string, fallbackFilename: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ApiRequestError('EXPORT_FAILED', 'CSV export failed', response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadSessionCSV(sessionId: string, token: string): Promise<void> {
  await downloadCSV(
    `/admin/export/sessions/${encodeURIComponent(sessionId)}`,
    `session-${sessionId}-attendees.csv`,
    token,
  );
}

export async function downloadMembersCSV(token: string): Promise<void> {
  await downloadCSV('/admin/export/members', 'members.csv', token);
}

export async function listAdminSessions(token: string): Promise<SessionWithCount[]> {
  return apiRequest<SessionWithCount[]>('/admin/sessions', { token });
}

export async function getSessionAttendees(sessionId: string, token: string): Promise<Attendee[]> {
  return apiRequest<Attendee[]>(`/admin/sessions/${encodeURIComponent(sessionId)}/attendees`, { token });
}

export interface CreateSessionParams {
  sessionId: string;
  date: string;
  name: string;
  semester: string;
}

export async function createSession(params: CreateSessionParams, token: string): Promise<Session> {
  return apiRequest<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify(params),
    token,
  });
}

export async function getSession(sessionId: string, token: string): Promise<Session> {
  return apiRequest<Session>(`/sessions/${encodeURIComponent(sessionId)}`, { token });
}

export async function listAdminMembers(token: string): Promise<MembersListResponse> {
  return apiRequest<MembersListResponse>('/admin/members', { token });
}

export async function toggleFoundingMember(
  memberId: string,
  founding: boolean,
  token: string,
): Promise<void> {
  await apiRequest<{ id: string; walletAddress: string; foundingMember: boolean }>(
    `/admin/members/${encodeURIComponent(memberId)}/founding-member`,
    { method: 'PATCH', body: JSON.stringify({ founding }), token },
  );
}

export async function listAdminRoles(token: string): Promise<AdminRole[]> {
  return apiRequest<AdminRole[]>('/admin/roles', { token });
}

export async function grantAdminRole(walletAddress: string, token: string): Promise<AdminRole> {
  return apiRequest<AdminRole>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
    token,
  });
}

export async function revokeAdminRole(walletAddress: string, token: string): Promise<{ txHash: string }> {
  return apiRequest<{ txHash: string }>(
    `/admin/roles/${encodeURIComponent(walletAddress)}`,
    { method: 'DELETE', token },
  );
}

export async function getSessionQR(sessionId: string, token: string): Promise<string> {
  const result = await apiRequest<{ qr: string }>(
    `/sessions/${encodeURIComponent(sessionId)}/qr`,
    { token },
  );
  return result.qr;
}
