'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string; action: string; entityType: string; entityId?: string;
  oldValue?: string; newValue?: string; createdAt: string;
  admin?: { name: string; email: string };
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/audit-log', { params: { page, pageSize: 30 } })
      .then((r) => { setItems(r.data.data.items); setTotal(r.data.data.total); })
      .catch(console.error).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-slate-400 text-sm mt-1">All admin actions recorded for compliance</p>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Action</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Entity</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Admin</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-16"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="text-center py-16 text-slate-500">No audit entries</td></tr>}
            {items.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-mono text-xs bg-slate-800 text-amber-400 px-2.5 py-1 rounded-lg">{e.action}</span>
                </td>
                <td className="px-6 py-4 text-slate-300">
                  <span className="text-slate-400">{e.entityType}</span>
                  {e.entityId && <span className="text-slate-600 text-xs ml-2 font-mono">#{e.entityId.slice(0,8)}</span>}
                </td>
                <td className="px-6 py-4">
                  <p className="text-white text-xs">{e.admin?.name ?? '–'}</p>
                  <p className="text-slate-500 text-xs">{e.admin?.email}</p>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
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
