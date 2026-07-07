import { Worker, Job } from 'bullmq';
import { parseEther } from 'viem';
import { MINT_QUEUE, MintJobData } from '../lib/queue';
import { mintOnChain, getRelayBalanceWei, relayAddress } from '../services/relay.service';
import { tokenBalanceOnChain } from '../services/onchain.service';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

// Below this the relay wallet likely can't pay gas, so mints will fail.
const RELAY_MIN_BALANCE_ETH = process.env.RELAY_MIN_BALANCE_ETH ?? '0.005';

export function isBalanceLow(balanceWei: bigint, minWei: bigint): boolean {
  return balanceWei < minWei;
}

/** Best-effort startup check so an unfunded relay wallet is obvious in the logs. */
async function logRelayBalance(): Promise<void> {
  try {
    const balanceWei = await getRelayBalanceWei();
    const balanceEth = Number(balanceWei) / 1e18;
    if (isBalanceLow(balanceWei, parseEther(RELAY_MIN_BALANCE_ETH))) {
      logger.warn({ msg: 'Relay wallet balance is low — mints may fail', relayAddress, balanceEth, minEth: RELAY_MIN_BALANCE_ETH });
    } else {
      logger.info({ msg: 'Relay wallet balance', relayAddress, balanceEth });
    }
  } catch (err) {
    logger.warn({ msg: 'Could not read relay wallet balance', err: (err as Error).message });
  }
}

/**
 * Idempotent mint. If the check-in is already CONFIRMED, or the token already
 * exists on-chain from a prior attempt whose DB write failed, we reconcile the
 * row instead of minting again (a re-mint would revert AlreadyCheckedIn).
 */
export async function runMintJob(data: MintJobData): Promise<void> {
  const { checkInId, memberAddress, sessionIdOnchain } = data;

  const existing = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: { mintStatus: true },
  });
  if (existing?.mintStatus === 'CONFIRMED') {
    logger.info({ msg: 'Mint job skipped — already confirmed', checkInId });
    return;
  }

  if ((await tokenBalanceOnChain(memberAddress, sessionIdOnchain)) > 0n) {
    await prisma.checkIn.update({ where: { id: checkInId }, data: { mintStatus: 'CONFIRMED' } });
    logger.info({ msg: 'Mint job reconciled — token already minted on-chain', checkInId, memberAddress, sessionIdOnchain });
    return;
  }

  const txHash = await mintOnChain(memberAddress, sessionIdOnchain);
  await prisma.checkIn.update({ where: { id: checkInId }, data: { txHash, mintStatus: 'CONFIRMED' } });
  logger.info({ msg: 'Mint job completed', checkInId, txHash });
}

/**
 * Terminal-failure handler: only record FAILED if the token does not actually
 * exist on-chain — otherwise an earlier attempt succeeded and we mark CONFIRMED.
 */
export async function reconcileFailedMint(data: MintJobData): Promise<void> {
  const { checkInId, memberAddress, sessionIdOnchain } = data;

  let minted = false;
  try {
    minted = (await tokenBalanceOnChain(memberAddress, sessionIdOnchain)) > 0n;
  } catch (err) {
    logger.error({ msg: 'Balance check failed during mint reconciliation', checkInId, err: (err as Error).message });
  }

  const nextStatus = minted ? 'CONFIRMED' : 'FAILED';
  await prisma.checkIn
    .updateMany({ where: { id: checkInId, mintStatus: { not: 'CONFIRMED' } }, data: { mintStatus: nextStatus } })
    .catch((e: Error) => logger.error({ msg: 'Failed to update checkIn status', checkInId, err: e.message }));
}

export function startMintWorker(): Worker<MintJobData> {
  const worker = new Worker<MintJobData>(
    MINT_QUEUE,
    async (job: Job<MintJobData>) => {
      logger.info({ msg: 'Processing mint job', jobId: job.id, ...job.data });
      await runMintJob(job.data);
    },
    // concurrency: 1 — prevents on-chain nonce collisions when multiple mints are queued simultaneously
    { connection, concurrency: 1 },
  );

  worker.on('failed', async (job: Job<MintJobData> | undefined, err: Error) => {
    if (!job) return;
    logger.error({ msg: 'Mint job failed', jobId: job.id, err: err.message });

    if ((job.attemptsMade ?? 0) >= (job.opts.attempts ?? 3)) {
      await reconcileFailedMint(job.data);
    }
  });

  logger.info({ msg: 'Mint worker started' });
  void logRelayBalance();
  return worker;
}
