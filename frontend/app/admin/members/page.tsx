'use client';

export const dynamic = 'force-dynamic';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAdminMembers, toggleFoundingMember, downloadMembersCSV } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { requireIdentityToken, retryUnlessForbidden } from '@/lib/api/client';
import { ATTENDANCE_GOOD_PCT, ATTENDANCE_OK_PCT } from '@/lib/constants';
import { MemberStats } from '@/types';

export default function AdminMembersPage() {
  const { authenticated } = usePrivy();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminMembers(),
    queryFn: async () => {
      const token = await requireIdentityToken();
      return listAdminMembers(token);
    },
    enabled: authenticated,
    retry: retryUnlessForbidden,
  });

  const { mutate: exportCSV, isPending: exporting } = useMutation({
    mutationFn: async () => {
      const token = await requireIdentityToken();
      await downloadMembersCSV(token);
    },
  });

  const { mutate: setFounding, isPending: togglingId } = useMutation({
    mutationFn: async ({ memberId, founding }: { memberId: string; founding: boolean }) => {
      const token = await requireIdentityToken();
      await toggleFoundingMember(memberId, founding, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminMembers() }),
  });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content">Members</h1>
          {data?.currentSemester && (
            <p className="text-sm text-content-secondary">
              Current semester: {data.currentSemester} &middot; {data.totalSessions} session
              {data.totalSessions !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        {data?.members.length ? (
          <button
            onClick={() => exportCSV()}
            disabled={exporting}
            className="text-sm text-cyan hover:text-content font-medium disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        ) : null}
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-status-neg text-sm text-center py-16">
            {error instanceof Error ? error.message : 'Failed to load members.'}
          </p>
        ) : !data?.members.length ? (
          <p className="text-content-secondary text-sm text-center py-16">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-line rounded-xl overflow-hidden">
              <thead className="bg-raised text-content-secondary text-left">
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
              <tbody className="divide-y divide-line bg-surface">
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
      </div>
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
    <tr className="hover:bg-raised">
      <td className="px-4 py-3 text-content-muted tabular-nums">{rank}</td>
      <td className="px-4 py-3">
        <span className="font-mono text-content text-xs" title={member.walletAddress}>
          {truncateAddress(member.walletAddress)}
        </span>
      </td>
      <td className="px-4 py-3 text-content-secondary max-w-[180px] truncate">
        {member.linkedAccount ?? <span className="text-content-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-content">{member.tokensEarned}</td>
      <td className="px-4 py-3 text-right">
        <AttendancePct pct={member.allTimeAttendancePct} />
      </td>
      <td className="px-4 py-3 text-right">
        <AttendancePct pct={member.currentSemesterAttendancePct} />
      </td>
      <td className="px-4 py-3">
        <TierBadge tier={member.statusTier} foundingMember={member.foundingMember} />
      </td>
      <td className="px-4 py-3 text-content-secondary whitespace-nowrap text-xs">
        {member.lastSeen ? (
          formatRelativeDate(member.lastSeen)
        ) : (
          <span className="text-content-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleFounding(!member.foundingMember)}
          disabled={toggling}
          title={member.foundingMember ? 'Revoke Founding Member' : 'Grant Founding Member'}
          className={`text-xs font-medium px-2 py-0.5 rounded transition-colors disabled:opacity-50 ${
            member.foundingMember
              ? 'bg-status-warn-bg text-status-warn hover:bg-status-warn-bg'
              : 'bg-raised text-content-secondary hover:bg-raised'
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
    pct >= ATTENDANCE_GOOD_PCT
      ? 'text-status-pos'
      : pct >= ATTENDANCE_OK_PCT
        ? 'text-status-warn'
        : 'text-content-secondary';
  return <span className={`tabular-nums font-medium ${color}`}>{pct}%</span>;
}

interface TierBadgeProps {
  tier: MemberStats['statusTier'];
  foundingMember: boolean;
}

function TierBadge({ tier, foundingMember }: TierBadgeProps) {
  if (foundingMember) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-warn-bg text-status-warn">
        Founding
      </span>
    );
  }
  if (tier === 'Official Member') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-info-bg text-cyan">
        Official
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-raised text-content-secondary">
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
