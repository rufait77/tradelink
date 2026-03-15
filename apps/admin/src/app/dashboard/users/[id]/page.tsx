'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import {
  ArrowLeft, User, Shield, ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, FileText, CheckCircle, XCircle, Ban, Plus, Trash2,
  Briefcase, DollarSign, Calendar, ExternalLink, Clock,
} from 'lucide-react';

const strikeTypeLabels: Record<string, string> = {
  ghost: 'Ghosting', bypass_attempt: 'Bypass Attempt', client_report: 'Client Report',
};

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  // Strike modal
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [strikeType, setStrikeType] = useState('client_report');
  const [strikeReason, setStrikeReason] = useState('');

  function load() {
    api.get(`/admin/users/${id}`)
      .then((r) => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function handleAction(action: string, body?: any) {
    setActionLoading(action);
    try {
      if (action === 'verify') await api.put(`/admin/users/${id}/verify`, { verified: true });
      else if (action === 'unverify') await api.put(`/admin/users/${id}/verify`, { verified: false });
      else if (action === 'suspend') await api.put(`/admin/users/${id}/suspend`);
      else if (action === 'unsuspend') await api.put(`/admin/users/${id}/unsuspend`);
      else if (action === 'ban') await api.put(`/admin/users/${id}/ban`, { banned: true });
      else if (action === 'unban') await api.put(`/admin/users/${id}/ban`, { banned: false });
      load();
    } catch (e) { console.error(e); }
    finally { setActionLoading(''); }
  }

  async function handleAddStrike() {
    setActionLoading('strike');
    try {
      await api.post(`/admin/users/${id}/strike`, { type: strikeType, reason: strikeReason });
      setShowStrikeModal(false);
      setStrikeReason('');
      load();
    } catch (e) { console.error(e); }
    finally { setActionLoading(''); }
  }

  async function handleRemoveStrike(strikeId: string) {
    setActionLoading(`remove-${strikeId}`);
    try {
      await api.delete(`/admin/users/${id}/strike/${strikeId}`);
      load();
    } catch (e) { console.error(e); }
    finally { setActionLoading(''); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-center py-32 text-slate-500">User not found</div>;

  const { user, recentJobs, recentCommissions, strikes } = data;
  const profile = user.profile;

  return (
    <div>
      {/* Header */}
      <button onClick={() => router.push('/dashboard/users')}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Users
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-[#050d1a] text-xl font-bold">
          {user.name?.[0] ?? '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {user.name}
            {profile?.isAdminVerified && <ShieldCheck size={20} className="text-emerald-400" />}
            {profile?.isBanned && <Ban size={20} className="text-red-400" />}
          </h1>
          <p className="text-slate-400 text-sm">{user.email} · {user.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Info & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <User size={16} className="text-blue-400" /> Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Trade Types</span>
                <p className="text-white">{profile?.tradeTypes?.join(', ') || '—'}</p></div>
              <div><span className="text-slate-500">License</span>
                <p className="text-white">{profile?.licenseNumber || '—'}</p></div>
              <div><span className="text-slate-500">Location</span>
                <p className="text-white">{profile ? `${profile.city}, ${profile.state} ${profile.zipCode}` : '—'}</p></div>
              <div><span className="text-slate-500">Experience</span>
                <p className="text-white">{profile?.yearsExperience ?? 0} years</p></div>
              <div><span className="text-slate-500">Rating</span>
                <p className="text-white">⭐ {profile?.avgRating?.toFixed(1) ?? '0.0'}</p></div>
              <div><span className="text-slate-500">Jobs Completed</span>
                <p className="text-white">{profile?.totalJobsCompleted ?? 0}</p></div>
              <div><span className="text-slate-500">Total Earned</span>
                <p className="text-emerald-400 font-medium">${(profile?.totalEarned ?? 0).toLocaleString()}</p></div>
              <div><span className="text-slate-500">Subscription</span>
                <p className={`font-medium ${user.subscription?.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {user.subscription?.status ?? 'None'}
                </p></div>
            </div>
          </div>

          {/* Documents (5C) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText size={16} className="text-amber-400" /> Documents & Verification
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl">
                <div>
                  <p className="text-sm text-white">License File</p>
                  <p className="text-xs text-slate-500">{profile?.licenseFileUrl ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
                {profile?.licenseFileUrl && (
                  <a href={profile.licenseFileUrl} target="_blank" rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                    <ExternalLink size={12} /> View
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl">
                <div>
                  <p className="text-sm text-white">Insurance Document</p>
                  <p className="text-xs text-slate-500">{profile?.insuranceUrl ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
                {profile?.insuranceUrl && (
                  <a href={profile.insuranceUrl} target="_blank" rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                    <ExternalLink size={12} /> View
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl">
                <div>
                  <p className="text-sm text-white">Certifications</p>
                  <p className="text-xs text-slate-500">
                    {profile?.certifications ? `${(profile.certifications as any[]).length} uploaded` : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Strike History (5D) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" /> Strike History ({strikes?.length ?? 0})
              </h2>
              <button onClick={() => setShowStrikeModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-all">
                <Plus size={13} /> Add Strike
              </button>
            </div>
            {(!strikes || strikes.length === 0) ? (
              <p className="text-slate-500 text-sm text-center py-6">No strikes on record</p>
            ) : (
              <div className="space-y-2">
                {strikes.map((s: any) => (
                  <div key={s.id} className="flex items-start justify-between p-3 bg-slate-800/40 rounded-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          s.isWarning ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                        }`}>{s.isWarning ? 'Warning' : 'Strike'}</span>
                        <span className="text-xs text-slate-400">{strikeTypeLabels[s.type] ?? s.type}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{s.reason}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleRemoveStrike(s.id)}
                      disabled={actionLoading === `remove-${s.id}`}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-blue-400" /> Recent Jobs
            </h2>
            {recentJobs?.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No jobs</p>
            ) : (
              <div className="space-y-2">
                {recentJobs?.map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl">
                    <div>
                      <p className="text-sm text-white">{j.title}</p>
                      <p className="text-xs text-slate-500">{j.tradeType} · {j.status}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Verification Actions */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" /> Verification
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Admin Verified</span>
                <span className={`text-sm font-medium ${profile?.isAdminVerified ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {profile?.isAdminVerified ? 'Yes ✅' : 'No'}
                </span>
              </div>
              <button
                onClick={() => handleAction(profile?.isAdminVerified ? 'unverify' : 'verify')}
                disabled={!!actionLoading}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                  profile?.isAdminVerified
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400'
                }`}
              >
                {profile?.isAdminVerified ? 'Remove Verification' : 'Verify User'}
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield size={16} className="text-amber-400" /> Account Status
            </h2>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Status</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  profile?.isBanned ? 'bg-red-500/15 text-red-400' :
                  profile?.isSuspended ? 'bg-amber-500/15 text-amber-400' :
                  'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {profile?.isBanned ? 'Banned' : profile?.isSuspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              {profile?.suspendedUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Until</span>
                  <span className="text-sm text-amber-400">{new Date(profile.suspendedUntil).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Ghost Strikes</span>
                <span className="text-sm text-white">{profile?.ghostStrikes ?? 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              {!profile?.isBanned && (
                <button
                  onClick={() => handleAction(profile?.isSuspended ? 'unsuspend' : 'suspend')}
                  disabled={!!actionLoading}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                    profile?.isSuspended
                      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  }`}
                >
                  {profile?.isSuspended ? 'Unsuspend' : 'Suspend'}
                </button>
              )}
              <button
                onClick={() => handleAction(profile?.isBanned ? 'unban' : 'ban')}
                disabled={!!actionLoading}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                  profile?.isBanned
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
                }`}
              >
                {profile?.isBanned ? 'Lift Ban' : '⚠️ Permanently Ban'}
              </button>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" /> Subscription
            </h2>
            {user.subscription ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-medium ${user.subscription.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {user.subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Period End</span>
                  <span className="text-white">{new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No subscription</p>
            )}
          </div>
        </div>
      </div>

      {/* Strike Modal */}
      {showStrikeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowStrikeModal(false)}>
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">Add Strike</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Type</label>
                <select value={strikeType} onChange={e => setStrikeType(e.target.value)}
                  className="w-full bg-[#050d1a] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option value="ghost">Ghosting</option>
                  <option value="bypass_attempt">Bypass Attempt</option>
                  <option value="client_report">Client Report</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Reason</label>
                <textarea value={strikeReason} onChange={e => setStrikeReason(e.target.value)} rows={3}
                  className="w-full bg-[#050d1a] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  placeholder="Describe the reason..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStrikeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Cancel</button>
                <button onClick={handleAddStrike} disabled={!strikeReason || !!actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium disabled:opacity-50">
                  {actionLoading === 'strike' ? 'Adding...' : 'Add Strike'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
