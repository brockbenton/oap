import 'dotenv/config';
import { isAddress, getAddress } from 'viem';
import { grantAdminRoleOnChain } from '../src/services/relay.service';
import prisma from '../src/lib/prisma';

/**
 * Grants on-chain ADMIN_ROLE to a wallet (usage: `npm run grant-admin -- <0x…>`).
 * Signs with DEFAULT_ADMIN_PRIVATE_KEY, so the contract only permits it when that
 * key holds DEFAULT_ADMIN_ROLE — the gate is enforced on-chain, not here.
 */
async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg || !isAddress(arg)) {
    console.error('Usage: npm run grant-admin -- <0xWalletAddress>');
    process.exit(1);
  }

  const wallet = getAddress(arg);
  console.log(`Granting ADMIN_ROLE to ${wallet} on ${process.env.CONTRACT_ADDRESS} ...`);

  const txHash = await grantAdminRoleOnChain(wallet);
  console.log(`✅ Granted on-chain. tx: ${txHash}`);

  // Mirror into admin_roles so the wallet also shows in the admin Roles page.
  try {
    const normalized = wallet.toLowerCase();
    const existing = await prisma.adminRole.findFirst({
      where: { walletAddress: normalized, revokedAt: null },
    });
    if (!existing) {
      await prisma.adminRole.create({ data: { walletAddress: normalized, grantedBy: 'grant-admin-cli' } });
    }
    console.log('Recorded in admin_roles.');
  } catch (err) {
    console.warn('On-chain grant succeeded but DB record failed:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed to grant admin:', err instanceof Error ? err.message : err);
  console.error(
    'The signing key (DEFAULT_ADMIN_PRIVATE_KEY) must be set and hold DEFAULT_ADMIN_ROLE on the contract.',
  );
  process.exit(1);
});
