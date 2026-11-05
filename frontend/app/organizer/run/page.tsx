'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import {
  getAdminMe,
  getAdminOverview,
  getSessionAttendees,
  getSessionQR,
  listAdminSessions,
} from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import { shortenAddress } from '@/lib/address';
import { CLUB_NAME } from '@/lib/constants';
import LoadError from '@/components/shared/LoadError';
import { Avatar, Button, Card, MonoNum } from '@/components/ui';
import type { Attendee, SessionWithCount } from '@/types';

const QR_CAPTION = 'Code expires when meeting ends';
const QR_UNAVAILABLE = 'QR unavailable';

const LIVE_LABEL = 'Meeting live';
const SCAN_COPY = 'Scan to check in & mint your token';
const ROSTER_HEADER = 'Just checked in';
const PAUSE_LABEL = 'Pause check-in';
const END_LABEL = 'End meeting';
const ACCESS_TITLE = 'Organizer access required';
const ACCESS_BODY = 'Sign in with an organizer account to run a meeting.';
const NO_MEETING_TITLE = 'No meeting running';
const NO_MEETING_BODY = 'Create a session from the admin dashboard, then come back to show the QR.';
const SESSIONS_ROUTE = '/admin/sessions';

const NOW_THRESHOLD_SECONDS = 10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const QR_PANEL_SIZE = 280;
const QR_INNER_SIZE = 232;
const ROSTER_AVATAR_SIZE = 32;
const ROSTER_REFRESH_MS = 5000;
const MS_PER_SECOND = 1000;

function formatElapsed(total: number): string {
  const h = Math.floor(total / SECONDS_PER_HOUR);
  const m = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const s = total % SECONDS_PER_MINUTE;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function secondsSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / MS_PER_SECOND));
}

function formatAgo(seconds: number): string {
  if (seconds < NOW_THRESHOLD_SECONDS) return 'now';
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m`;
}

function pickActiveSession(sessions: SessionWithCount[]): SessionWithCount | null {
  const open = sessions.filter((s) => s.onchainStatus === 'CONFIRMED' && !s.closedAt);
  return (
    open.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  );
}

export default function OrganizerRunMeetingPage() {
  const { ready, authenticated, user } = usePrivy();
  const [now, setNow] = useState(() => Date.now());

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

  const {
    data: sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
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

  const { data: qrPayload, isError: qrError } = useQuery({
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

  const { data: attendees } = useQuery({
    queryKey: queryKeys.sessionAttendees(activeSession?.sessionId ?? ''),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getSessionAttendees(activeSession!.sessionId, token);
    },
    enabled: isAdmin && !!activeSession,
    refetchInterval: ROSTER_REFRESH_MS,
    retry: retryUnlessForbidden,
  });

  const { data: overview } = useQuery({
    queryKey: queryKeys.adminOverview(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminOverview(token);
    },
    enabled: isAdmin,
    retry: retryUnlessForbidden,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MS_PER_SECOND);
    return () => clearInterval(id);
  }, []);

  if (!ready || (authenticated && meLoading)) {
    return <FullScreenSpinner />;
  }

  const forbidden = meError instanceof ApiRequestError && meError.status === 403;
  if (!authenticated || forbidden || !isAdmin) {
    return <AccessGate />;
  }

  if (sessionsLoading) {
    return <FullScreenSpinner />;
  }

  if (sessionsError) {
    return <LoadError what="meeting" onRetry={() => void refetchSessions()} />;
  }

  if (!activeSession) {
    return <NoMeeting />;
  }

  const clockValue = formatElapsed(secondsSince(activeSession.date, now));
  const roster = [...(attendees ?? [])].reverse();

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="flex h-14 items-center gap-3 border-b border-line px-4 sm:px-7">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-status-pos">
          <span className="h-2 w-2 rounded-full bg-green" />
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
            className="inline-flex h-[38px] items-center justify-center rounded bg-red px-[18px] text-[13px] font-semibold text-canvas transition duration-200 hover:bg-red/90"
          >
            {END_LABEL}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <section
          className="flex flex-col items-center justify-center border-b border-line px-6 py-12 text-center sm:px-10 lg:border-b-0 lg:border-r"
        >
          <div className="mb-3 font-mono text-[12px] font-medium text-status-neutral">
            {activeSession.semester} · {CLUB_NAME}
          </div>
          <h1 className="mb-2 text-[34px] font-medium leading-[40px] text-content">
            {activeSession.name}
          </h1>
          <p className="mb-7 max-w-md text-[16px] leading-[24px] text-content-secondary">
            {SCAN_COPY}
          </p>

          <div
            className="rounded-context border border-line bg-white p-6"
            style={{ width: QR_PANEL_SIZE, height: QR_PANEL_SIZE }}
          >
            {qrPayload ? (
              <QRCode value={qrPayload} size={QR_INNER_SIZE} />
            ) : (
              <div className="grid h-full place-items-center">
                {qrError ? (
                  <span className="text-[13px] text-content-secondary">{QR_UNAVAILABLE}</span>
                ) : (
                  <Spinner />
                )}
              </div>
            )}
          </div>

          <div className="mt-[22px] font-mono text-[13px] font-medium text-content-secondary">
            {QR_CAPTION}
          </div>
        </section>

        <section className="flex flex-col px-7 py-8">
          <div className="mb-5 rounded-card bg-raised p-5 text-center text-content">
            <MonoNum className="block text-[56px] font-bold leading-none text-green">
              {attendees?.length ?? activeSession.attendeeCount}
            </MonoNum>
            <div className="mt-2 text-[13px] font-medium text-content-secondary">
              {overview ? `checked in of ${overview.totalMembers} members` : 'checked in'}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-content">
            <span className="h-[7px] w-[7px] rounded-full bg-green" />
            {ROSTER_HEADER}
          </div>

          <div className="flex-1 overflow-y-auto">
            {roster.map((attendee) => (
              <RosterRow key={attendee.walletAddress} attendee={attendee} now={now} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RosterRow({ attendee, now }: { attendee: Attendee; now: number }) {
  const handle = shortenAddress(attendee.walletAddress);
  const secondsAgo = secondsSince(attendee.checkedInAt, now);
  const isNow = secondsAgo < NOW_THRESHOLD_SECONDS;
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <Avatar seed={attendee.walletAddress} label={handle} size={ROSTER_AVATAR_SIZE} />
      <span className="flex-1 truncate text-[14px] font-semibold text-content">{handle}</span>
      <MonoNum
        className={`text-[11px] font-medium ${isNow ? 'text-status-pos' : 'text-content-secondary'}`}
      >
        {formatAgo(secondsAgo)}
      </MonoNum>
    </div>
  );
}

function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-green border-t-transparent" />;
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Spinner />
    </div>
  );
}

function NoMeeting() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <Card className="w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-lg font-medium text-content">{NO_MEETING_TITLE}</h1>
        <p className="text-sm text-content-secondary">{NO_MEETING_BODY}</p>
        <Link href={SESSIONS_ROUTE} className="inline-block text-sm font-medium text-cyan hover:underline">
          Go to sessions
        </Link>
      </Card>
    </div>
  );
}

function AccessGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <Card className="w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-lg font-medium text-content">{ACCESS_TITLE}</h1>
        <p className="text-sm text-content-secondary">{ACCESS_BODY}</p>
        <Link href="/" className="inline-block text-sm font-medium text-cyan hover:underline">
          Back to app
        </Link>
      </Card>
    </div>
  );
}
