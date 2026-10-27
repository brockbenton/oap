import 'dotenv/config';
import { isAddress } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { PrivyClient } from '@privy-io/server-auth';

/**
 * DEPLOY-06 rehearsal: admin creates a session on-chain, member signs a check-in,
 * the BullMQ worker mints via the relay, and we assert balanceOf == 1.
 * Lives in scripts/ only; nothing in src/ may import it (src modules read env at import).
 */

const REQUIRED = [
  'DATABASE_URL', 'REDIS_URL', 'ALCHEMY_API_KEY', 'CONTRACT_ADDRESS', 'CHAIN_ID',
  'RELAY_PRIVATE_KEY', 'ADMIN_SIGNER_PRIVATE_KEY', 'PRIVY_APP_ID', 'PRIVY_APP_SECRET',
] as const;

function redact(text: string): string {
  let out = text;
  for (const k of ['ALCHEMY_API_KEY', 'RELAY_PRIVATE_KEY', 'ADMIN_SIGNER_PRIVATE_KEY', 'DEFAULT_ADMIN_PRIVATE_KEY', 'PRIVY_APP_SECRET']) {
    const v = process.env[k];
    if (v && v.length > 3) out = out.split(v).join('***');
  }
  return out;
}

function isPlaceholder(v: string | undefined): boolean {
  return !v || v.trim() === '' || v === '0x...' || v.startsWith('your_');
}

function preflight(): void {
  const fail = (reason: string): never => {
    console.error(`REHEARSAL PREFLIGHT FAILED: ${reason}`);
    process.exit(1);
  };
  if (process.env.NODE_ENV === 'production') fail('NODE_ENV is production');
  if (process.env.CHAIN_ID !== '84532') fail('CHAIN_ID must be 84532');
  for (const name of REQUIRED) {
    const v = process.env[name];
    if (isPlaceholder(v)) fail(`${name} is missing or a placeholder`);
  }
  for (const name of ['RELAY_PRIVATE_KEY', 'ADMIN_SIGNER_PRIVATE_KEY']) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(process.env[name]!)) fail(`${name} is not a 0x-prefixed 32-byte hex key`);
  }
  if (!isAddress(process.env.CONTRACT_ADDRESS!)) fail('CONTRACT_ADDRESS is not a valid address');
}

class StepError extends Error {}

async function main(): Promise<void> {
  preflight();

  const adminAccount = privateKeyToAccount(process.env.ADMIN_SIGNER_PRIVATE_KEY as `0x${string}`);
  const memberAccount = privateKeyToAccount(generatePrivateKey());

  // Script-process-only auth patch. Must never move into src/ (threat T-01-03).
  const proto = PrivyClient.prototype as unknown as {
    getUser: (arg: { idToken: string }) => Promise<unknown>;
  };
  proto.getUser = async ({ idToken }) => {
    if (idToken === 'admin') {
      return { id: 'did:privy:rehearsal-admin', wallet: { address: adminAccount.address } };
    }
    if (idToken === 'member') {
      return { id: `did:privy:rehearsal-member-${memberAccount.address}`, wallet: { address: memberAccount.address } };
    }
    throw new Error('unknown token');
  };

  const { createApp } = await import('../src/app');
  const { startMintWorker } = await import('../src/jobs/mint.job');
  const { mintQueue } = await import('../src/lib/queue');
  const prisma = (await import('../src/lib/prisma')).default;
  const { tokenBalanceOnChain } = await import('../src/services/onchain.service');

  const server = createApp().listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}/api/v1`;
  const worker = startMintWorker();

  type Json = { data?: Record<string, unknown>; error?: { code?: string } };
  const call = async (path: string, token: string, body?: unknown): Promise<{ status: number; json: Json }> => {
    const res = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
  };
  const expect = (step: number, expected: number, r: { status: number; json: Json }): void => {
    if (r.status !== expected) {
      throw new StepError(`step ${step} expected ${expected} got ${r.status} ${r.json.error?.code ?? ''}`);
    }
  };

  let ok = false;
  try {
    const sessionId = String(Date.now());
    const s = await call('/sessions', 'admin', {
      sessionId, date: new Date().toISOString(), name: `Rehearsal ${sessionId}`, semester: 'Rehearsal',
    });
    expect(1, 201, s);
    if (s.json.data?.onchainStatus !== 'CONFIRMED') throw new StepError('step 1 session not CONFIRMED');
    console.log(`[1/6] session created tx=${String(s.json.data?.txHash)}`);

    const q = await call(`/sessions/${sessionId}/qr`, 'admin');
    expect(2, 200, q);
    const qr = q.json.data?.qr as string;
    console.log('[2/6] QR fetched');

    const checkIn = async (): Promise<{ status: number; json: Json }> => {
      const signedAt = Date.now();
      const memberSignature = await memberAccount.signMessage({
        message: `I am checking into session ${sessionId} as ${memberAccount.address.toLowerCase()} at ${signedAt}`,
      });
      return call('/check-in', 'member', { qrPayload: qr, memberSignature, signedAt });
    };
    const c = await checkIn();
    expect(3, 202, c);
    const checkInId = c.json.data?.checkInId as string;
    console.log(`[3/6] check-in accepted member=${memberAccount.address}`);

    let txHash: string | null = null;
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const row = await prisma.checkIn.findUnique({ where: { id: checkInId } });
      if (row?.mintStatus === 'FAILED') throw new StepError('step 4 mint FAILED');
      if (row?.mintStatus === 'CONFIRMED' && row.txHash) { txHash = row.txHash; break; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!txHash) throw new StepError('step 4 timed out waiting for CONFIRMED');
    console.log(`[4/6] mint confirmed tx=${txHash}`);

    const bal = await tokenBalanceOnChain(memberAccount.address, sessionId);
    if (bal !== 1n) throw new StepError(`step 5 expected balance 1 got ${bal}`);
    console.log('[5/6] balanceOf == 1');

    const dup = await checkIn();
    expect(6, 409, dup);
    if (dup.json.error?.code !== 'ALREADY_CHECKED_IN') throw new StepError(`step 6 expected ALREADY_CHECKED_IN got ${dup.json.error?.code}`);
    console.log('[6/6] duplicate rejected');

    console.log(`https://sepolia.basescan.org/tx/${txHash}`);
    console.log('REHEARSAL PASSED');
    ok = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(redact(`REHEARSAL FAILED: ${msg}`));
  } finally {
    await worker.close().catch(() => undefined);
    await mintQueue.close().catch(() => undefined);
    server.close();
    await prisma.$disconnect().catch(() => undefined);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(redact(`REHEARSAL FAILED: ${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
