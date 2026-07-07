import { Request, Response, NextFunction } from 'express';
import { isAddress } from 'viem';
import { hasAdminRoleOnChain } from '../services/onchain.service';
import logger from '../lib/logger';

// Requires authMiddleware to run first (which populates req.user.walletAddress from Privy).
// Authorization is the on-chain ADMIN_ROLE — the contract is the source of truth, not the
// admin_roles DB table (a stale/failed-to-revoke row must not grant access). Fails closed.
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const walletAddress = req.user?.walletAddress;

  if (!walletAddress) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  if (!isAddress(walletAddress)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Invalid wallet address' } });
    return;
  }

  let isAdmin: boolean;
  try {
    isAdmin = await hasAdminRoleOnChain(walletAddress);
  } catch (err) {
    logger.error({ msg: 'On-chain admin role check failed', wallet: walletAddress, err: (err as Error).message });
    res.status(503).json({ error: { code: 'ROLE_CHECK_FAILED', message: 'Could not verify admin role' } });
    return;
  }

  if (!isAdmin) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not an admin' } });
    return;
  }

  next();
}
