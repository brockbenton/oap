import { publicClient, adminWalletClient, relayWalletClient, adminAccount, relayAccount, chain } from '../lib/contract';
import { ATTENDANCE_ABI } from '../lib/abi';
import logger from '../lib/logger';

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;

export async function createSessionOnChain(
  sessionIdOnchain: string,
  date: Date,
  name: string,
  semester: string,
): Promise<`0x${string}`> {
  const hash = await adminWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'createSession',
    args: [BigInt(sessionIdOnchain), BigInt(Math.floor(date.getTime() / 1000)), name, semester],
    account: adminAccount,
    chain,
  });

  logger.info({ msg: 'createSession tx submitted', hash, sessionIdOnchain });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'createSession confirmed', hash, sessionIdOnchain });
  return hash;
}

export async function closeSessionOnChain(sessionIdOnchain: string): Promise<`0x${string}`> {
  const hash = await adminWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'closeSession',
    args: [BigInt(sessionIdOnchain)],
    account: adminAccount,
    chain,
  });

  logger.info({ msg: 'closeSession tx submitted', hash, sessionIdOnchain });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'closeSession confirmed', hash, sessionIdOnchain });
  return hash;
}

export async function mintOnChain(
  to: `0x${string}`,
  sessionIdOnchain: string,
): Promise<`0x${string}`> {
  const hash = await relayWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'mint',
    args: [to, BigInt(sessionIdOnchain)],
    account: relayAccount,
    chain,
  });

  logger.info({ msg: 'mint tx submitted', hash, to, sessionIdOnchain });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'mint confirmed', hash, to, sessionIdOnchain });
  return hash;
}
