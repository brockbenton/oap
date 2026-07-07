import { Router, Request, Response } from 'express';
import { isAddress } from 'viem';
import {
  buildMemberStats,
  buildMemberVault,
  buildPersonalStats,
} from '../services/stats.service';

const router = Router();

// ── GET /api/v1/members ───────────────────────────────────────────────────
// Public directory — unauthenticated, so linkedAccount (email/social PII) is
// stripped here; only the auth-gated /admin/members endpoint returns it.

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { members, totalSessions, currentSemester } = await buildMemberStats(false);

  const publicMembers = members.map(
    ({ linkedAccount: _linkedAccount, id: _id, ...rest }) => rest,
  );

  res.json({ data: { members: publicMembers, totalSessions, currentSemester } });
});

// ── GET /api/v1/members/:address/tokens ─────────────────────────────────────
// A member's attendance-token vault. Public by wallet address (resolved Open
// Question #5) — the same attendance data already surfaced by the directory.

router.get('/:address/tokens', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  if (!isAddress(address)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid wallet address' } });
    return;
  }

  const vault = await buildMemberVault(address);
  res.json({ data: vault });
});

// ── GET /api/v1/members/:address/stats ──────────────────────────────────────
// A member's personal attendance statistics (public by wallet address).

router.get('/:address/stats', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  if (!isAddress(address)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid wallet address' } });
    return;
  }

  const stats = await buildPersonalStats(address);
  res.json({ data: stats });
});

export default router;
