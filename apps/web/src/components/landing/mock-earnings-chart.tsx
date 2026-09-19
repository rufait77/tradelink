'use client';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MockEarningsPoint } from './mock-data';

// ─── Display strings ──────────────────────────────────────────────────────────
const CHART_STRINGS = {
  tooltipLabel: 'Earned',
} as const;

const AMBER = '#f59e0b';
const MUTED = '#64748b';

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US')}`;
}

export function MockEarningsChart({ data }: { data: MockEarningsPoint[] }) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="mockEarningsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
              <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatUsd} width={70} />
          <Tooltip
            cursor={{ stroke: AMBER, strokeOpacity: 0.3 }}
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: '#cbd5e1' }}
            itemStyle={{ color: AMBER }}
            formatter={(value) => [formatUsd(Number(value)), CHART_STRINGS.tooltipLabel]}
          />
          <Area
            type="monotone"
            dataKey="earned"
            stroke={AMBER}
            strokeWidth={2}
            fill="url(#mockEarningsFill)"
            dot={{ r: 3, fill: AMBER, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: AMBER, strokeWidth: 0 }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
