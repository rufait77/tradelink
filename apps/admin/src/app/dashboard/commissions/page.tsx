'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Commission {
  id: string; amount: number; status: string; createdAt: string;
  job?: { title: string };
  referrer?: { name: string; email: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

export default function CommissionsPage() {
  const [items, setItems] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/commissions', { params: { status, page, pageSize: 20 } })
      .then((r) => { setItems(r.data.data.items); setTotal(r.data.data.total); })
      .catch(console.error).finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Commissions</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total commission records</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'pending', 'paid', 'cancelled'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${status === s ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Job</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Referrer</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Amount</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-16"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="text-center py-16 text-slate-500">No commissions found</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 text-slate-300">{c.job?.title ?? '–'}</td>
                <td className="px-6 py-4">
                  <p className="text-white">{c.referrer?.name ?? '–'}</p>
                  <p className="text-slate-500 text-xs">{c.referrer?.email}</p>
                </td>
                <td className="px-6 py-4 font-semibold text-amber-400">${c.amount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? 'bg-slate-700 text-slate-300'}`}>{c.status}</span>
                </td>
                <td className="px-6 py-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
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
