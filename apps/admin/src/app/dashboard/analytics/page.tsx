'use client';
import { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Analytics {
  totalUsers: number; activeSubscriptions: number; openJobs: number;
  jobsThisMonth: number; completedJobsThisMonth: number;
  platformRevenueThisMonth: number; pendingCommissions: number; mrr: string;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics/overview').then((r) => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-64"><div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  const barData = data ? [
    { name: 'Jobs This Month', value: data.jobsThisMonth },
    { name: 'Completed', value: data.completedJobsThisMonth },
    { name: 'Open', value: data.openJobs },
    { name: 'Subscriptions', value: data.activeSubscriptions },
    { name: 'Users', value: data.totalUsers },
  ] : [];

  const pieData = data ? [
    { name: 'Revenue', value: data.platformRevenueThisMonth },
    { name: 'Pending Commissions', value: data.pendingCommissions },
  ] : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Platform performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Platform Overview</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Revenue Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: $${value?.toFixed(2)}`} labelLine={{ stroke: '#475569' }}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 13 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* MRR card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 col-span-full">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Monthly Recurring Revenue (MRR)</p>
              <p className="text-4xl font-bold text-amber-400 mt-1">${data?.mrr}</p>
              <p className="text-slate-500 text-sm mt-1">Based on {data?.activeSubscriptions} active subscriptions</p>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Platform Revenue This Month</p>
              <p className="text-4xl font-bold text-emerald-400 mt-1">${data?.platformRevenueThisMonth?.toFixed(2)}</p>
              <p className="text-slate-500 text-sm mt-1">From completed job fees</p>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Pending Commission Payouts</p>
              <p className="text-4xl font-bold text-orange-400 mt-1">${data?.pendingCommissions?.toFixed(2)}</p>
              <p className="text-slate-500 text-sm mt-1">Awaiting job completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
