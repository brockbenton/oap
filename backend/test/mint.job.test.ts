import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/queue', () => ({ MINT_QUEUE: 'mint', mintQueue: {} }));
vi.mock('../src/lib/prisma', () => ({
  default: { checkIn: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock('../src/services/relay.service', () => ({ mintOnChain: vi.fn() }));
vi.mock('../src/services/onchain.service', () => ({ tokenBalanceOnChain: vi.fn() }));

import prisma from '../src/lib/prisma';
import { mintOnChain } from '../src/services/relay.service';
import { tokenBalanceOnChain } from '../src/services/onchain.service';
import { runMintJob, reconcileFailedMint } from '../src/jobs/mint.job';

const DATA = {
  checkInId: 'ci1',
  memberAddress: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  sessionIdOnchain: '3001',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.checkIn.update).mockResolvedValue(undefined as never);
  vi.mocked(prisma.checkIn.updateMany).mockResolvedValue({ count: 1 } as never);
});

describe('runMintJob (idempotent mint)', () => {
  it('does nothing when the check-in is already CONFIRMED', async () => {
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ mintStatus: 'CONFIRMED' } as never);
    await runMintJob(DATA);
    expect(mintOnChain).not.toHaveBeenCalled();
    expect(tokenBalanceOnChain).not.toHaveBeenCalled();
  });

  it('reconciles to CONFIRMED without re-minting when the token already exists on-chain', async () => {
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ mintStatus: 'PENDING' } as never);
    vi.mocked(tokenBalanceOnChain).mockResolvedValue(1n);
    await runMintJob(DATA);
    expect(mintOnChain).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ mintStatus: 'CONFIRMED' }) }),
    );
  });

  it('mints and records the tx hash when no token exists yet', async () => {
    vi.mocked(prisma.checkIn.findUnique).mockResolvedValue({ mintStatus: 'PENDING' } as never);
    vi.mocked(tokenBalanceOnChain).mockResolvedValue(0n);
    vi.mocked(mintOnChain).mockResolvedValue('0xabc' as `0x${string}`);
    await runMintJob(DATA);
    expect(mintOnChain).toHaveBeenCalledOnce();
    expect(prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { txHash: '0xabc', mintStatus: 'CONFIRMED' } }),
    );
  });
});

describe('reconcileFailedMint', () => {
  it('marks CONFIRMED when the token actually exists on-chain (no false FAILED)', async () => {
    vi.mocked(tokenBalanceOnChain).mockResolvedValue(1n);
    await reconcileFailedMint(DATA);
    expect(prisma.checkIn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mintStatus: 'CONFIRMED' } }),
    );
  });

  it('marks FAILED when no token exists on-chain', async () => {
    vi.mocked(tokenBalanceOnChain).mockResolvedValue(0n);
    await reconcileFailedMint(DATA);
    expect(prisma.checkIn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mintStatus: 'FAILED' } }),
    );
  });
});
