'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import {
  AlertTriangle, Filter, ChevronLeft, ChevronRight,
  ExternalLink, Clock, CheckCircle, XCircle,
} from 'lucide-react';

interface Dispute {
  id: string;
  jobId: string;
  raisedBy: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  job: {
    id: string; title: string; status: string;
    postedBy: { id: string; name: string };
    claimedBy: { id: string; name: string } | null;
    escrow: { id: string; status: string; totalAmount: number } | null;
  };
}

const statusColors: Record<string, string> = {
  open: 'bg-red-500/15 text-red-400',
  under_review: 'bg-amber-500/15 text-amber-400',
  resolved_contractor: 'bg-emerald-500/15 text-emerald-400',
  resolved_client: 'bg-blue-500/15 text-blue-400',
  closed: 'bg-slate-700 text-slate-300',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved_contractor: 'Resolved (Contractor)',
  resolved_client: 'Resolved (Client)',
  closed: 'Closed',
};

export default function DisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/disputes', { params: { status: status || undefined, page, pageSize: 20 } })
      .then((r) => { setDisputes(r.data.data.disputes); setTotal(r.data.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={24} /> Disputes
        </h1>
        <p className="text-slate-400 text-sm mt-1">{total} total disputes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved_contractor">Resolved (Contractor)</option>
            <option value="resolved_client">Resolved (Client)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Job</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Raised By</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Contractor</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Amount</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Date</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center py-16 text-slate-500">
                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!loading && disputes.length === 0 && (
              <tr><td colSpan={7} className="text-center py-16 text-slate-500">No disputes found</td></tr>
            )}
            {disputes.map((d) => (
              <tr key={d.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/disputes/${d.id}`)}>
                <td className="px-6 py-4">
                  <p className="font-medium text-white truncate max-w-48">{d.job.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{d.reason.substring(0, 50)}...</p>
                </td>
                <td className="px-6 py-4 text-slate-300">{d.raisedBy === 'client' ? 'Client' : 'Contractor'}</td>
                <td className="px-6 py-4 text-slate-300">{d.job.claimedBy?.name ?? '—'}</td>
                <td className="px-6 py-4 text-white font-medium">
                  {d.job.escrow ? `$${d.job.escrow.totalAmount.toLocaleString()}` : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[d.status] ?? 'bg-slate-700 text-slate-300'}`}>
                    {statusLabels[d.status] ?? d.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-amber-400 hover:text-amber-300 transition-colors">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
