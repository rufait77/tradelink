'use client';
import dynamic from 'next/dynamic';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import {
  Bell, Briefcase, DollarSign, Clock, TrendingUp, Plus, Send, ArrowRight, CheckCircle2, Circle,
} from 'lucide-react';
import { MockSidebar } from './mock-sidebar';
import { getMockPersona, MOCK_PIPELINE, type MockRole, type MockStat } from './mock-data';

// Recharts touches window; render it client-side only to avoid hydration noise.
const MockEarningsChart = dynamic(
  () => import('./mock-earnings-chart').then((m) => m.MockEarningsChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

// ─── Display strings ──────────────────────────────────────────────────────────
export const MOCK_DASHBOARD_STRINGS = {
  welcome: 'Welcome back,',
  headline: (first: string) => `Welcome back, ${first}`,
  subline: "Here's what's happening with your referrals.",
  postReferral: 'Post Referral',
  quickActions: {
    post: { label: 'Post a Referral', desc: "Got a lead you can't take?" },
    browse: { label: 'Browse Job Board', desc: 'Find jobs to claim' },
    earnings: { label: 'View Earnings', desc: 'Track your commissions' },
  },
  earningsTitle: 'Earnings — last 6 months',
  recentActivity: 'Recent Activity',
  viewAll: 'View all',
  notifications: 'Notifications',
  pipelineTitle: 'Live referral',
  pipelineJob: 'Water heater replacement',
  pipelineNote: 'Funds release automatically 5 days after the contractor marks it done.',
  demoBadge: 'Demo · sample data',
  ariaLabel: 'Tradelink dashboard preview',
} as const;

const TONE_CLASS: Record<MockStat['tone'], string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  blue: 'text-blue-400',
};

const STAT_ICONS = [DollarSign, Clock, TrendingUp, Briefcase];

interface MockDashboardProps {
  role: MockRole;
  className?: string;
}

export function MockDashboard({ role, className }: MockDashboardProps) {
  const persona = getMockPersona(role);
  const firstName = persona.name.split(' ')[0];
  const unread = persona.notifications.filter((n) => n.unread).length;

  const quickActions = [
    { icon: Send, ...MOCK_DASHBOARD_STRINGS.quickActions.post },
    ...(role === 'contractor' ? [{ icon: Briefcase, ...MOCK_DASHBOARD_STRINGS.quickActions.browse }] : []),
    { icon: DollarSign, ...MOCK_DASHBOARD_STRINGS.quickActions.earnings },
  ];

  return (
    <div
      className={cn(
        'relative flex w-full overflow-hidden rounded-2xl border border-surface-border/60 bg-navy-950 shadow-glass text-left',
        className,
      )}
      aria-label={MOCK_DASHBOARD_STRINGS.ariaLabel}
    >
      <MockSidebar role={role} name={persona.name} email={persona.email} />

      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-navy-900/80 backdrop-blur-xl border-b border-surface-border/30 flex items-center justify-between px-5">
          <p className="text-[13px] text-surface-muted">
            {MOCK_DASHBOARD_STRINGS.welcome} <span className="text-slate-200 font-medium">{persona.name}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {MOCK_DASHBOARD_STRINGS.demoBadge}
            </span>
            <div className="relative p-2 rounded-xl text-slate-400">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-navy-950 text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-400">{persona.name.charAt(0)}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-heading font-bold text-white">
                {MOCK_DASHBOARD_STRINGS.headline(firstName)}
              </h3>
              <p className="text-xs text-surface-muted">{MOCK_DASHBOARD_STRINGS.subline}</p>
            </div>
            <Button size="sm" tabIndex={-1} aria-hidden className="pointer-events-none">
              <Plus className="w-4 h-4" /> {MOCK_DASHBOARD_STRINGS.postReferral}
            </Button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {persona.stats.map((stat, i) => {
              const Icon = STAT_ICONS[i] ?? DollarSign;
              return (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                      <Icon className={cn('w-4 h-4', TONE_CLASS[stat.tone])} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-surface-muted truncate">{stat.label}</p>
                      <p className="text-base font-heading font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left: chart + activity */}
            <div className="xl:col-span-2 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-heading font-semibold text-white">{MOCK_DASHBOARD_STRINGS.earningsTitle}</p>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <MockEarningsChart data={persona.earnings} />
              </Card>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-heading font-semibold text-white">{MOCK_DASHBOARD_STRINGS.recentActivity}</p>
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    {MOCK_DASHBOARD_STRINGS.viewAll} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="space-y-2">
                  {persona.jobs.map((job) => (
                    <Card key={job.title} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-200 truncate">{job.title}</p>
                        <p className="text-[11px] text-surface-muted">
                          {job.trade} · <span className="text-emerald-400">{job.amount}</span> · {job.when}
                        </p>
                      </div>
                      <Badge variant="status" statusClass={job.statusClass} className="shrink-0">{job.status}</Badge>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: quick actions + pipeline + notifications */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Card key={action.label} className="p-3 flex items-center gap-3">
                      <Icon className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white">{action.label}</p>
                        <p className="text-[11px] text-surface-muted truncate">{action.desc}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-amber-500 font-bold mb-1">{MOCK_DASHBOARD_STRINGS.pipelineTitle}</p>
                <p className="text-sm font-medium text-white mb-3">{MOCK_DASHBOARD_STRINGS.pipelineJob}</p>
                <ol className="space-y-1.5">
                  {MOCK_PIPELINE.map((step) => (
                    <li key={step.label} className="flex items-center gap-2 text-[12px]">
                      {step.done ? (
                        <CheckCircle2 className={cn('w-3.5 h-3.5', step.current ? 'text-amber-400' : 'text-emerald-400')} />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-surface-border" />
                      )}
                      <span className={cn(step.current ? 'text-amber-400 font-medium' : step.done ? 'text-slate-300' : 'text-surface-muted')}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-[11px] text-surface-muted mt-3 leading-relaxed">{MOCK_DASHBOARD_STRINGS.pipelineNote}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-heading font-semibold text-white mb-3">{MOCK_DASHBOARD_STRINGS.notifications}</p>
                <ul className="space-y-3">
                  {persona.notifications.map((n) => (
                    <li key={n.title} className="flex gap-2.5">
                      <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', n.unread ? 'bg-amber-500' : 'bg-surface-border')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12px] font-medium text-slate-200 truncate">{n.title}</p>
                          <span className="text-[10px] text-surface-muted shrink-0">{n.when}</span>
                        </div>
                        <p className="text-[11px] text-surface-muted leading-snug">{n.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
