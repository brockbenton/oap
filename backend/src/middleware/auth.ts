import { Request, Response, NextFunction } from 'express';
import { PrivyClient } from '@privy-io/server-auth';
import { AuthUser } from '../types';

let _privy: PrivyClient | null = null;

export function getPrivy(): PrivyClient {
  if (!_privy) {
    _privy = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
    );
  }
  return _privy;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    // Use idToken overload — fetches user + verifies JWT in one call without rate limits.
    const user = await getPrivy().getUser({ idToken: token });
    const walletAddress = user.wallet?.address?.toLowerCase();
    if (!walletAddress) {
      res.status(403).json({ error: { code: 'NO_WALLET', message: 'No wallet linked to account' } });
      return;
    }
    req.user = { privyUserId: user.id, walletAddress };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid auth token' } });
  }
}
