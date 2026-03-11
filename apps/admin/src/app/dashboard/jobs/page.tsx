'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '../../../../lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Job {
  id: string; title: string; status: string; tradeType: string;
  state: string; createdAt: string;
  postedBy?: { name: string; email: string };
  claimedBy?: { name: string; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-emerald-500/15 text-emerald-400',
  Claimed: 'bg-blue-500/15 text-blue-400',
  Completed: 'bg-purple-500/15 text-purple-400',
  Cancelled: 'bg-red-500/15 text-red-400',
  Disputed: 'bg-orange-500/15 text-orange-400',
};

const ALL_STATUSES = ['Open', 'Claimed', 'Completed', 'Cancelled', 'Disputed'];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/jobs', { params: { status, page, pageSize: 20 } })
      .then((r) => { setJobs(r.data.data.jobs); setTotal(r.data.data.total); })
      .catch(console.error).finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total jobs</p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setStatus(''); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!status ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${status === s ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Job</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Posted By</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Claimed By</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-16"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" /></td></tr>}
            {!loading && jobs.length === 0 && <tr><td colSpan={5} className="text-center py-16 text-slate-500">No jobs found</td></tr>}
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{j.title}</p>
                  <p className="text-slate-500 text-xs">{j.tradeType} · {j.state}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[j.status] ?? 'bg-slate-700 text-slate-300'}`}>{j.status}</span>
                </td>
                <td className="px-6 py-4 text-slate-300">{j.postedBy?.name ?? '–'}</td>
                <td className="px-6 py-4 text-slate-300">{j.claimedBy?.name ?? <span className="text-slate-600">Unclaimed</span>}</td>
                <td className="px-6 py-4 text-slate-400">{new Date(j.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
