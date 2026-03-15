'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import {
  ArrowLeft, AlertTriangle, User, Briefcase, DollarSign,
  Calendar, CheckCircle, XCircle, Shield, MessageSquare, Clock,
} from 'lucide-react';

export default function DisputeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState<'contractor' | 'client' | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [addStrike, setAddStrike] = useState(false);

  useEffect(() => {
    api.get(`/admin/disputes/${id}`)
      .then((r) => setDispute(r.data.data.dispute))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResolve() {
    if (!resolution) return;
    setResolving(true);
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { resolution, adminNotes, addStrike });
      router.push('/dashboard/disputes');
    } catch (e) { console.error(e); }
    finally { setResolving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (!dispute) return (
    <div className="text-center py-32 text-slate-500">Dispute not found</div>
  );

  const job = dispute.job;
  const isOpen = dispute.status === 'open' || dispute.status === 'under_review';

  return (
    <div>
      {/* Header */}
      <button onClick={() => router.push('/dashboard/disputes')}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Disputes
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={24} /> Dispute Detail
          </h1>
          <p className="text-slate-400 text-sm mt-1">ID: {dispute.id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
          dispute.status === 'open' ? 'bg-red-500/15 text-red-400' :
          dispute.status === 'under_review' ? 'bg-amber-500/15 text-amber-400' :
          'bg-emerald-500/15 text-emerald-400'
        }`}>{dispute.status.replace(/_/g, ' ').toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Reason */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Dispute Reason
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">{dispute.reason}</p>
            {dispute.evidence && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Evidence</p>
                <p className="text-slate-300 text-sm">{dispute.evidence}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-3">
              Raised by: <span className="text-slate-300">{dispute.raisedBy}</span> on {new Date(dispute.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Job Info */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-blue-400" /> Job Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Title</span>
                <span className="text-white text-sm font-medium">{job.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Status</span>
                <span className="text-amber-400 text-sm">{job.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Referee</span>
                <span className="text-white text-sm">{job.postedBy?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Contractor</span>
                <span className="text-white text-sm">{job.claimedBy?.name ?? '—'}</span>
              </div>
              {job.clientLead && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Client</span>
                  <span className="text-white text-sm">{job.clientLead.firstName} {job.clientLead.lastName} ({job.clientLead.email})</span>
                </div>
              )}
            </div>
          </div>

          {/* Quote Info */}
          {job.quotes?.length > 0 && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" /> Latest Quote
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Amount</span>
                  <span className="text-white text-sm font-medium">${job.quotes[0].amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Scope</span>
                  <span className="text-white text-sm max-w-xs text-right">{job.quotes[0].scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Status</span>
                  <span className="text-amber-400 text-sm">{job.quotes[0].status}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Escrow + Actions */}
        <div className="space-y-6">
          {/* Escrow */}
          {job.escrow && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield size={16} className="text-amber-400" /> Escrow
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Total</span>
                  <span className="text-white text-lg font-bold">${job.escrow.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Contractor</span>
                  <span className="text-emerald-400 text-sm">${job.escrow.contractorAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Commission</span>
                  <span className="text-blue-400 text-sm">${job.escrow.commissionAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Platform Fee</span>
                  <span className="text-amber-400 text-sm">${job.escrow.platformFeeAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-400 text-sm">Status</span>
                  <span className={`text-sm font-medium ${
                    job.escrow.status === 'funded' ? 'text-emerald-400' :
                    job.escrow.status === 'disputed' ? 'text-red-400' :
                    'text-slate-300'
                  }`}>{job.escrow.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resolve Actions */}
          {isOpen && (
            <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-amber-400" /> Resolve Dispute
              </h2>

              <div className="space-y-4">
                {/* Resolution choice */}
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setResolution('contractor')}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      resolution === 'contractor'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <CheckCircle size={14} className="inline mr-2" />
                    Release to Contractor
                    <p className="text-xs text-slate-500 mt-1">Funds released, job marked complete</p>
                  </button>
                  <button
                    onClick={() => setResolution('client')}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      resolution === 'client'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <XCircle size={14} className="inline mr-2" />
                    Refund Client
                    <p className="text-xs text-slate-500 mt-1">Funds refunded, job cancelled</p>
                  </button>
                </div>

                {/* Admin notes */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-[#050d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    placeholder="Reason for this resolution..."
                  />
                </div>

                {/* Add strike checkbox */}
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={addStrike} onChange={(e) => setAddStrike(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                  Add strike to contractor
                </label>

                {/* Resolve button */}
                <button
                  onClick={handleResolve}
                  disabled={!resolution || resolving}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolving ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          )}

          {/* Already resolved */}
          {!isOpen && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" /> Resolution
              </h2>
              <p className="text-slate-300 text-sm">
                Resolved in <span className="font-medium text-white">
                  {dispute.status === 'resolved_contractor' ? "contractor's" : "client's"}
                </span> favor
              </p>
              {dispute.adminNotes && (
                <p className="text-slate-400 text-xs mt-2">Notes: {dispute.adminNotes}</p>
              )}
              {dispute.resolvedAt && (
                <p className="text-xs text-slate-500 mt-2">
                  <Clock size={12} className="inline mr-1" />
                  {new Date(dispute.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
