import { Router, Request, Response } from 'express';
import { isAddress } from 'viem';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { grantAdminRoleOnChain, revokeAdminRoleOnChain } from '../services/relay.service';
import { buildMemberStats, buildAdminOverview } from '../services/stats.service';
import { publishSemesterMetadata } from '../services/ipfs.service';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// ── GET /api/v1/admin/me ──────────────────────────────────────────────────
// Lightweight admin-gate probe for the frontend: 200 => admin, 403 => not.

router.get('/me', (req: Request, res: Response): void => {
  res.json({ data: { isAdmin: true, walletAddress: req.user!.walletAddress } });
});

// ── GET /api/v1/admin/overview ────────────────────────────────────────────
// Dashboard overview: attendance-over-time series, per-session headcount, and
// session-over-session (week-over-week) delta.

router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  const overview = await buildAdminOverview();
  res.json({ data: overview });
});

// ── GET /api/v1/admin/sessions ────────────────────────────────────────────

router.get('/sessions', async (_req: Request, res: Response): Promise<void> => {
  const sessions = await prisma.session.findMany({
    orderBy: { date: 'desc' },
    include: { _count: { select: { checkIns: true } } },
  });

  res.json({
    data: sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionIdOnchain,
      name: s.name,
      date: s.date.toISOString(),
      semester: s.semester,
      createdBy: s.createdBy,
      txHash: s.txHash,
      onchainStatus: s.onchainStatus,
      closedAt: s.closedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      attendeeCount: s._count.checkIns,
    })),
  });
});

// ── GET /api/v1/admin/sessions/:sessionId/attendees ───────────────────────

router.get('/sessions/:sessionId/attendees', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  const session = await prisma.session.findUnique({
    where: { sessionIdOnchain: sessionId },
  });

  if (!session) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    return;
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { sessionId: session.id },
    include: { member: { select: { walletAddress: true } } },
    orderBy: { checkedInAt: 'asc' },
  });

  res.json({
    data: checkIns.map((c) => ({
      walletAddress: c.member.walletAddress,
      checkedInAt: c.checkedInAt.toISOString(),
      mintStatus: c.mintStatus,
      txHash: c.txHash,
    })),
  });
});

// ── GET /api/v1/admin/members ─────────────────────────────────────────────

router.get('/members', async (_req: Request, res: Response): Promise<void> => {
  const { members, totalSessions, currentSemester } = await buildMemberStats();

  res.json({ data: { members, totalSessions, currentSemester } });
});

// ── PATCH /api/v1/admin/members/:memberId/founding-member ─────────────────

router.patch(
  '/members/:memberId/founding-member',
  async (req: Request, res: Response): Promise<void> => {
    const { memberId } = req.params;
    const { founding } = req.body as { founding: unknown };

    if (typeof founding !== 'boolean') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: '`founding` must be a boolean' } });
      return;
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
      return;
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { foundingMember: founding },
      select: { id: true, walletAddress: true, foundingMember: true },
    });

    logger.info({
      msg: founding ? 'Founding member granted' : 'Founding member revoked',
      memberId: updated.id,
      walletAddress: updated.walletAddress,
    });

    res.json({ data: updated });
  },
);

// ── GET /api/v1/admin/export/sessions/:sessionId ──────────────────────────

router.get('/export/sessions/:sessionId', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  const session = await prisma.session.findUnique({
    where: { sessionIdOnchain: sessionId },
  });

  if (!session) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    return;
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { sessionId: session.id },
    include: { member: { select: { walletAddress: true } } },
    orderBy: { checkedInAt: 'asc' },
  });

  const safeName = session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const filename = `session-${safeName}-attendees.csv`;

  const rows = [
    csvRow(['wallet_address', 'checked_in_at', 'mint_status', 'tx_hash']),
    ...checkIns.map((c) =>
      csvRow([c.member.walletAddress, c.checkedInAt.toISOString(), c.mintStatus, c.txHash]),
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(rows.join('\r\n'));
});

// ── GET /api/v1/admin/export/members ─────────────────────────────────────

router.get('/export/members', async (_req: Request, res: Response): Promise<void> => {
  const { members } = await buildMemberStats();

  const rows = [
    csvRow([
      'wallet_address',
      'account',
      'tokens_earned',
      'all_time_pct',
      'semester_pct',
      'status_tier',
      'founding_member',
      'last_seen',
    ]),
    ...members.map((m) =>
      csvRow([
        m.walletAddress,
        m.linkedAccount,
        m.tokensEarned,
        m.allTimeAttendancePct,
        m.currentSemesterAttendancePct,
        m.statusTier,
        m.foundingMember,
        m.lastSeen,
      ]),
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
  res.send(rows.join('\r\n'));
});

// ── GET /api/v1/admin/roles — list active admin roles ─────────────────────

router.get('/roles', async (_req: Request, res: Response): Promise<void> => {
  const roles = await prisma.adminRole.findMany({
    where: { revokedAt: null },
    orderBy: { grantedAt: 'desc' },
  });

  res.json({
    data: roles.map((r) => ({
      id: r.id,
      walletAddress: r.walletAddress,
      grantedBy: r.grantedBy,
      grantedAt: r.grantedAt.toISOString(),
      revokedAt: null,
    })),
  });
});

// ── POST /api/v1/admin/roles — grant ADMIN_ROLE on-chain + DB ─────────────

router.post('/roles', async (req: Request, res: Response): Promise<void> => {
  if (!process.env.DEFAULT_ADMIN_PRIVATE_KEY) {
    res.status(503).json({
      error: { code: 'NOT_CONFIGURED', message: 'Set DEFAULT_ADMIN_PRIVATE_KEY to enable role management' },
    });
    return;
  }

  const { walletAddress } = req.body as { walletAddress: unknown };

  if (typeof walletAddress !== 'string' || !isAddress(walletAddress)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid Ethereum address' } });
    return;
  }

  const normalized = walletAddress.toLowerCase();

  const existing = await prisma.adminRole.findFirst({
    where: { walletAddress: normalized, revokedAt: null },
  });
  if (existing) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Wallet already has ADMIN_ROLE' } });
    return;
  }

  let txHash: `0x${string}`;
  try {
    txHash = await grantAdminRoleOnChain(normalized as `0x${string}`);
  } catch (err) {
    logger.error({ msg: 'grantRole on-chain failed', err: (err as Error).message });
    res.status(500).json({ error: { code: 'CHAIN_ERROR', message: 'Failed to grant role on-chain' } });
    return;
  }

  let role: Awaited<ReturnType<typeof prisma.adminRole.create>>;
  try {
    role = await prisma.adminRole.create({
      data: {
        walletAddress: normalized,
        grantedBy: req.user!.walletAddress,
      },
    });
  } catch (err) {
    // On-chain grant succeeded but DB write failed — log the desync so it can be reconciled.
    logger.error({
      msg: 'ADMIN_ROLE granted on-chain but DB write failed — DESYNC',
      wallet: normalized,
      txHash,
      err: (err as Error).message,
    });
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Role granted on-chain but failed to record in DB. Contact an operator.' } });
    return;
  }

  logger.info({ msg: 'ADMIN_ROLE granted', wallet: normalized, txHash, grantedBy: req.user!.walletAddress });

  res.status(201).json({
    data: {
      id: role.id,
      walletAddress: role.walletAddress,
      grantedBy: role.grantedBy,
      grantedAt: role.grantedAt.toISOString(),
      revokedAt: null,
      txHash,
    },
  });
});

// ── DELETE /api/v1/admin/roles/:walletAddress — revoke ADMIN_ROLE ─────────

router.delete('/roles/:walletAddress', async (req: Request, res: Response): Promise<void> => {
  if (!process.env.DEFAULT_ADMIN_PRIVATE_KEY) {
    res.status(503).json({
      error: { code: 'NOT_CONFIGURED', message: 'Set DEFAULT_ADMIN_PRIVATE_KEY to enable role management' },
    });
    return;
  }

  const rawWallet = req.params.walletAddress;
  if (!isAddress(rawWallet)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid Ethereum address' } });
    return;
  }

  const normalized = rawWallet.toLowerCase();

  const role = await prisma.adminRole.findFirst({
    where: { walletAddress: normalized, revokedAt: null },
  });
  if (!role) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No active ADMIN_ROLE found for this wallet' } });
    return;
  }

  // Prevent an admin from revoking their own role (avoids lockout)
  if (normalized === req.user!.walletAddress.toLowerCase()) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'You cannot revoke your own admin role' } });
    return;
  }

  let txHash: `0x${string}`;
  try {
    txHash = await revokeAdminRoleOnChain(normalized as `0x${string}`);
  } catch (err) {
    logger.error({ msg: 'revokeRole on-chain failed', err: (err as Error).message });
    res.status(500).json({ error: { code: 'CHAIN_ERROR', message: 'Failed to revoke role on-chain' } });
    return;
  }

  try {
    await prisma.adminRole.update({
      where: { id: role.id },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    // On-chain revoke succeeded but DB write failed — log the desync so it can be reconciled.
    logger.error({
      msg: 'ADMIN_ROLE revoked on-chain but DB update failed — DESYNC',
      wallet: normalized,
      txHash,
      err: (err as Error).message,
    });
    res.status(500).json({ error: { code: 'DB_ERROR', message: 'Role revoked on-chain but failed to update DB. Contact an operator.' } });
    return;
  }

  logger.info({ msg: 'ADMIN_ROLE revoked', wallet: normalized, txHash, revokedBy: req.user!.walletAddress });

  res.json({ data: { txHash } });
});

// ── POST /api/v1/admin/ipfs/publish ──────────────────────────────────────
// Generates + stages (and pins, when PINATA_JWT is set) per-semester token
// metadata for every confirmed session. Dry-run without a pinning key.

router.post('/ipfs/publish', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await publishSemesterMetadata();
    logger.info({ msg: 'IPFS metadata publish requested', staged: result.staged, baseCid: result.baseCid, dryRun: result.dryRun });
    res.json({ data: result });
  } catch (err) {
    logger.error({ msg: 'IPFS metadata publish failed', err: (err as Error).message });
    res.status(500).json({ error: { code: 'IPFS_ERROR', message: 'Failed to publish metadata' } });
  }
});

export default router;

// ── Shared helpers ────────────────────────────────────────────────────────

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(csvEscape).join(',');
}

