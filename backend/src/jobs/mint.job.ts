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
      await prisma.checkIn
        .update({
          where: { id: job.data.checkInId },
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
