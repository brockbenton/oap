export const queryKeys = {
  session: (id: string) => ['session', id] as const,
  checkIn: (checkInId: string) => ['checkIn', checkInId] as const,
  adminSessions: () => ['admin', 'sessions'] as const,
  sessionAttendees: (sessionId: string) => ['admin', 'sessions', sessionId, 'attendees'] as const,
  sessionQR: (sessionId: string) => ['session', sessionId, 'qr'] as const,
  adminMembers: () => ['admin', 'members'] as const,
  adminRoles: () => ['admin', 'roles'] as const,
  adminMe: () => ['admin', 'me'] as const,
  adminOverview: () => ['admin', 'overview'] as const,
  memberVault: (address: string) => ['member', address, 'vault'] as const,
  memberStats: (address: string) => ['member', address, 'stats'] as const,
} as const;
