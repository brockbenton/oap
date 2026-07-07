import { keccak256, toBytes } from 'viem';

// On-chain AccessControl role identifiers (keccak256 of the role name), shared by
// the relay (grant/revoke) and the admin gate (hasRole read).
export const ADMIN_ROLE = keccak256(toBytes('ADMIN_ROLE'));
export const RELAY_ROLE = keccak256(toBytes('RELAY_ROLE'));
