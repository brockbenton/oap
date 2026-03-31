import { createPublicClient, createWalletClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';

const chainId = parseInt(process.env.CHAIN_ID ?? '84532');
export const chain: Chain = chainId === 8453 ? base : baseSepolia;

const alchemyNetwork = chainId === 8453 ? 'base-mainnet' : 'base-sepolia';
const rpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const relayAccount = privateKeyToAccount(
  process.env.RELAY_PRIVATE_KEY as `0x${string}`,
);

export const adminAccount = privateKeyToAccount(
  process.env.ADMIN_SIGNER_PRIVATE_KEY as `0x${string}`,
);

export const relayWalletClient = createWalletClient({
  account: relayAccount,
  chain,
  transport: http(rpcUrl),
});

export const adminWalletClient = createWalletClient({
  account: adminAccount,
  chain,
  transport: http(rpcUrl),
});

