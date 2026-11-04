import { publicClient, adminWalletClient, relayWalletClient, adminAccount, relayAccount, defaultAdminWalletClient, defaultAdminAccount, chain } from '../lib/contract';
import { getAddress } from 'viem';
import { ATTENDANCE_ABI } from '../lib/abi';
import { ADMIN_ROLE } from '../lib/roles';
import logger from '../lib/logger';

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;

/** Logs a submitted tx and waits for its receipt. */
async function confirmTx(
  action: string,
  hash: `0x${string}`,
  context: Record<string, unknown>,
): Promise<`0x${string}`> {
  logger.info({ msg: `${action} tx submitted`, hash, ...context });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  logger.info({ msg: `${action} confirmed`, hash, ...context });
  return hash;
}

function requireDefaultAdmin() {
  if (!defaultAdminWalletClient || !defaultAdminAccount) {
    throw new Error('DEFAULT_ADMIN_PRIVATE_KEY not configured');
  }
  return { client: defaultAdminWalletClient, account: defaultAdminAccount };
}

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

  return confirmTx('createSession', hash, { sessionIdOnchain });
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

  return confirmTx('closeSession', hash, { sessionIdOnchain });
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

  return confirmTx('mint', hash, { to, sessionIdOnchain });
}

export const relayAddress = relayAccount.address;

/** Native (gas) balance of the relay wallet, in wei. */
export async function getRelayBalanceWei(): Promise<bigint> {
  return publicClient.getBalance({ address: relayAccount.address });
}

export async function setBaseCidOnChain(baseCid: string): Promise<`0x${string}`> {
  const { client, account } = requireDefaultAdmin();
  const hash = await client.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'setBaseCid',
    args: [baseCid],
    account,
    chain,
  });
  return confirmTx('setBaseCid', hash, { baseCid });
}

export async function grantAdminRoleOnChain(wallet: `0x${string}`): Promise<`0x${string}`> {
  const { client, account } = requireDefaultAdmin();
  const checksummed = getAddress(wallet);
  const hash = await client.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'grantRole',
    args: [ADMIN_ROLE, checksummed],
    account,
    chain,
  });
  return confirmTx('grantRole(ADMIN_ROLE)', hash, { wallet });
}

export async function revokeAdminRoleOnChain(wallet: `0x${string}`): Promise<`0x${string}`> {
  const { client, account } = requireDefaultAdmin();
  const checksummed = getAddress(wallet);
  const hash = await client.writeContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'revokeRole',
    args: [ADMIN_ROLE, checksummed],
    account,
    chain,
  });
  return confirmTx('revokeRole(ADMIN_ROLE)', hash, { wallet });
}
