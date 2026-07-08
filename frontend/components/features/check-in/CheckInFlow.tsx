'use client';

import { useState, useCallback } from 'react';
import { usePrivy, useWallets, useSignMessage, getIdentityToken } from '@privy-io/react-auth';
import { useMutation } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { submitCheckIn } from '@/lib/api/check-in';
import { ApiRequestError } from '@/lib/api/client';
import { CheckInResponse } from '@/types';
import { QrIcon, CheckIcon, ClockIcon, CloseIcon, type IconProps } from '@/components/ui/icons';
import { TOKEN_GRADIENTS } from '@/lib/tokenArt';

// QrScanner accesses browser APIs — load client-side only
const QrScanner = dynamic(() => import('./QrScanner'), { ssr: false });

type CheckInStep = 'scan' | 'signing' | 'submitting' | 'success' | 'error';
type ErrorVariant = 'already-in' | 'closed' | 'invalid';

const VAULT_HREF = '/vault';
const FEED_HREF = '/explore';

const MEETING_EYEBROW = 'Week 8 · Blockchain Club';
const MEETING_TOPIC = 'MEV & Flashbots';
const SCAN_INSTRUCTION = "Point your camera at the QR on the projector to mint today's token.";
const PRIVY_CAPTION = 'Secured by Privy · gas-free mint';
const OPEN_SCANNER_LABEL = 'Open scanner';

const SIGNING_TITLE = 'Waiting for signature…';
const SIGNING_SUB = 'Approve the request in the Privy popup.';
const SUBMITTING_TITLE = 'Minting your token…';
const SUBMITTING_SUB = 'Queuing your attendance token onchain.';

// Sample flair — CheckInResponse carries no XP/streak/edition data
const MINTED_CHIP_LABEL = 'Minted onchain';
const SAMPLE_TOKEN_SHORT = 'MEV';
const SAMPLE_EDITION_LABEL = '#092';
const SAMPLE_DATE_META = 'APR 11, 2026 · Week 8';
const SAMPLE_EDITION_META = 'Edition 92 / 240';
const STREAK_LABEL = '🔥 Streak extended → 8 weeks';
const XP_LABEL = '+180 XP · 720 XP to Level 7';
const ADD_TO_VAULT_LABEL = 'Add to vault';
const SHARE_LABEL = 'Share to feed';
const SESSION_REF_PREFIX = 'Base ↗ #';
const SESSION_REF_MAX = 8;

const SUCCESS_PANEL_BG = 'radial-gradient(120% 90% at 50% 0%,#0b1830 0%,#010304 60%)';
const TOKEN_HERO_OVERLAY = 'radial-gradient(circle at 30% 25%,rgba(255,255,255,.4),transparent 55%)';
const SHEEN_CLASSES =
  'absolute inset-y-0 w-[40%] animate-sheen-fast bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)]';

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
    tileClass: 'bg-status-info-bg text-blue-600',
    title: "You're already in",
    ctaLabel: 'View token',
    href: VAULT_HREF,
  },
  closed: {
    Icon: ClockIcon,
    tileClass: 'bg-status-warn-bg text-yellow-700',
    title: 'Check-in has closed',
    ctaLabel: 'Scan again',
    href: null,
  },
  invalid: {
    Icon: CloseIcon,
    tileClass: 'bg-status-neg-bg text-red-600',
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
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-status-neutral">
          {MEETING_EYEBROW}
        </div>
        <h2 className="mt-2.5 text-[24px] font-semibold leading-[30px] tracking-[-0.5px] text-ink">
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
          <div className="mt-7 h-[200px] w-[200px] rounded-lg border border-line bg-white p-[18px] shadow-elev-sm">
            <svg width="100%" height="100%" viewBox="0 0 100 100" shapeRendering="crispEdges" className="text-ink">
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
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-semibold text-white transition active:scale-[0.98]"
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
          <p className="text-base font-semibold text-ink">{title}</p>
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
    return (
      <div
        className="flex min-h-[600px] flex-col rounded-context p-7 text-white"
        style={{ background: SUCCESS_PANEL_BG }}
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3.5 py-1.5 text-xs font-bold text-green-300">
            <CheckIcon size={14} />
            {MINTED_CHIP_LABEL}
          </div>

          <div className="mt-6 w-[214px] overflow-hidden rounded-[22px] border border-[rgba(173,199,238,0.2)] bg-[#0b0f16] shadow-[0_24px_70px_rgba(0,92,240,0.45)]">
            <div
              className="relative grid h-[150px] place-items-center overflow-hidden"
              style={{ background: TOKEN_GRADIENTS.blue }}
            >
              <div className="absolute inset-0" style={{ background: TOKEN_HERO_OVERLAY }} />
              <div className={SHEEN_CLASSES} />
              <div className="absolute left-4 top-3.5 font-mono text-[15px] font-bold text-white/90">
                {SAMPLE_TOKEN_SHORT}
              </div>
              <div className="font-mono text-5xl font-bold tracking-[-1px] text-white">
                {SAMPLE_EDITION_LABEL}
              </div>
            </div>
            <div className="px-[18px] py-4 text-left">
              <div className="text-base font-semibold leading-[1.2]">{MEETING_TOPIC}</div>
              <div className="mt-2 font-mono text-xs text-[rgba(218,229,247,0.6)]">{SAMPLE_DATE_META}</div>
              <div className="my-3.5 h-px bg-white/10" />
              <div className="flex items-center justify-between font-mono text-[11px] text-[rgba(218,229,247,0.6)]">
                <span>{SAMPLE_EDITION_META}</span>
                <span className="text-cyan">{`${SESSION_REF_PREFIX}${sessionSuffix}`}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-300">
            {STREAK_LABEL}
          </div>
          <div className="mt-3.5 text-[13px] leading-[19px] text-[rgba(218,229,247,0.6)]">{XP_LABEL}</div>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <Link
            href={VAULT_HREF}
            className="flex h-14 items-center justify-center rounded-full bg-cyan text-base font-semibold text-ink transition active:scale-[0.98]"
          >
            {ADD_TO_VAULT_LABEL}
          </Link>
          <Link
            href={FEED_HREF}
            className="flex h-12 items-center justify-center rounded-full bg-white/10 text-[15px] font-semibold text-white transition hover:bg-white/[0.15]"
          >
            {SHARE_LABEL}
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
      <h2 className="mt-5 text-xl font-semibold leading-[26px] tracking-[-0.3px] text-ink">
        {variant.title}
      </h2>
      <p className="mt-2 max-w-[280px] text-sm leading-[21px] text-content-secondary">{errorMessage}</p>
      {variant.href ? (
        <Link
          href={variant.href}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-white transition active:scale-[0.98]"
        >
          {variant.ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-white transition active:scale-[0.98]"
        >
          {variant.ctaLabel}
        </button>
      )}
    </div>
  );
}
