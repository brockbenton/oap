'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { getSession, getSessionQR } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { ApiRequestError } from '@/lib/api/client';

export default function AdminSessionQRPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  const { data: session } = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getSession(sessionId, token);
    },
    enabled: authenticated && !!sessionId,
  });

  const {
    data: qrPayload,
    isLoading: loadingQR,
    error: qrError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.sessionQR(sessionId),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getSessionQR(sessionId, token);
    },
    enabled: authenticated && !!sessionId,
    staleTime: Infinity,
    retry: (_n, err) => !(err instanceof ApiRequestError && err.status === 409),
  });

  // Schedule auto-refetch 90s before QR expires
  useEffect(() => {
    if (!qrPayload) return;
    let expiresAt: number;
    try {
      ({ payload: { expiresAt } } = JSON.parse(atob(qrPayload)) as {
        payload: { expiresAt: number };
      });
    } catch {
      return;
    }
    const delay = Math.max(0, expiresAt - 90_000 - Date.now());
    const timer = setTimeout(() => void refetch(), delay);
    return () => clearTimeout(timer);
  }, [qrPayload, refetch]);

  // Live countdown
  useEffect(() => {
    if (!qrPayload) return;
    let expiresAt: number;
    try {
      ({ payload: { expiresAt } } = JSON.parse(atob(qrPayload)) as {
        payload: { expiresAt: number };
      });
    } catch {
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [qrPayload]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/admin/sessions" className="text-gray-500 hover:text-gray-800">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>

        <div className="text-center">
          {session ? (
            <>
              <p className="text-base font-semibold text-gray-900">{session.name}</p>
              <p className="text-xs text-gray-500">
                {formatDate(session.date)} &middot; {session.semester}
              </p>
            </>
          ) : (
            <p className="text-base font-semibold text-gray-900">Check-In QR</p>
          )}
        </div>

        {/* spacer to keep title centered */}
        <div className="w-5" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 space-y-6">
        {loadingQR ? (
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : qrError ? (
          <QRErrorState error={qrError} onRetry={() => void refetch()} />
        ) : qrPayload ? (
          <>
            <div className="p-5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
              <QRCode value={qrPayload} size={320} />
            </div>

            <div className="text-center space-y-2">
              <CountdownLine secondsLeft={secondsLeft} />
              <button
                onClick={() => void refetch()}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Refresh now
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function CountdownLine({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft === null) return null;
  if (secondsLeft > 90) {
    return (
      <p className="text-sm text-gray-500">
        Auto-refreshes in {formatCountdown(secondsLeft)}
      </p>
    );
  }
  if (secondsLeft > 0) {
    return (
      <p className="text-sm text-amber-600 font-medium">Refreshing soon&hellip;</p>
    );
  }
  return (
    <p className="text-sm text-red-600 font-medium">QR expired — refreshing&hellip;</p>
  );
}

interface QRErrorStateProps {
  error: unknown;
  onRetry: () => void;
}

function QRErrorState({ error, onRetry }: QRErrorStateProps) {
  const isClosed =
    error instanceof ApiRequestError &&
    error.status === 409 &&
    error.code === 'CONFLICT';

  return (
    <div className="text-center space-y-3">
      <p className="text-gray-900 font-medium">
        {isClosed
          ? 'This session is closed or not yet confirmed on-chain.'
          : 'Failed to load QR code.'}
      </p>
      {!isClosed && (
        <button onClick={onRetry} className="text-blue-600 text-sm hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
