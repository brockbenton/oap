export const queryKeys = {
  session: (id: string) => ['session', id] as const,
  checkIn: (checkInId: string) => ['checkIn', checkInId] as const,
} as const;
