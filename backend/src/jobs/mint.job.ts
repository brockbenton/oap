import { Worker, Job } from 'bullmq';
import { MINT_QUEUE, MintJobData } from '../lib/queue';
import { mintOnChain } from '../services/relay.service';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

export function startMintWorker(): Worker<MintJobData> {
  const worker = new Worker<MintJobData>(
    MINT_QUEUE,
    async (job: Job<MintJobData>) => {
      const { checkInId, memberAddress, sessionIdOnchain } = job.data;
      logger.info({ msg: 'Processing mint job', jobId: job.id, checkInId, memberAddress, sessionIdOnchain });

      // Idempotency: a retry after a successful on-chain mint but failed DB write
      // must not mint again (the contract would revert AlreadyCheckedIn and the
      // retry would falsely mark this check-in FAILED). Skip if already minted.
      const existing = await prisma.checkIn.findUnique({
        where: { id: checkInId },
        select: { mintStatus: true, txHash: true },
      });
      if (existing?.mintStatus === 'CONFIRMED' && existing.txHash) {
        logger.info({ msg: 'Mint job skipped — already confirmed', jobId: job.id, checkInId, txHash: existing.txHash });
        return;
      }

      const txHash = await mintOnChain(memberAddress, sessionIdOnchain);

      await prisma.checkIn.update({
        where: { id: checkInId },
        data: { txHash, mintStatus: 'CONFIRMED' },
      });

      logger.info({ msg: 'Mint job completed', jobId: job.id, txHash });
    },
    // concurrency: 1 — prevents on-chain nonce collisions when multiple mints are queued simultaneously
    { connection, concurrency: 1 },
  );

  worker.on('failed', async (job: Job<MintJobData> | undefined, err: Error) => {
    if (!job) return;
    logger.error({ msg: 'Mint job failed', jobId: job.id, err: err.message });

    if ((job.attemptsMade ?? 0) >= (job.opts.attempts ?? 3)) {
      // Guard against a false FAILED overwriting a mint that actually confirmed
      // on-chain in an earlier attempt (see idempotency note above).
      await prisma.checkIn
        .updateMany({
          where: { id: job.data.checkInId, mintStatus: { not: 'CONFIRMED' } },
          data: { mintStatus: 'FAILED' },
        })
        .catch((e: Error) =>
          logger.error({ msg: 'Failed to update checkIn status', err: e.message }),
        );
    }
  });

  logger.info({ msg: 'Mint worker started' });
  return worker;
}
