'use client';

import { useState, useCallback } from 'react';
import { usePrivy, useWallets, useSignMessage, getIdentityToken } from '@privy-io/react-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { submitCheckIn } from '@/lib/api/check-in';
import { getMemberVault } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { ApiRequestError } from '@/lib/api/client';
import { useEmbeddedAddress } from '@/hooks/useProfile';
import { CheckInResponse, VaultToken } from '@/types';
import { QrIcon, CheckIcon, ClockIcon, CloseIcon, type IconProps } from '@/components/ui/icons';
import { TOKEN_COLORS, colorNameForTopic, inkOn } from '@/lib/tokenArt';
import { CLUB_NAME } from '@/lib/constants';

// QrScanner accesses browser APIs — load client-side only
const QrScanner = dynamic(() => import('./QrScanner'), { ssr: false });

type CheckInStep = 'scan' | 'signing' | 'submitting' | 'success' | 'error';
type ErrorVariant = 'already-in' | 'closed' | 'invalid';

const VAULT_HREF = '/vault';

// The meeting is only identified once the QR is decoded, so the scan screen
// can't name it — it stays generic until there's a real session to show.
const MEETING_EYEBROW = CLUB_NAME;
const MEETING_TOPIC = 'Check in to this meeting';
const SCAN_INSTRUCTION = "Point your camera at the QR on the projector to mint today's token.";
const PRIVY_CAPTION = 'Secured by Privy · gas-free mint';
const OPEN_SCANNER_LABEL = 'Open scanner';

const SIGNING_TITLE = 'Waiting for signature…';
const SIGNING_SUB = 'Approve the request in the Privy popup.';
const SUBMITTING_TITLE = 'Minting your token…';
const SUBMITTING_SUB = 'Queuing your attendance token onchain.';

// The mint is queued, not yet confirmed, when this screen first renders — the
// chip reflects the token's real mint status rather than claiming success.
const MINTED_CHIP_LABEL = '> token minted ✓';
const QUEUED_CHIP_LABEL = '> minting token…';
const TOKEN_CARD_FALLBACK = 'Your token';
const TOKEN_SHORT_MAX = 4;
const EDITION_PAD = 3;
// The token is already in the vault — the button navigates, it doesn't add.
const ADD_TO_VAULT_LABEL = 'View in vault';
const SESSION_REF_PREFIX = 'Session #';
const SESSION_REF_MAX = 8;
const MINT_POLL_MS = 4000;
const TOKEN_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function findMintedToken(
  tokens: VaultToken[] | undefined,
  sessionId: string | undefined,
): VaultToken | undefined {
  if (!tokens || !sessionId) return undefined;
  return tokens.find((t) => t.sessionIdOnchain === sessionId);
}

function formatTokenDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', TOKEN_DATE_FORMAT);
}


interface ErrorVariantConfig {
  Icon: (props: IconProps) => JSX.Element;
  tileClass: string;
  title: string;
  ctaLabel: string;
  href: string | null;
}

const ERROR_VARIANT_CONFIG: Record<ErrorVariant, ErrorVariantConfig> = {
  'already-in': {
    Icon: CheckIcon,
    tileClass: 'bg-status-info-bg text-cyan',
    title: "You're already in",
    ctaLabel: 'View token',
    href: VAULT_HREF,
  },
  closed: {
    Icon: ClockIcon,
    tileClass: 'bg-status-warn-bg text-status-warn',
    title: 'Check-in has closed',
    ctaLabel: 'Scan again',
    href: null,
  },
  invalid: {
    Icon: CloseIcon,
    tileClass: 'bg-status-neg-bg text-status-neg',
    title: 'Code not recognized',
    ctaLabel: 'Scan again',
    href: null,
  },
};

interface CheckInFlowProps {
  onRestart: () => void;
}

export default function CheckInFlow({ onRestart }: CheckInFlowProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const [step, setStep] = useState<CheckInStep>('scan');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('invalid');
  const [result, setResult] = useState<CheckInResponse | null>(null);

  // The check-in row exists the moment the API returns, so the vault is the
  // source for what was actually minted — name, date and meeting number.
  // It re-polls while the mint is still PENDING so the chip flips on confirm.
  const address = useEmbeddedAddress();
  const { data: vault } = useQuery({
    queryKey: queryKeys.memberVault(address ?? ''),
    queryFn: () => getMemberVault(address!),
    enabled: step === 'success' && !!address,
    refetchInterval: (query) =>
      findMintedToken(query.state.data?.tokens, result?.sessionId)?.mintStatus === 'CONFIRMED'
        ? false
        : MINT_POLL_MS,
  });
  const mintedToken = findMintedToken(vault?.tokens, result?.sessionId);

  const { mutate: processCheckIn } = useMutation({
    mutationFn: async (qrPayload: string) => {
      // 1. Get the member's embedded wallet address
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const walletAddress = embeddedWallet?.address ?? user?.wallet?.address;
      if (!walletAddress) {
        throw new Error('No wallet linked to your account. Please sign out and sign in again.');
      }

      const normalizedAddress = walletAddress.toLowerCase();

      // 2. Get the identity token for backend auth
      const token = await getIdentityToken();
      if (!token) {
        throw new Error('Failed to get authentication token. Please sign out and try again.');
      }

      // 3. Decode QR to get sessionId (for the message to sign)
      // Decode QR payload and validate sessionId format (numeric string, as stored on-chain)
      let sessionId: string;
      try {
        const decoded = JSON.parse(atob(qrPayload)) as { payload: { sessionId: unknown } };
        const raw = decoded.payload.sessionId;
        if (typeof raw !== 'string' || !/^\d+$/.test(raw) || raw.length > 78) {
          throw new Error('Invalid session ID in QR code.');
        }
        sessionId = raw;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Invalid QR code format.');
      }

      // 4. Sign the check-in message
      setStep('signing');
      const signedAt = Date.now();
      const message = `I am checking into session ${sessionId} as ${normalizedAddress} at ${signedAt}`;

      const { signature } = await signMessage(
        { message },
        {
          uiOptions: {
            title: 'Confirm Check-In',
            description: `Sign to confirm attendance for session ${sessionId}`,
            buttonText: 'Sign & Check In',
          },
        },
      );

      // 5. Submit to backend
      setStep('submitting');
      return submitCheckIn({
        qrPayload,
        memberSignature: signature as `0x${string}`,
        signedAt,
        token,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('success');
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        switch (err.code) {
          case 'ALREADY_CHECKED_IN':
            setErrorMessage('You already checked in to this session.');
            setErrorVariant('already-in');
            break;
          case 'INVALID_QR':
            setErrorMessage('This QR code is invalid or has expired. Ask the admin to regenerate it.');
            setErrorVariant('invalid');
            break;
          case 'SESSION_CLOSED':
            setErrorMessage('This session is already closed.');
            setErrorVariant('closed');
            break;
          case 'STALE_SIGNATURE':
            setErrorMessage('Your signature timed out. Please try again.');
            setErrorVariant('invalid');
            break;
          default:
            setErrorMessage(err.message.slice(0, 200));
            setErrorVariant('invalid');
        }
      } else {
        setErrorMessage((err instanceof Error ? err.message : 'Something went wrong. Please try again.').slice(0, 200));
        setErrorVariant('invalid');
      }
      setStep('error');
    },
  });

  const handleScan = useCallback(
    (qrPayload: string) => {
      if (step !== 'scan') return;
      setStep('signing');
      processCheckIn(qrPayload);
    },
    [step, processCheckIn],
  );

  const handleScanError = useCallback((error: string) => {
    setErrorMessage(`Camera error: ${error}`);
    setErrorVariant('invalid');
    setStep('error');
  }, []);

  if (step === 'scan') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="font-mono text-xs text-status-neutral">
          {MEETING_EYEBROW}
        </div>
        <h2 className="mt-2.5 text-[24px] font-medium leading-[30px] text-content">
          {MEETING_TOPIC}
        </h2>
        <p className="mt-1.5 max-w-[280px] text-sm leading-5 text-content-secondary">
          {SCAN_INSTRUCTION}
        </p>

        {scannerOpen ? (
          <div className="mt-7 w-full">
            <QrScanner onScan={handleScan} onError={handleScanError} />
          </div>
        ) : (
          <div className="mt-7 h-[200px] w-[200px] rounded-lg border border-line bg-surface p-[18px]">
            <svg width="100%" height="100%" viewBox="0 0 100 100" shapeRendering="crispEdges" className="text-content">
              <rect x="0" y="0" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="8" />
              <rect x="10" y="10" width="8" height="8" fill="currentColor" />
              <rect x="72" y="0" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="8" />
              <rect x="82" y="10" width="8" height="8" fill="currentColor" />
              <rect x="0" y="72" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="8" />
              <rect x="10" y="82" width="8" height="8" fill="currentColor" />
              <g fill="currentColor">
                <rect x="40" y="4" width="6" height="6" />
                <rect x="52" y="4" width="6" height="6" />
                <rect x="40" y="16" width="6" height="6" />
                <rect x="60" y="16" width="6" height="6" />
                <rect x="4" y="40" width="6" height="6" />
                <rect x="16" y="40" width="6" height="6" />
                <rect x="40" y="40" width="6" height="6" />
                <rect x="52" y="46" width="6" height="6" />
                <rect x="64" y="40" width="6" height="6" />
                <rect x="76" y="40" width="6" height="6" />
                <rect x="88" y="46" width="6" height="6" />
                <rect x="4" y="60" width="6" height="6" />
                <rect x="28" y="52" width="6" height="6" />
                <rect x="40" y="64" width="6" height="6" />
                <rect x="52" y="60" width="6" height="6" />
                <rect x="72" y="60" width="6" height="6" />
                <rect x="88" y="64" width="6" height="6" />
                <rect x="40" y="76" width="6" height="6" />
                <rect x="52" y="88" width="6" height="6" />
                <rect x="64" y="76" width="6" height="6" />
                <rect x="76" y="88" width="6" height="6" />
                <rect x="88" y="76" width="6" height="6" />
              </g>
            </svg>
          </div>
        )}

        <p className="mt-5 font-mono text-xs text-content-secondary">{PRIVY_CAPTION}</p>

        {!scannerOpen && (
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded bg-green text-base font-medium text-canvas transition-colors hover:bg-green-dim"
          >
            <QrIcon size={18} />
            {OPEN_SCANNER_LABEL}
          </button>
        )}
      </div>
    );
  }

  if (step === 'signing' || step === 'submitting') {
    const title = step === 'signing' ? SIGNING_TITLE : SUBMITTING_TITLE;
    const sub = step === 'signing' ? SIGNING_SUB : SUBMITTING_SUB;
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-line border-t-ink" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-content">{title}</p>
          <p className="text-sm text-content-secondary">{sub}</p>
        </div>
      </div>
    );
  }

  if (step === 'success' && result) {
    const sessionSuffix =
      result.sessionId.length > SESSION_REF_MAX
        ? `${result.sessionId.slice(0, SESSION_REF_MAX)}…`
        : result.sessionId;
    const confirmed = mintedToken?.mintStatus === 'CONFIRMED';
    const topic = mintedToken?.name ?? TOKEN_CARD_FALLBACK;
    const shortLabel = topic.slice(0, TOKEN_SHORT_MAX).toUpperCase();
    const editionLabel = mintedToken
      ? `#${String(mintedToken.meetingNumber).padStart(EDITION_PAD, '0')}`
      : '#-';
    const dateMeta = mintedToken
      ? `${formatTokenDate(mintedToken.date)} · Meeting ${mintedToken.meetingNumber}`
      : '';
    const heroGradient = mintedToken
      ? TOKEN_COLORS[colorNameForTopic(mintedToken.name)]
      : TOKEN_COLORS.blue;
    return (
      <div
        className="flex min-h-[600px] flex-col rounded-context p-7 text-content"
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className={
              confirmed
                ? 'inline-flex items-center gap-1.5 rounded border border-green/40 px-3 py-1.5 font-mono text-xs text-status-pos'
                : 'inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 font-mono text-xs text-content-secondary'
            }
          >
            {confirmed ? <CheckIcon size={14} /> : <ClockIcon size={14} />}
            {confirmed ? MINTED_CHIP_LABEL : QUEUED_CHIP_LABEL}
          </div>

          <div className="mt-6 w-[214px] overflow-hidden rounded border border-line bg-surface">
            <div
              className="relative grid h-[150px] place-items-center overflow-hidden"
              style={{ background: heroGradient, color: inkOn(heroGradient) }}
            >
              <div className="absolute left-4 top-3.5 font-mono text-[15px] font-bold">
                {shortLabel}
              </div>
              <div className="font-mono text-5xl font-bold">
                {editionLabel}
              </div>
            </div>
            <div className="px-[18px] py-4 text-left">
              <div className="text-base font-semibold leading-[1.2]">{topic}</div>
              {dateMeta && (
                <div className="mt-2 font-mono text-xs text-content-secondary">{dateMeta}</div>
              )}
              <div className="my-3.5 h-px bg-raised" />
              <div className="flex items-center justify-between font-mono text-[11px] text-content-secondary">
                <span>{mintedToken?.semester ?? ''}</span>
                <span className="text-green">{`${SESSION_REF_PREFIX}${sessionSuffix}`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <Link
            href={VAULT_HREF}
            className="flex h-14 items-center justify-center rounded bg-green text-base font-semibold text-canvas transition"
          >
            {ADD_TO_VAULT_LABEL}
          </Link>
        </div>
      </div>
    );
  }

  const variant = ERROR_VARIANT_CONFIG[errorVariant];
  const { Icon } = variant;
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className={`grid h-16 w-16 place-items-center rounded-tile ${variant.tileClass}`}>
        <Icon size={30} />
      </div>
      <h2 className="mt-5 text-xl font-medium leading-[26px] text-content">
        {variant.title}
      </h2>
      <p className="mt-2 max-w-[280px] text-sm leading-[21px] text-content-secondary">{errorMessage}</p>
      {variant.href ? (
        <Link
          href={variant.href}
          className="mt-6 flex h-12 w-full items-center justify-center rounded bg-green text-[15px] font-medium text-canvas transition-colors hover:bg-green-dim"
        >
          {variant.ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 flex h-12 w-full items-center justify-center rounded bg-green text-[15px] font-medium text-canvas transition-colors hover:bg-green-dim"
        >
          {variant.ctaLabel}
        </button>
      )}
    </div>
  );
}
