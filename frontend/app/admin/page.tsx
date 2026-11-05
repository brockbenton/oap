'use client';

export const dynamic = 'force-dynamic';

import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { getAdminOverview } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { AdminOverview, OverviewSessionPoint } from '@/types';

export default function AdminOverviewPage() {
  const { authenticated } = usePrivy();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminOverview(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminOverview(token);
    },
    enabled: authenticated,
  });

  return (
    <div className="max-w-6xl mx-auto w-full space-y-10">
      <div>
        <h1 className="text-2xl font-medium text-content">Overview</h1>
        <p className="text-sm text-content-secondary">
          {data?.currentSemester ? `Current semester: ${data.currentSemester}` : 'Club attendance at a glance'}
        </p>
      </div>

      {isLoading ? (
        <OverviewSkeleton />
      ) : error ? (
        <p className="text-status-neg text-sm py-16 text-center">Couldn&apos;t load the overview. Please try again.</p>
      ) : !data || data.totalSessions === 0 ? (
        <p className="text-content-secondary text-sm py-16 text-center">No sessions yet. Create one to see attendance trends.</p>
      ) : (
        <OverviewBody data={data} />
      )}
    </div>
  );
}

// ── components ───────────────────────────────────────────────────────────────

function OverviewBody({ data }: { data: AdminOverview }) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Members" value={data.totalMembers} />
        <Tile label="Meetings held" value={data.totalSessions} />
        <Tile label="Avg headcount" value={data.avgHeadcount} />
        <Tile
          label="Latest headcount"
          value={data.latest?.headcount ?? 0}
          delta={data.wow?.headcountDelta ?? null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl bg-surface border border-line p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-content">Attendance rate over time</h2>
            {data.latest && (
              <span className="text-xs text-content-secondary">
                Latest {data.latest.attendanceRate}%
                {data.wow && <DeltaText delta={data.wow.attendanceRateDelta} suffix="pts" />}
              </span>
            )}
          </div>
          <AttendanceChart series={data.series} />
        </section>

        <section className="rounded-2xl bg-surface border border-line p-6">
          <h2 className="text-sm font-medium text-content mb-4">Per-session headcount</h2>
          <HeadcountBars series={data.series} />
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, delta }: { label: string; value: number; delta?: number | null }) {
  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-3xl font-medium tabular-nums text-content">{value}</p>
        {delta != null && delta !== 0 && <DeltaBadge delta={delta} />}
      </div>
      <p className="mt-1 text-xs text-content-secondary">{label}</p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span className={`text-xs ${up ? 'text-status-pos' : 'text-status-neg'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta)} vs previous
    </span>
  );
}

function DeltaText({ delta, suffix }: { delta: number; suffix: string }) {
  if (delta === 0) return <span className="text-content-muted"> · flat</span>;
  const up = delta > 0;
  return (
    <span className={up ? 'text-status-pos' : 'text-status-neg'}>
      {' '}
      {up ? '▲' : '▼'} {Math.abs(delta)} {suffix} vs previous
    </span>
  );
}

const CHART_W = 720;
const CHART_H = 240;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 30;

function AttendanceChart({ series }: { series: OverviewSessionPoint[] }) {
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const n = series.length;

  const xFor = (i: number) => (n <= 1 ? PAD_L + innerW / 2 : PAD_L + (i * innerW) / (n - 1));
  const yFor = (rate: number) => PAD_T + innerH - (Math.max(0, Math.min(100, rate)) / 100) * innerH;

  const points = series.map((p, i) => ({ x: xFor(i), y: yFor(p.attendanceRate), p }));
  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`
      : '';

  const gridlines = [0, 25, 50, 75, 100];
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full min-w-[520px] h-auto" role="img" aria-label="Attendance rate over time">
        {gridlines.map((g) => {
          const y = yFor(g);
          return (
            <g key={g}>
              <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} stroke="rgb(var(--line))" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={10} fill="rgb(var(--content-muted))">
                {g}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="rgb(var(--green))" fillOpacity={0.1} />}
        {linePath && <path d={linePath} fill="none" stroke="rgb(var(--green))" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

        {points.map((pt, i) => (
          <g key={pt.p.sessionIdOnchain}>
            <circle cx={pt.x} cy={pt.y} r={i === points.length - 1 ? 4 : 3} fill="rgb(var(--green))" />
            {i % labelEvery === 0 || i === points.length - 1 ? (
              <text x={pt.x} y={CHART_H - 10} textAnchor="middle" fontSize={10} fill="rgb(var(--content-muted))">
                {shortDate(pt.p.date)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function HeadcountBars({ series }: { series: OverviewSessionPoint[] }) {
  const max = Math.max(1, ...series.map((s) => s.headcount));
  const ordered = [...series].reverse();
  return (
    <div className="space-y-4">
      {ordered.map((s) => (
        <div key={s.sessionIdOnchain} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div className="truncate text-content-secondary" title={s.name}>
              {s.name}
            </div>
            <div className="shrink-0 font-mono tabular-nums text-content-secondary text-xs">
              {s.headcount} · {s.attendanceRate}%
            </div>
          </div>
          <div className="mt-2 h-1 rounded-sm bg-raised overflow-hidden">
            <div
              className="h-full bg-line-strong"
              style={{ width: `${Math.round((s.headcount / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface border border-line h-24 animate-pulse" />
        ))}
      </div>
      <div className="rounded-2xl bg-surface border border-line h-64 animate-pulse" />
      <div className="rounded-2xl bg-surface border border-line h-48 animate-pulse" />
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
