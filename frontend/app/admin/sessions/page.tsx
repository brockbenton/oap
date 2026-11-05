'use client';

export const dynamic = 'force-dynamic';

import { Fragment, useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { listAdminSessions, getSessionAttendees, downloadSessionCSV } from '@/lib/api/admin';

import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden } from '@/lib/api/client';
import { SessionWithCount, Attendee } from '@/types';
import CreateSessionForm from '@/components/features/admin/CreateSessionForm';

export default function AdminSessionsPage() {
  const { authenticated } = usePrivy();
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
    retry: retryUnlessForbidden,
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

  return (
    <div className="max-w-5xl mx-auto w-full space-y-10">
      <h1 className="text-2xl font-medium text-content">Sessions</h1>

      <CreateSessionForm
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.adminSessions() })}
      />

        <section>
          <h2 className="text-base font-medium text-content mb-4">All Sessions</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-status-neg text-sm text-center py-12">
              {error instanceof Error ? error.message : 'Failed to load sessions.'}
            </p>
          ) : !sessions?.length ? (
            <p className="text-content-secondary text-sm text-center py-12">No sessions yet.</p>
          ) : (
            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-raised text-content-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Attendees</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((session) => (
                    <Fragment key={session.id}>
                      <tr className="bg-surface hover:bg-raised">
                        <td className="px-4 py-3 font-medium text-content">{session.name}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatDate(session.date)}</td>
                        <td className="px-4 py-3 text-content-secondary">{session.semester}</td>
                        <td className="px-4 py-3">
                          <SessionStatusBadge session={session} />
                        </td>
                        <td className="px-4 py-3 text-right text-content">
                          {session.attendeeCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {session.onchainStatus === 'CONFIRMED' && !session.closedAt && (
                              <Link
                                href={`/admin/sessions/${encodeURIComponent(session.sessionId)}/qr`}
                                className="text-cyan hover:text-content text-xs font-medium"
                              >
                                QR
                              </Link>
                            )}
                            {session.onchainStatus === 'CONFIRMED' && (
                              <button
                                onClick={() => exportSessionCSV(session.sessionId)}
                                disabled={downloadingSessionId === session.sessionId}
                                className="text-cyan hover:text-content text-xs font-medium disabled:opacity-50"
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
                              className="text-cyan hover:text-content text-xs font-medium"
                            >
                              {expandedSessionId === session.sessionId ? 'Hide' : 'Attendees'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedSessionId === session.sessionId && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 bg-status-info-bg">
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-raised text-content-secondary">
        Closed
      </span>
    );
  }
  if (session.onchainStatus === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-pos-bg text-status-pos">
        Active
      </span>
    );
  }
  if (session.onchainStatus === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-neg-bg text-status-neg">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-warn-bg text-status-warn">
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
        <div className="w-5 h-5 border-2 border-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!attendees.length) {
    return <p className="text-content-secondary text-xs text-center py-2">No check-ins yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {attendees.map((a) => (
        <div key={a.walletAddress} className="flex items-center justify-between text-xs">
          <span className="font-mono text-content truncate">{a.walletAddress}</span>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-content-secondary">{formatTime(a.checkedInAt)}</span>
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
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-status-pos-bg text-status-pos">
        Minted
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-status-neg-bg text-status-neg">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-status-warn-bg text-status-warn">
      Minting
    </span>
  );
}
