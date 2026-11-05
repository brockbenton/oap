import { Response } from 'express';
import type { Session } from '@prisma/client';
import prisma from './prisma';

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
