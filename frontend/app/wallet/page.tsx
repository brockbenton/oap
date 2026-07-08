'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { usePrivy, useConnectWallet, useExportWallet, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import PageContainer from '@/components/shared/PageContainer';
import { Avatar, Button, Card, CopyChip } from '@/components/ui';
import { ExternalLinkIcon, PlusIcon } from '@/components/ui/icons';
import { useProfile, useEmbeddedAddress, useDisplayName } from '@/hooks/useProfile';
import { shortenAddress } from '@/lib/address';
import { BASESCAN_URL } from '@/lib/constants';

const PAGE_TITLE = 'Wallet & keys';

const AVATAR_SIZE = 64;
const EXTERNAL_LINK_ICON_SIZE = 14;
const BUTTON_ICON_SIZE = 16;

// useEmbeddedAddress falls back to this seed when no wallet is resolved yet, so
// the avatar stays deterministic instead of flashing a different color.
const AVATAR_SEED_FALLBACK = 'account';

// Privy tags the managed embedded wallet with this client type; everything else
// is an external wallet the member linked (MetaMask, etc.).
const EMBEDDED_WALLET_CLIENT_TYPE = 'privy';

const EMBEDDED_TITLE = 'Embedded wallet';
const EMBEDDED_DESC = 'The self-custodial wallet OAP created for you. It holds your attendance tokens.';
const BASESCAN_LABEL = 'View on Basescan';
const EXPORT_KEY_LABEL = 'Export private key';
const EXPORT_KEY_WARNING = 'Anyone with your private key controls this wallet — never share it.';

const CONNECTED_TITLE = 'Connected wallets';
const CONNECTED_DESC = 'Link an external wallet to sign in and interact with it too.';
const CONNECT_LABEL = 'Connect a wallet';
const UNLINK_LABEL = 'Unlink';
const CONNECTED_EMPTY = 'No external wallets connected.';
const CONNECTED_CAPTION =
  "Supports EVM wallets like MetaMask. Solana wallets (e.g. Phantom) aren't supported yet.";

const EXTERNAL_LINK_CLASSES =
  'inline-flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-content-secondary';

export default function WalletPage() {
  const { ready, authenticated, unlinkWallet } = usePrivy();
  const router = useRouter();
  const address = useEmbeddedAddress();
  const displayName = useDisplayName();
  const { data: profile } = useProfile();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { exportWallet } = useExportWallet();

  useEffect(() => {
    if (ready && !authenticated) router.replace('/');
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) return <FullPageSpinner />;

  const externalWallets = wallets.filter((w) => w.walletClientType !== EMBEDDED_WALLET_CLIENT_TYPE);

  const onExport = () => {
    if (address) void exportWallet({ address });
  };

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <MemberTopNav />
      <PageContainer className="pt-8 pb-24 md:pb-8">
        <h1 className="mb-6 text-[30px] font-semibold leading-9 tracking-[-1px]">{PAGE_TITLE}</h1>

        <div className="mb-6 flex items-center gap-4">
          <Avatar
            seed={address ?? AVATAR_SEED_FALLBACK}
            label={displayName}
            colorIndex={profile?.avatarColor ?? undefined}
            size={AVATAR_SIZE}
          />
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold">{displayName}</div>
            {address && (
              <div className="mt-1 font-mono text-xs text-content-secondary">{shortenAddress(address)}</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-[17px] font-semibold">{EMBEDDED_TITLE}</h2>
            <p className="mt-1 text-sm text-content-secondary">{EMBEDDED_DESC}</p>

            <div className="mt-5 max-w-md space-y-4">
              {address && <CopyChip value={address} display={shortenAddress(address)} />}
              {address && (
                <a
                  href={`${BASESCAN_URL}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EXTERNAL_LINK_CLASSES}
                >
                  {BASESCAN_LABEL}
                  <ExternalLinkIcon size={EXTERNAL_LINK_ICON_SIZE} />
                </a>
              )}
              <div>
                <Button variant="outline" onClick={onExport} disabled={!address}>
                  {EXPORT_KEY_LABEL}
                </Button>
                <p className="mt-2 text-xs text-content-secondary">{EXPORT_KEY_WARNING}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-[17px] font-semibold">{CONNECTED_TITLE}</h2>
            <p className="mt-1 text-sm text-content-secondary">{CONNECTED_DESC}</p>

            <div className="mt-5 max-w-md space-y-4">
              {externalWallets.length === 0 ? (
                <p className="text-sm text-content-secondary">{CONNECTED_EMPTY}</p>
              ) : (
                <ul className="space-y-2">
                  {externalWallets.map((w) => (
                    <li
                      key={w.address}
                      className="flex items-center justify-between rounded-md border border-line px-3 py-2"
                    >
                      <span className="font-mono text-sm">{shortenAddress(w.address)}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void unlinkWallet(w.address)}
                      >
                        {UNLINK_LABEL}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <Button variant="outline" onClick={() => connectWallet()}>
                <PlusIcon size={BUTTON_ICON_SIZE} />
                {CONNECT_LABEL}
              </Button>

              <p className="text-xs text-content-secondary">{CONNECTED_CAPTION}</p>
            </div>
          </Card>
        </div>
      </PageContainer>
      <MobileTabBar />
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfc]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
    </div>
  );
}
