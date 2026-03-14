'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { PageLoader } from '../../../../components/ui/spinner';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  FileText, CheckCircle2, X, DollarSign,
  Calendar, ArrowLeft, AlertTriangle,
} from 'lucide-react';

interface QuoteData {
  clientName: string;
  job: { title: string; tradeType: string; status: string };
  contractor: { name: string; avgRating: number } | null;
  activeQuote: {
    id: string; amount: number; scope: string;
    scheduledDate: string; status: string;
  } | null;
  referee: { name: string };
}

export default function QuoteApprovalPage() {
  const { token } = useParams();
  const router = useRouter();
  const [data, setData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/client/${token}`);
        setData(res.data.data);
      } catch {
        toast.error('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleApprove() {
    if (!data?.activeQuote) return;
    setActionLoading(true);
    try {
      await api.post(`/client/${token}/quote/${data.activeQuote.id}/approve`);
      toast.success('Quote approved! You will receive a payment link shortly.');
      router.push(`/client/${token}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve quote');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!data?.activeQuote) return;
    setActionLoading(true);
    try {
      await api.post(`/client/${token}/quote/${data.activeQuote.id}/reject`, {
        reason: rejectReason || undefined,
      });
      toast.success('Quote rejected. The contractor can submit a revised quote.');
      router.push(`/client/${token}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject quote');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!data || !data.activeQuote) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-heading font-bold text-white mb-2">No Active Quote</h1>
        <p className="text-surface-muted mb-6">There is no quote waiting for your review right now.</p>
        <Button variant="outline" onClick={() => router.push(`/client/${token}`)}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const q = data.activeQuote;

  // Calculate fee breakdown (20% referral, 5% platform = 25% total)
  const platformFeePct = 0.05;
  const commissionPct = 0.20;
  const platformFee = q.amount * platformFeePct;
  const commission = q.amount * commissionPct;
  const contractorPayout = q.amount - platformFee - commission;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white">Review Quote</h1>
            <p className="text-xs text-surface-muted">
              From {data.contractor?.name ?? 'Contractor'} for &quot;{data.job.title}&quot;
            </p>
          </div>
        </div>

        {/* Quote amount */}
        <div className="text-center py-6 mb-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-surface-border">
          <p className="text-xs text-surface-muted mb-1">Total Quote Amount</p>
          <p className="text-4xl font-heading font-bold text-white">{formatCurrency(q.amount)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-sm text-surface-muted">
              Scheduled: {formatDate(q.scheduledDate)}
            </p>
          </div>
        </div>

        {/* Scope */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-2">Scope of Work</h3>
          <div className="p-4 rounded-xl bg-navy-900 border border-surface-border">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{q.scope}</p>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Payment Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-muted">Contractor Payout (75%)</span>
              <span className="text-white">{formatCurrency(contractorPayout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">Referral Commission (20%)</span>
              <span className="text-white">{formatCurrency(commission)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">Platform Fee (5%)</span>
              <span className="text-white">{formatCurrency(platformFee)}</span>
            </div>
            <div className="border-t border-surface-border pt-2 mt-2 flex justify-between font-semibold">
              <span className="text-white">You Pay</span>
              <span className="text-emerald-400">{formatCurrency(q.amount)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {q.status === 'sent' && !showReject && (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleApprove} loading={actionLoading}>
              <CheckCircle2 className="w-4 h-4" /> Approve Quote
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setShowReject(true)}>
              <X className="w-4 h-4" /> Reject Quote
            </Button>
          </div>
        )}

        {q.status === 'sent' && showReject && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Let the contractor know why so they can submit a revised quote:
            </p>
            <textarea
              className="input-field resize-none w-full"
              rows={3}
              placeholder="e.g. The price is too high, or the scope doesn't match what I need..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={handleReject} loading={actionLoading}>
                <X className="w-4 h-4" /> Confirm Rejection
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {q.status !== 'sent' && (
          <Badge variant={q.status === 'approved' ? 'green' : 'red'} className="text-sm px-4 py-2">
            {q.status === 'approved' ? '✅ Quote Approved' : `Quote ${q.status}`}
          </Badge>
        )}
      </Card>
    </div>
  );
}
