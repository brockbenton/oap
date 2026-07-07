import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validate } from '../middleware/validate';
import { generateQR } from '../services/qr.service';
import { createSessionOnChain, closeSessionOnChain } from '../services/relay.service';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const router = Router();

const createSessionSchema = z.object({
  sessionId: z.string().regex(/^\d+$/, 'sessionId must be a numeric string'),
  date: z.string().datetime(),
  name: z.string().min(1).max(200),
  semester: z.string().min(1).max(100),
});

// POST /api/v1/sessions — admin creates a new session (DB + on-chain)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  validate(createSessionSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId, date, name, semester } = req.body as z.infer<typeof createSessionSchema>;
    const adminWallet = req.user!.walletAddress;

    const existing = await prisma.session.findUnique({
      where: { sessionIdOnchain: sessionId },
    });
    if (existing) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Session already exists' } });
      return;
    }

    const session = await prisma.session.create({
      data: {
        sessionIdOnchain: sessionId,
        name,
        date: new Date(date),
        semester,
        createdBy: adminWallet,
        onchainStatus: 'PENDING',
      },
    });

    let txHash: `0x${string}`;
    try {
      txHash = await createSessionOnChain(sessionId, new Date(date), name, semester);
    } catch (err) {
      await prisma.session.update({
        where: { id: session.id },
        data: { onchainStatus: 'FAILED' },
      });
      logger.error({ msg: 'createSession on-chain failed', err: (err as Error).message });
      res.status(500).json({ error: { code: 'CHAIN_ERROR', message: 'Failed to create session on-chain' } });
      return;
    }

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { txHash, onchainStatus: 'CONFIRMED' },
    });

    res.status(201).json({ data: serializeSession(updated) });
  },
);

// GET /api/v1/sessions/:sessionId — get session details
router.get(
  '/:sessionId',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { sessionIdOnchain: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    res.json({ data: serializeSession(session) });
  },
);

// POST /api/v1/sessions/:sessionId/close — admin closes a session
router.post(
  '/:sessionId/close',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { sessionIdOnchain: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.closedAt) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Session already closed' } });
      return;
    }

    let txHash: `0x${string}`;
    try {
      txHash = await closeSessionOnChain(sessionId);
    } catch (err) {
      logger.error({ msg: 'closeSession on-chain failed', err: (err as Error).message });
      res.status(500).json({ error: { code: 'CHAIN_ERROR', message: 'Failed to close session on-chain' } });
      return;
    }

    const updated = await prisma.session.update({
      where: { sessionIdOnchain: sessionId },
      data: { closedAt: new Date(), closeTxHash: txHash },
    });

    res.json({ data: serializeSession(updated) });
  },
);

// GET /api/v1/sessions/:sessionId/qr — generate a time-limited signed QR payload (admin only)
router.get(
  '/:sessionId/qr',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { sessionIdOnchain: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.closedAt) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Session is closed' } });
      return;
    }

    if (session.onchainStatus !== 'CONFIRMED') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Session not yet confirmed on-chain' } });
      return;
    }

    const qr = await generateQR(sessionId);
    res.json({ data: { qr } });
  },
);

function serializeSession(s: {
  id: string;
  sessionIdOnchain: string;
  name: string;
  date: Date;
  semester: string;
  createdBy: string;
  txHash: string | null;
  closeTxHash: string | null;
  onchainStatus: string;
  closedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: s.id,
    sessionId: s.sessionIdOnchain,
    name: s.name,
    date: s.date.toISOString(),
    semester: s.semester,
    createdBy: s.createdBy,
    txHash: s.txHash,
    closeTxHash: s.closeTxHash,
    onchainStatus: s.onchainStatus,
    closedAt: s.closedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
