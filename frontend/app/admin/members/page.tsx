'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { listAdminMembers, toggleFoundingMember, downloadMembersCSV } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { ApiRequestError } from '@/lib/api/client';
import { MemberStats } from '@/types';

export default function AdminMembersPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminMembers(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminMembers(token);
    },
    enabled: authenticated,
    retry: (_n, err) => !(err instanceof ApiRequestError && err.status === 403),
  });

  const { mutate: exportCSV, isPending: exporting } = useMutation({
    mutationFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      await downloadMembersCSV(token);
    },
  });

  const { mutate: setFounding, isPending: togglingId } = useMutation({
    mutationFn: async ({ memberId, founding }: { memberId: string; founding: boolean }) => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      await toggleFoundingMember(memberId, founding, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminMembers() }),
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
        <Link href="/admin/sessions" className="text-gray-500 hover:text-gray-800 mr-4">
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
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">Admin — Members</h1>
          {data?.currentSemester && (
            <p className="text-xs text-gray-500">
              Current semester: {data.currentSemester} &middot; {data.totalSessions} session
              {data.totalSessions !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        {data?.members.length ? (
          <button
            onClick={() => exportCSV()}
            disabled={exporting}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        ) : null}
      </header>

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm text-center py-16">
            {error instanceof Error ? error.message : 'Failed to load members.'}
          </p>
        ) : !data?.members.length ? (
          <p className="text-gray-500 text-sm text-center py-16">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium text-right">Tokens</th>
                  <th className="px-4 py-3 font-medium text-right">All&#8209;time</th>
                  <th className="px-4 py-3 font-medium text-right">Semester</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Seen</th>
                  <th className="px-4 py-3 font-medium">Founding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.members.map((member, i) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    rank={i + 1}
                    toggling={togglingId}
                    onToggleFounding={(founding) =>
                      setFounding({ memberId: member.id, founding })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: MemberStats;
  rank: number;
  toggling: boolean;
  onToggleFounding: (founding: boolean) => void;
}

function MemberRow({ member, rank, toggling, onToggleFounding }: MemberRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-400 tabular-nums">{rank}</td>
      <td className="px-4 py-3">
        <span className="font-mono text-gray-800 text-xs" title={member.walletAddress}>
          {truncateAddress(member.walletAddress)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
        {member.linkedAccount ?? <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{member.tokensEarned}</td>
      <td className="px-4 py-3 text-right">
        <AttendancePct pct={member.allTimeAttendancePct} />
      </td>
      <td className="px-4 py-3 text-right">
        <AttendancePct pct={member.currentSemesterAttendancePct} />
      </td>
      <td className="px-4 py-3">
        <TierBadge tier={member.statusTier} foundingMember={member.foundingMember} />
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
        {member.lastSeen ? (
          formatRelativeDate(member.lastSeen)
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleFounding(!member.foundingMember)}
          disabled={toggling}
          title={member.foundingMember ? 'Revoke Founding Member' : 'Grant Founding Member'}
          className={`text-xs font-medium px-2 py-0.5 rounded transition-colors disabled:opacity-50 ${
            member.foundingMember
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {member.foundingMember ? 'Founding' : 'Grant'}
        </button>
      </td>
    </tr>
  );
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function AttendancePct({ pct }: { pct: number }) {
  const color =
    pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-gray-600';
  return <span className={`tabular-nums font-medium ${color}`}>{pct}%</span>;
}

interface TierBadgeProps {
  tier: MemberStats['statusTier'];
  foundingMember: boolean;
}

function TierBadge({ tier, foundingMember }: TierBadgeProps) {
  if (foundingMember) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
        Founding
      </span>
    );
  }
  if (tier === 'Official Member') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
        Official
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      General
    </span>
  );
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
