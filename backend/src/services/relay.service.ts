import { publicClient, adminWalletClient, relayWalletClient, adminAccount, relayAccount, defaultAdminWalletClient, defaultAdminAccount, chain } from '../lib/contract';
import { getAddress } from 'viem';
import { ATTENDANCE_ABI } from '../lib/abi';
import { ADMIN_ROLE } from '../lib/roles';
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

export const relayAddress = relayAccount.address;

/** Native (gas) balance of the relay wallet, in wei. */
export async function getRelayBalanceWei(): Promise<bigint> {
  return publicClient.getBalance({ address: relayAccount.address });
}

export async function setBaseCidOnChain(baseCid: string): Promise<`0x${string}`> {
  if (!defaultAdminWalletClient || !defaultAdminAccount) {
    throw new Error('DEFAULT_ADMIN_PRIVATE_KEY not configured');
  }
  const hash = await defaultAdminWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'setBaseCid',
    args: [baseCid],
    account: defaultAdminAccount,
    chain,
  });
  logger.info({ msg: 'setBaseCid tx submitted', hash, baseCid });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'setBaseCid confirmed', hash, baseCid });
  return hash;
}

export async function grantAdminRoleOnChain(wallet: `0x${string}`): Promise<`0x${string}`> {
  if (!defaultAdminWalletClient || !defaultAdminAccount) {
    throw new Error('DEFAULT_ADMIN_PRIVATE_KEY not configured');
  }
  const checksummed = getAddress(wallet);
  const hash = await defaultAdminWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'grantRole',
    args: [ADMIN_ROLE, checksummed],
    account: defaultAdminAccount,
    chain,
  });
  logger.info({ msg: 'grantRole(ADMIN_ROLE) tx submitted', hash, wallet });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'grantRole(ADMIN_ROLE) confirmed', hash, wallet });
  return hash;
}

export async function revokeAdminRoleOnChain(wallet: `0x${string}`): Promise<`0x${string}`> {
  if (!defaultAdminWalletClient || !defaultAdminAccount) {
    throw new Error('DEFAULT_ADMIN_PRIVATE_KEY not configured');
  }
  const checksummed = getAddress(wallet);
  const hash = await defaultAdminWalletClient.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'revokeRole',
    args: [ADMIN_ROLE, checksummed],
    account: defaultAdminAccount,
    chain,
  });
  logger.info({ msg: 'revokeRole(ADMIN_ROLE) tx submitted', hash, wallet });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: 'revokeRole(ADMIN_ROLE) confirmed', hash, wallet });
  return hash;
}
