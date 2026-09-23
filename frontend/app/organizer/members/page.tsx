'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import OrganizerTopNav from '@/components/shared/OrganizerTopNav';
import PageContainer from '@/components/shared/PageContainer';
import { Avatar, Button, Card } from '@/components/ui';
import { SearchIcon } from '@/components/ui/icons';
import { getAdminMe, listAdminMembers, downloadMembersCSV } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import { ATTENDANCE_GOOD_PCT } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { MemberStats, RecentSession } from '@/types';

const PRESENT_MARK = '✓';
const NO_SESSIONS_LABEL = 'no meetings yet';

interface Column {
  key: string;
  label: string;
  align: string;
}

function columnsFor(rangeLabel: string): Column[] {
  return [
    { key: 'member', label: 'Member', align: 'text-left' },
    { key: 'tokens', label: 'Tokens', align: 'text-right' },
    { key: 'streak', label: 'Streak', align: 'text-right' },
    { key: 'attendance', label: `Attendance · ${rangeLabel}`, align: 'text-center' },
    { key: 'rate', label: 'Rate', align: 'text-right' },
  ];
}

const ROW_GRID = 'grid grid-cols-[1.4fr_90px_90px_240px_90px] items-center gap-4 px-5';
const HEADER_LABEL = 'font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-content-secondary';
const CELL_PRESENT =
  'grid h-[22px] w-[22px] place-items-center rounded-[6px] bg-status-pos-bg font-mono text-[11px] font-bold text-green-600';
const CELL_ABSENT = 'h-[22px] w-[22px] rounded-[6px] bg-card-filled';

const MONTH_YEAR_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };
const DAY_MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', MONTH_YEAR_FORMAT);
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', DAY_MONTH_FORMAT);
}

/** "Mar 7 – Apr 11" across the matrix window, so the columns are self-describing. */
function rangeLabelFor(sessions: RecentSession[]): string {
  if (!sessions.length) return NO_SESSIONS_LABEL;
  const first = formatSessionDate(sessions[0].date);
  const last = formatSessionDate(sessions[sessions.length - 1].date);
  return first === last ? first : `${first} – ${last}`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function displayHandle(member: MemberStats): string {
  return member.linkedAccount ?? truncateAddress(member.walletAddress);
}

export default function OrganizerMembersPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const [query, setQuery] = useState('');

  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    error: meErr,
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

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminMembers(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminMembers(token);
    },
    enabled: ready && authenticated && isAdmin,
    retry: retryUnlessForbidden,
  });

  const { mutate: exportCsv, isPending: exporting } = useMutation({
    mutationFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      await downloadMembersCSV(token);
    },
  });

  const members = useMemo(() => data?.members ?? [], [data]);
  const recentSessions = useMemo(() => data?.recentSessions ?? [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => displayHandle(m).toLowerCase().includes(q) || m.walletAddress.toLowerCase().includes(q),
    );
  }, [members, query]);

  const gate = renderGate();

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <OrganizerTopNav active="members" />
      <PageContainer className="py-8">
        {gate ?? (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="mb-1.5 text-[26px] font-semibold leading-[30px] tracking-[-0.8px]">Members</h1>
                <p className="text-[14px] leading-[20px] text-content-secondary">
                  {members.length} total
                  {recentSessions.length > 0 &&
                    ` · attendance across the last ${recentSessions.length} ${
                      recentSessions.length === 1 ? 'meeting' : 'meetings'
                    } (${rangeLabelFor(recentSessions)})`}
                  .
                </p>
              </div>
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
                <label className="flex h-10 w-full items-center gap-2 rounded-full border border-[var(--l-input-border)] bg-white px-3.5 sm:w-60">
                  <SearchIcon size={15} className="shrink-0 text-content-secondary" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search members"
                    className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--l-input-placeholder)]"
                  />
                </label>
                <Button
                  variant="outline"
                  onClick={() => exportCsv()}
                  disabled={exporting}
                  className="h-10 text-[13px]"
                >
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>
            </div>

            {renderTable()}
          </>
        )}
      </PageContainer>
    </div>
  );

  function renderGate() {
    if (!ready || (authenticated && meLoading)) {
      return (
        <CenteredState>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
        </CenteredState>
      );
    }
    if (!authenticated) {
      return (
        <AccessState
          title="Sign in required"
          message="Sign in with an organizer account to manage members."
          action={<Button onClick={login}>Sign in</Button>}
        />
      );
    }
    const forbidden = meError && meErr instanceof ApiRequestError && meErr.status === 403;
    if (forbidden || meError || !isAdmin) {
      return (
        <AccessState
          title="Organizer access required"
          message="This account doesn't have organizer access to this club."
        />
      );
    }
    return null;
  }

  function renderTable() {
    if (isLoading) {
      return (
        <CenteredState>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
        </CenteredState>
      );
    }
    if (error) {
      return (
        <CenteredState>
          <p className="text-[14px] text-status-neg">Couldn&apos;t load members. Please try again.</p>
        </CenteredState>
      );
    }
    if (!filtered.length) {
      return (
        <CenteredState>
          <p className="text-[14px] text-content-secondary">
            {query.trim() ? 'No members match your search.' : 'No members yet.'}
          </p>
        </CenteredState>
      );
    }
    return (
      <div className="overflow-x-auto">
        <Card className="min-w-[760px] overflow-hidden rounded-card shadow-none">
          <div className={cn(ROW_GRID, 'bg-card-filled py-3')}>
            {columnsFor(rangeLabelFor(recentSessions)).map((col) => (
              <span key={col.key} className={cn(HEADER_LABEL, col.align)}>
                {col.label}
              </span>
            ))}
          </div>
          {filtered.map((member) => (
            <MemberRow key={member.id} member={member} sessions={recentSessions} />
          ))}
        </Card>
      </div>
    );
  }
}

function MemberRow({ member, sessions }: { member: MemberStats; sessions: RecentSession[] }) {
  const handle = displayHandle(member);
  const rateGood = member.allTimeAttendancePct >= ATTENDANCE_GOOD_PCT;

  return (
    <div className={cn(ROW_GRID, 'border-t border-line py-3.5')}>
      <div className="flex items-center gap-3">
        <Avatar seed={member.walletAddress} label={handle} size={32} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold leading-[1.2]">{handle}</div>
          <div className="mt-[3px] font-mono text-[11px] font-medium text-content-secondary">
            Joined {formatJoined(member.joinedAt)}
          </div>
        </div>
      </div>
      <span className="text-right font-mono text-[14px] font-semibold tabular-nums">
        {member.tokensEarned}
      </span>
      <span className="text-right font-mono text-[14px] font-semibold tabular-nums text-yellow-700">
        {member.currentStreak}
      </span>
      <div className="flex justify-center gap-[6px]">
        {sessions.map((session, i) => {
          const present = member.recentAttendance[i] === true;
          return (
            <span
              key={session.sessionIdOnchain}
              title={`${session.name} · ${formatSessionDate(session.date)} — ${
                present ? 'attended' : 'absent'
              }`}
              className={present ? CELL_PRESENT : CELL_ABSENT}
            >
              {present ? PRESENT_MARK : ''}
            </span>
          );
        })}
      </div>
      <span
        className={cn(
          'text-right font-mono text-[13px] font-bold tabular-nums',
          rateGood ? 'text-green-600' : 'text-ink',
        )}
      >
        {member.allTimeAttendancePct}%
      </span>
    </div>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-20">{children}</div>;
}

interface AccessStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

function AccessState({ title, message, action }: AccessStateProps) {
  return (
    <div className="flex justify-center py-20">
      <Card className="max-w-sm space-y-4 p-8 text-center">
        <h2 className="text-[18px] font-semibold">{title}</h2>
        <p className="text-[14px] leading-[20px] text-content-secondary">{message}</p>
        {action}
      </Card>
    </div>
  );
}
