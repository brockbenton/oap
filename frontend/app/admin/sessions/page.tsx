'use client';

export const dynamic = 'force-dynamic';

import { Fragment, useState, useEffect } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { listAdminSessions, getSessionAttendees, downloadSessionCSV } from '@/lib/api/admin';

import { queryKeys } from '@/lib/api/queryKeys';
import { ApiRequestError } from '@/lib/api/client';
import { SessionWithCount, Attendee } from '@/types';
import CreateSessionForm from '@/components/features/admin/CreateSessionForm';

export default function AdminSessionsPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null);

  const { mutate: exportSessionCSV } = useMutation({
    mutationFn: async (sessionId: string) => {
      setDownloadingSessionId(sessionId);
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      await downloadSessionCSV(sessionId, token);
    },
    onSettled: () => setDownloadingSessionId(null),
  });

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.adminSessions(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminSessions(token);
    },
    enabled: authenticated,
    retry: (_failureCount, err) => {
      if (err instanceof ApiRequestError && err.status === 403) return false;
      return false;
    },
  });

  const { data: attendees, isLoading: loadingAttendees } = useQuery({
    queryKey: queryKeys.sessionAttendees(expandedSessionId ?? ''),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getSessionAttendees(expandedSessionId!, token);
    },
    enabled: !!expandedSessionId,
  });

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error instanceof ApiRequestError && error.status === 403) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-xl font-semibold text-gray-900">Access Denied</p>
          <p className="text-gray-500 text-sm">You need admin privileges to view this page.</p>
          <Link href="/" className="text-blue-600 text-sm hover:underline block">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4">
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
        <h1 className="text-lg font-semibold text-gray-900">Admin — Sessions</h1>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-8">
        <CreateSessionForm
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.adminSessions() })}
        />

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">All Sessions</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-600 text-sm text-center py-12">
              {error instanceof Error ? error.message : 'Failed to load sessions.'}
            </p>
          ) : !sessions?.length ? (
            <p className="text-gray-500 text-sm text-center py-12">No sessions yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Attendees</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <Fragment key={session.id}>
                      <tr className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{session.name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(session.date)}</td>
                        <td className="px-4 py-3 text-gray-600">{session.semester}</td>
                        <td className="px-4 py-3">
                          <SessionStatusBadge session={session} />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {session.attendeeCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {session.onchainStatus === 'CONFIRMED' && !session.closedAt && (
                              <Link
                                href={`/admin/sessions/${encodeURIComponent(session.sessionId)}/qr`}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                QR
                              </Link>
                            )}
                            {session.onchainStatus === 'CONFIRMED' && (
                              <button
                                onClick={() => exportSessionCSV(session.sessionId)}
                                disabled={downloadingSessionId === session.sessionId}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                              >
                                {downloadingSessionId === session.sessionId ? '…' : 'CSV'}
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setExpandedSessionId(
                                  expandedSessionId === session.sessionId
                                    ? null
                                    : session.sessionId,
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              {expandedSessionId === session.sessionId ? 'Hide' : 'Attendees'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedSessionId === session.sessionId && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 bg-blue-50">
                            <AttendeeList attendees={attendees ?? []} loading={loadingAttendees} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

interface SessionStatusBadgeProps {
  session: SessionWithCount;
}

function SessionStatusBadge({ session }: SessionStatusBadgeProps) {
  if (session.closedAt) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Closed
      </span>
    );
  }
  if (session.onchainStatus === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  }
  if (session.onchainStatus === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
      Pending
    </span>
  );
}

interface AttendeeListProps {
  attendees: Attendee[];
  loading: boolean;
}

function AttendeeList({ attendees, loading }: AttendeeListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!attendees.length) {
    return <p className="text-gray-500 text-xs text-center py-2">No check-ins yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {attendees.map((a) => (
        <div key={a.walletAddress} className="flex items-center justify-between text-xs">
          <span className="font-mono text-gray-700 truncate">{a.walletAddress}</span>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-gray-500">{formatTime(a.checkedInAt)}</span>
            <MintStatusBadge status={a.mintStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MintStatusBadge({ status }: { status: Attendee['mintStatus'] }) {
  if (status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Minted
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
      Minting
    </span>
  );
}
