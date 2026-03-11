'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import { Search, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string; name: string; email: string; role: string;
  isActive: boolean; isVerified: boolean; createdAt: string;
  subscription?: { status: string };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/users', { params: { search, role, page, pageSize: 20 } })
      .then((r) => { setUsers(r.data.data.users); setTotal(r.data.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, role, page]);

  useEffect(() => { load(); }, [load]);

  async function toggleSuspend(user: User) {
    setActionId(user.id);
    try {
      const endpoint = user.isActive ? `/admin/users/${user.id}/suspend` : `/admin/users/${user.id}/unsuspend`;
      await api.put(endpoint);
      load();
    } catch (e) { console.error(e); }
    finally { setActionId(null); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email..."
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Roles</option>
          <option value="contractor">Contractor</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-slate-400 font-medium">User</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Role</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-slate-400 font-medium">Joined</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center py-16 text-slate-500">
                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16 text-slate-500">No users found</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-slate-500 text-xs">{u.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                    u.role === 'admin' ? 'bg-amber-500/15 text-amber-400' :
                    u.role === 'contractor' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700 text-slate-300'
                  }`}>{u.role}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    u.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                </td>
                <td className="px-6 py-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleSuspend(u)}
                      disabled={actionId === u.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        u.isActive
                          ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                          : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      } disabled:opacity-50`}
                    >
                      {u.isActive ? <><UserX size={13} /> Suspend</> : <><UserCheck size={13} /> Unsuspend</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
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
