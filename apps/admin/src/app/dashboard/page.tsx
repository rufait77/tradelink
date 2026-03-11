'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, Briefcase, DollarSign, TrendingUp, Clock, CheckCircle, BarChart2, Zap } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  activeSubscriptions: number;
  openJobs: number;
  jobsThisMonth: number;
  completedJobsThisMonth: number;
  platformRevenueThisMonth: number;
  pendingCommissions: number;
  mrr: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics/overview').then((r) => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time stats across the Tradelink platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Contractors" value={data?.totalUsers ?? '–'} color="bg-blue-500/20" />
        <StatCard icon={Zap} label="Active Subscriptions" value={data?.activeSubscriptions ?? '–'} sub={`MRR: $${data?.mrr}`} color="bg-amber-500/20" />
        <StatCard icon={Briefcase} label="Open Jobs" value={data?.openJobs ?? '–'} color="bg-emerald-500/20" />
        <StatCard icon={DollarSign} label="Revenue This Month" value={`$${(data?.platformRevenueThisMonth ?? 0).toFixed(2)}`} color="bg-purple-500/20" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BarChart2} label="Jobs This Month" value={data?.jobsThisMonth ?? '–'} color="bg-indigo-500/20" />
        <StatCard icon={CheckCircle} label="Completed (Month)" value={data?.completedJobsThisMonth ?? '–'} color="bg-teal-500/20" />
        <StatCard icon={TrendingUp} label="Pending Commissions" value={`$${(data?.pendingCommissions ?? 0).toFixed(2)}`} color="bg-orange-500/20" />
        <StatCard icon={Clock} label="Monthly Recurring Rev." value={`$${data?.mrr ?? '0.00'}`} color="bg-rose-500/20" />
      </div>

      {/* Quick actions */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users', href: '/dashboard/users', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { label: 'View Jobs', href: '/dashboard/jobs', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Platform Settings', href: '/dashboard/settings', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Audit Log', href: '/dashboard/audit-log', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          ].map((a) => (
            <a key={a.href} href={a.href} className={`border rounded-xl px-4 py-3 text-sm font-medium text-center transition-all hover:scale-[1.02] ${a.color}`}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
