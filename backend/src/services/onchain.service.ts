import { getAddress } from 'viem';
import { publicClient } from '../lib/contract';
import { ATTENDANCE_ABI } from '../lib/abi';
import { ADMIN_ROLE } from '../lib/roles';

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;

/** On-chain source of truth for admin authorization (AccessControl.hasRole). */
export async function hasAdminRoleOnChain(wallet: string): Promise<boolean> {
  return publicClient.readContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'hasRole',
    args: [ADMIN_ROLE, getAddress(wallet)],
  }) as Promise<boolean>;
}

/** ERC-1155 balance of a member for a session token — used to reconcile mints. */
export async function tokenBalanceOnChain(
  member: `0x${string}`,
  sessionIdOnchain: string,
): Promise<bigint> {
  return publicClient.readContract({
    address: contractAddress,
    abi: ATTENDANCE_ABI,
    functionName: 'balanceOf',
    args: [getAddress(member), BigInt(sessionIdOnchain)],
  }) as Promise<bigint>;
}
