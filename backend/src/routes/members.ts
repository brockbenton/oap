import { Router, Request, Response } from 'express';
import { buildMemberStats } from '../services/stats.service';

const router = Router();

// ── GET /api/v1/members ───────────────────────────────────────────────────
// Public endpoint — returns all members with attendance stats.
// Intended for website integration (e.g. club website member directory).

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { members, totalSessions, currentSemester } = await buildMemberStats();

  res.json({ data: { members, totalSessions, currentSemester } });
});

export default router;
