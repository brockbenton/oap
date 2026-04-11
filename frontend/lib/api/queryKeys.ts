export const queryKeys = {
  session: (id: string) => ['session', id] as const,
  checkIn: (checkInId: string) => ['checkIn', checkInId] as const,
  adminSessions: () => ['admin', 'sessions'] as const,
  sessionAttendees: (sessionId: string) => ['admin', 'sessions', sessionId, 'attendees'] as const,
  sessionQR: (sessionId: string) => ['session', sessionId, 'qr'] as const,
  adminMembers: () => ['admin', 'members'] as const,
  adminRoles: () => ['admin', 'roles'] as const,
} as const;
