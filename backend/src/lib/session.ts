import { Response } from 'express';
import type { Session } from '@prisma/client';
import prisma from './prisma';

// August is the first month of the fall semester; everything before it is spring.
const FALL_START_MONTH = 7;

/** The semester a date falls in: Aug 1 to Dec 31 is Fall, Jan 1 to Jul 31 is Spring. */
export function semesterFor(date: Date): string {
  const season = date.getUTCMonth() >= FALL_START_MONTH ? 'Fall' : 'Spring';
  return `${season} ${date.getUTCFullYear()}`;
}

/** Loads a session by on-chain id, sending the 404 response when it does not exist. */
export async function findSessionOr404(
  sessionIdOnchain: string,
  res: Response,
): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { sessionIdOnchain } });
  if (!session) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
  }
  return session;
}
