import { type Address } from 'viem';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export function getContractAddress(): Address {
  return requireEnv('NEXT_PUBLIC_CONTRACT_ADDRESS') as Address;
}
