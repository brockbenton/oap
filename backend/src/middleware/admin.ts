import { Request, Response, NextFunction } from 'express';
import { isAddress } from 'viem';
import prisma from '../lib/prisma';

// Requires authMiddleware to run first (which populates req.user.walletAddress from Privy).
// Verifies the authenticated user's wallet has an active admin role in the DB.
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.walletAddress) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const walletAddress = req.user.walletAddress;

  if (!isAddress(walletAddress)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Invalid wallet address' } });
    return;
  }

  const role = await prisma.adminRole.findFirst({
    where: { walletAddress, revokedAt: null },
  });

  if (!role) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not an admin' } });
    return;
  }

  next();
}
