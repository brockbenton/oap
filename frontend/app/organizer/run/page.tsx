'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { getAdminMe, listAdminSessions, getSessionQR } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import { useLiveMeeting } from '@/lib/mock/meeting';
import { Avatar, Button, Card, MonoNum } from '@/components/ui';
import type { RosterEntry, SessionWithCount } from '@/types';

// Club handle/slug is not modelled in the backend yet — sample metadata for the check-in URL caption.
const SAMPLE_CLUB_SLUG = 'blockchain-club';
const CHECKIN_URL_BASE = 'oap.xyz/c';
const QR_CAPTION_SUFFIX = 'code expires when meeting ends';

const LIVE_LABEL = 'Meeting live';
const SCAN_COPY = 'Scan to check in & mint your token';
const ROSTER_HEADER = 'Just checked in';
const PAUSE_LABEL = 'Pause check-in';
const END_LABEL = 'End meeting';
const ACCESS_TITLE = 'Organizer access required';
const ACCESS_BODY = 'Sign in with an organizer account to run a meeting.';

const NOW_THRESHOLD_SECONDS = 10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const QR_PANEL_SIZE = 280;
const QR_INNER_SIZE = 232;
const ROSTER_AVATAR_SIZE = 32;

// Placeholder QR artwork from the design frame — shown when no live session QR is available.
const QR_COLOR = '#010304';
const QR_MODULE_SIZE = 6;
const QR_FINDER_SIZE = 28;
const QR_FINDER_STROKE = 8;
const QR_FINDER_DOT_OFFSET = 10;
const QR_FINDER_DOT_SIZE = 8;
const QR_FINDER_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [72, 0],
  [0, 72],
];
const QR_MODULE_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [40, 4], [52, 4], [40, 16], [60, 16], [4, 40], [16, 40], [40, 40], [52, 46],
  [64, 40], [76, 40], [88, 46], [4, 60], [28, 52], [40, 64], [52, 60], [72, 60],
  [88, 64], [40, 76], [52, 88], [64, 76], [76, 88], [88, 76],
];

function formatElapsed(total: number): string {
  const h = Math.floor(total / SECONDS_PER_HOUR);
  const m = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const s = total % SECONDS_PER_MINUTE;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatAgo(seconds: number): string {
  if (seconds < NOW_THRESHOLD_SECONDS) return 'now';
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m`;
}

function pickActiveSession(sessions: SessionWithCount[]): SessionWithCount | null {
  if (!sessions.length) return null;
  const open = sessions.filter((s) => s.onchainStatus === 'CONFIRMED' && !s.closedAt);
  const pool = open.length ? open : sessions;
  return (
    [...pool].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  );
}

export default function OrganizerRunMeetingPage() {
  const { ready, authenticated, user } = usePrivy();
  const [elapsed, setElapsed] = useState<number | null>(null);

  const { data: meeting } = useLiveMeeting();

  const {
    data: me,
    isLoading: meLoading,
    error: meError,
  } = useQuery({
    queryKey: queryKeys.adminMe(user?.id),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminMe(token);
    },
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
    staleTime: 0,
    gcTime: 0,
  });

  const isAdmin = me?.isAdmin === true;

  const { data: sessions } = useQuery({
    queryKey: queryKeys.adminSessions(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminSessions(token);
    },
    enabled: isAdmin,
    retry: retryUnlessForbidden,
  });

  const activeSession = useMemo(
    () => (sessions ? pickActiveSession(sessions) : null),
    [sessions],
  );

  const { data: qrPayload } = useQuery({
    queryKey: queryKeys.sessionQR(activeSession?.sessionId ?? ''),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getSessionQR(activeSession!.sessionId, token);
    },
    enabled: isAdmin && !!activeSession,
    staleTime: Infinity,
    retry: (count, err) => !(err instanceof ApiRequestError && err.status === 409) && count < 2,
  });

  useEffect(() => {
    if (meeting?.elapsedSeconds == null) return;
    setElapsed(meeting.elapsedSeconds);
    const id = setInterval(() => setElapsed((s) => (s == null ? s : s + 1)), 1000);
    return () => clearInterval(id);
  }, [meeting?.elapsedSeconds]);

  if (!ready || (authenticated && meLoading)) {
    return <FullScreenSpinner />;
  }

  const forbidden = meError instanceof ApiRequestError && meError.status === 403;
  if (!authenticated || forbidden || !isAdmin) {
    return <AccessGate />;
  }

  if (!meeting) {
    return <FullScreenSpinner />;
  }

  const clockValue = formatElapsed(elapsed ?? meeting.elapsedSeconds);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex h-14 items-center gap-3 border-b border-line px-4 sm:px-7">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>
            {LIVE_LABEL} · <MonoNum>{clockValue}</MonoNum>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="outline" className="h-[38px] px-[18px] text-[13px]">
            {PAUSE_LABEL}
          </Button>
          <button
            type="button"
            className="inline-flex h-[38px] items-center justify-center rounded-full bg-red-500 px-[18px] text-[13px] font-semibold text-white transition duration-200 hover:bg-red-600 active:scale-[0.98]"
          >
            {END_LABEL}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <section
          className="flex flex-col items-center justify-center border-b border-line px-6 py-12 text-center sm:px-10 lg:border-b-0 lg:border-r"
          style={{ background: 'radial-gradient(120% 100% at 50% 0%, #f2f7fe, #fff 60%)' }}
        >
          <div className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-status-neutral">
            Week {meeting.week} · {meeting.club}
          </div>
          <h1 className="mb-2 text-[34px] font-semibold leading-[40px] tracking-[-1px] text-ink">
            {meeting.topic}
          </h1>
          <p className="mb-7 max-w-md text-[16px] leading-[24px] text-content-secondary">
            {SCAN_COPY}
          </p>

          <div
            className="rounded-context border border-line bg-white p-6 shadow-elev-md"
            style={{ width: QR_PANEL_SIZE, height: QR_PANEL_SIZE }}
          >
            {qrPayload ? (
              <QRCode value={qrPayload} size={QR_INNER_SIZE} />
            ) : (
              <PlaceholderQR />
            )}
          </div>

          <div className="mt-[22px] font-mono text-[13px] font-medium text-content-secondary">
            {CHECKIN_URL_BASE}/{SAMPLE_CLUB_SLUG} · {QR_CAPTION_SUFFIX}
          </div>
        </section>

        <section className="flex flex-col px-7 py-8">
          <div className="mb-5 rounded-card bg-ink p-5 text-center text-white">
            <MonoNum className="block text-[56px] font-bold leading-none tracking-[-2px] text-cyan">
              {meeting.checkedIn}
            </MonoNum>
            <div className="mt-2 text-[13px] font-medium text-[rgba(218,229,247,0.7)]">
              checked in of {meeting.totalMembers} members
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
            <span className="h-[7px] w-[7px] rounded-full bg-green-500" />
            {ROSTER_HEADER}
          </div>

          <div className="flex-1 overflow-y-auto">
            {meeting.roster.map((entry) => (
              <RosterRow key={entry.handle} entry={entry} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  const isNow = entry.secondsAgo < NOW_THRESHOLD_SECONDS;
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <Avatar seed={entry.avatarSeed} label={entry.handle} size={ROSTER_AVATAR_SIZE} />
      <span className="flex-1 truncate text-[14px] font-semibold text-ink">{entry.handle}</span>
      <MonoNum
        className={`text-[11px] font-medium ${isNow ? 'text-green-600' : 'text-content-secondary'}`}
      >
        {formatAgo(entry.secondsAgo)}
      </MonoNum>
    </div>
  );
}

function PlaceholderQR() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" shapeRendering="crispEdges" aria-hidden>
      {QR_FINDER_ORIGINS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x}
            y={y}
            width={QR_FINDER_SIZE}
            height={QR_FINDER_SIZE}
            fill="none"
            stroke={QR_COLOR}
            strokeWidth={QR_FINDER_STROKE}
          />
          <rect
            x={x + QR_FINDER_DOT_OFFSET}
            y={y + QR_FINDER_DOT_OFFSET}
            width={QR_FINDER_DOT_SIZE}
            height={QR_FINDER_DOT_SIZE}
            fill={QR_COLOR}
          />
        </g>
      ))}
      <g fill={QR_COLOR}>
        {QR_MODULE_ORIGINS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={QR_MODULE_SIZE} height={QR_MODULE_SIZE} />
        ))}
      </g>
    </svg>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
    </div>
  );
}

function AccessGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <Card className="w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-lg font-semibold text-ink">{ACCESS_TITLE}</h1>
        <p className="text-sm text-content-secondary">{ACCESS_BODY}</p>
        <Link href="/" className="inline-block text-sm font-medium text-blue-500 hover:underline">
          Back to app
        </Link>
      </Card>
    </div>
  );
}
