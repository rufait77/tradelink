'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { SkeletonStats } from '../../components/ui/skeleton';
import api from '../../lib/api';
import { formatCurrency, getStatusClass } from '../../lib/utils';
import {
  Briefcase, DollarSign, Send, TrendingUp,
  ArrowRight, Plus, Clock,
} from 'lucide-react';

interface DashboardData {
  earnings: { totalEarned: number; pendingAmount: number; thisMonthEarned: number };
  recentJobs: Array<{ id: string; title: string; status: string; tradeType: string; createdAt: string }>;
}

export default function DashboardHomePage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [earningsRes, referralsRes, claimedRes] = await Promise.all([
          api.get('/earnings/summary').catch(() => ({ data: { data: { totalEarned: 0, pendingAmount: 0, thisMonthEarned: 0 } } })),
          api.get('/jobs/my-referrals?pageSize=3').catch(() => ({ data: { data: { items: [] } } })),
          api.get('/jobs/my-claimed?pageSize=3').catch(() => ({ data: { data: { items: [] } } })),
        ]);

        const allJobs = [
          ...(earningsRes.data?.data ? [] : []),
          ...(referralsRes.data?.data?.items || []),
          ...(claimedRes.data?.data?.items || []),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

        setData({
          earnings: earningsRes.data?.data || { totalEarned: 0, pendingAmount: 0, thisMonthEarned: 0 },
          recentJobs: allJobs,
        });
      } catch {
        setData({ earnings: { totalEarned: 0, pendingAmount: 0, thisMonthEarned: 0 }, recentJobs: [] });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-surface-muted">Welcome back!</p>
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  const stats = [
    { icon: DollarSign, label: 'Total Earned', value: formatCurrency(data?.earnings.totalEarned || 0), color: 'text-emerald-400' },
    { icon: Clock, label: 'Pending', value: formatCurrency(data?.earnings.pendingAmount || 0), color: 'text-amber-400' },
    { icon: TrendingUp, label: 'This Month', value: formatCurrency(data?.earnings.thisMonthEarned || 0), color: 'text-blue-400' },
    { icon: Briefcase, label: 'Profile Rating', value: user?.profile?.avgRating ? `${user.profile.avgRating.toFixed(1)} ★` : 'No ratings yet', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-surface-muted">Here&apos;s what&apos;s happening with your referrals.</p>
        </div>
        <Link href="/dashboard/post-job">
          <Button size="sm"><Plus className="w-4 h-4" /> Post Referral</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-surface-muted">{stat.label}</p>
                  <p className="text-lg font-heading font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/post-job', icon: Send, label: 'Post a Referral', desc: 'Got a lead you can\'t take?' },
          { href: '/dashboard/jobs', icon: Briefcase, label: 'Browse Job Board', desc: 'Find jobs to claim' },
          { href: '/dashboard/earnings', icon: DollarSign, label: 'View Earnings', desc: 'Track your commissions' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card hover className="h-full">
                <Icon className="w-6 h-6 text-amber-500 mb-3" />
                <p className="text-sm font-semibold text-white">{action.label}</p>
                <p className="text-xs text-surface-muted mt-1">{action.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-white">Recent Activity</h2>
          <Link href="/dashboard/my-referrals" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {data?.recentJobs.length === 0 ? (
          <Card>
            <p className="text-sm text-surface-muted text-center py-4">
              No activity yet. <Link href="/dashboard/post-job" className="text-amber-400">Post your first referral</Link> to get started!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data?.recentJobs.map((job) => (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card hover className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{job.title}</p>
                    <p className="text-xs text-surface-muted">{job.tradeType}</p>
                  </div>
                  <Badge variant="status" statusClass={getStatusClass(job.status)}>{job.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
