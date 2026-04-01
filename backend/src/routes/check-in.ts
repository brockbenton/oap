import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { recoverMessageAddress, isAddress, getAddress } from 'viem';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { verifyQR } from '../services/qr.service';
import { mintQueue } from '../lib/queue';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const router = Router();

// Maximum age of a member signature before the server rejects it.
const SIGNED_AT_MAX_AGE_MS = 60_000;

const checkInSchema = z.object({
  qrPayload: z.string().min(1),
  memberSignature: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid hex signature'),
  signedAt: z.number().int().positive(),
});

// POST /api/v1/check-in — member checks in to a session
router.post(
  '/',
  authMiddleware,
  validate(checkInSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { qrPayload, memberSignature, signedAt } = req.body as z.infer<typeof checkInSchema>;
    const privyWalletAddress = req.user!.walletAddress;

    // 1. Reject stale signatures (older than 60s or more than 10s in the future)
    const now = Date.now();
    if (signedAt < now - SIGNED_AT_MAX_AGE_MS || signedAt > now + 10_000) {
      res.status(400).json({ error: { code: 'STALE_SIGNATURE', message: 'Signature timestamp is out of range' } });
      return;
    }

    // 2. Verify the QR payload (admin signature + expiry)
    let qr: Awaited<ReturnType<typeof verifyQR>>;
    try {
      qr = await verifyQR(qrPayload);
    } catch (err) {
      res.status(400).json({ error: { code: 'INVALID_QR', message: (err as Error).message } });
      return;
    }

    // 3. Recover member wallet address from their signature.
    //    The message includes the member's wallet address to bind the signature to this specific signer.
    const checkInMessage = `I am checking into session ${qr.sessionId} as ${privyWalletAddress} at ${signedAt}`;
    let recoveredAddress: `0x${string}`;
    try {
      recoveredAddress = await recoverMessageAddress({
        message: checkInMessage,
        signature: memberSignature as `0x${string}`,
      });
    } catch {
      res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Could not recover address from signature' } });
      return;
    }

    // 4. Verify the recovered address matches the Privy-authenticated wallet (binds signature to identity)
    if (recoveredAddress.toLowerCase() !== privyWalletAddress) {
      res.status(400).json({ error: { code: 'ADDRESS_MISMATCH', message: 'Signature was not made by your linked wallet' } });
      return;
    }

    if (!isAddress(recoveredAddress)) {
      res.status(400).json({ error: { code: 'INVALID_ADDRESS', message: 'Recovered address is invalid' } });
      return;
    }

    const checksummedAddress = getAddress(recoveredAddress);

    // 5. Look up the session
    const session = await prisma.session.findUnique({
      where: { sessionIdOnchain: qr.sessionId },
    });

    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    if (session.closedAt) {
      res.status(409).json({ error: { code: 'SESSION_CLOSED', message: 'Session is closed' } });
      return;
    }

    if (session.onchainStatus !== 'CONFIRMED') {
      res.status(409).json({ error: { code: 'SESSION_NOT_READY', message: 'Session not yet confirmed on-chain' } });
      return;
    }

    // 6. Find or create the member record
    const member = await prisma.member.upsert({
      where: { walletAddress: privyWalletAddress },
      update: {},
      create: { walletAddress: privyWalletAddress, privyUserId: req.user!.privyUserId },
    });

    // 7. Create the check-in record.
    //    @@unique([memberId, sessionId]) prevents duplicate check-ins.
    //    nonce is stored for audit trail (not globally unique — multiple members share the same QR).
    let checkIn: { id: string };
    try {
      checkIn = await prisma.checkIn.create({
        data: {
          memberId: member.id,
          sessionId: session.id,
          nonce: qr.nonce,
          mintStatus: 'PENDING',
        },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: { code: 'ALREADY_CHECKED_IN', message: 'Already checked in to this session' } });
        return;
      }
      logger.error({ msg: 'Failed to create check-in record', err: (err as Error).message });
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record check-in' } });
      return;
    }

    // 8. Queue the mint job
    const job = await mintQueue.add(
      'mint',
      {
        checkInId: checkIn.id,
        memberAddress: checksummedAddress as `0x${string}`,
        sessionIdOnchain: qr.sessionId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    logger.info({
      msg: 'Check-in recorded, mint queued',
      jobId: job.id,
      checkInId: checkIn.id,
      memberAddress: privyWalletAddress,
      sessionId: qr.sessionId,
    });

    res.status(202).json({
      data: {
        checkInId: checkIn.id,
        jobId: job.id,
        sessionId: qr.sessionId,
        memberAddress: checksummedAddress,
        status: 'PENDING',
      },
    });
  },
);

export default router;
