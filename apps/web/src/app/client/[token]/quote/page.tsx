'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { PageLoader } from '../../../../components/ui/spinner';
import { formatCurrency } from '../../../../lib/utils';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import {
  FileText, CheckCircle2, X, DollarSign,
  Calendar, ArrowLeft, AlertTriangle, MessageSquare, CreditCard, Shield,
} from 'lucide-react';
import { useT, useLabels, useFormat } from '../../../../i18n';

interface QuoteData {
  clientName: string;
  job: { title: string; tradeType: string; status: string };
  contractor: { name: string; avgRating: number } | null;
  activeQuote: {
    id: string; amount: number; scope: string;
    scheduledDate: string; status: string;
    platformFeePct?: number; commissionPct?: number;
  } | null;
  escrow: {
    status: string; totalAmount: number; paymentLink?: string; paidAt?: string;
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
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const t = useT();
  const { apiErrorMessage } = useLabels();
  const { formatDate } = useFormat();

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setData(res.data.data);
      } catch {
        toast.error(t('client.invalidLink'));
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
      const res = await clientApi.post(`/client/${token}/quote/${data.activeQuote.id}/approve`);
      const paymentLink = res.data?.data?.paymentLink;
      if (paymentLink) {
        toast.success(t('clientQuote.toast.approvedRedirect'));
        setTimeout(() => { window.location.href = paymentLink; }, 1500);
      } else {
        toast.success(t('clientQuote.toast.approved'));
        router.push(`/client/${token}`);
      }
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('clientQuote.toast.approveFailed')));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!data?.activeQuote) return;
    setActionLoading(true);
    try {
      await clientApi.post(`/client/${token}/quote/${data.activeQuote.id}/reject`, {
        reason: rejectReason || undefined,
      });
      toast.success(t('clientQuote.toast.rejected'));
      router.push(`/client/${token}`);
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('clientQuote.toast.rejectFailed')));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCounterOffer() {
    if (!data?.activeQuote || !counterAmount) return;
    setActionLoading(true);
    try {
      await clientApi.post(`/client/${token}/quote/${data.activeQuote.id}/counter`, {
        amount: parseFloat(counterAmount),
        message: counterMessage || undefined,
      });
      toast.success(t('clientQuote.toast.counterSent'));
      router.push(`/client/${token}`);
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('clientQuote.toast.counterFailed')));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!data || !data.activeQuote) {
    // If escrow exists with payment link, show payment section
    if (data?.escrow?.paymentLink && data.escrow.status === 'pending') {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={() => router.push(`/client/${token}`)}
            className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> {t('client.back')}
          </button>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-white">{t('clientQuote.escrowPay.title')}</h1>
                <p className="text-xs text-surface-muted">
                  {t('clientQuote.escrowPay.subtitle', { title: data.job.title })}
                </p>
              </div>
            </div>

            {/* Trust badge */}
            <div className="mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{t('clientQuote.escrowPay.protectedTitle')}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('clientQuote.escrowPay.protectedLead')} <strong className="text-white">{t('clientQuote.escrowPay.protectedStrong')}</strong>{t('clientQuote.escrowPay.protectedRest')}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center py-6 mb-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-surface-border">
              <p className="text-xs text-surface-muted mb-1">{t('clientQuote.escrowPay.total')}</p>
              <p className="text-4xl font-heading font-bold text-white">{formatCurrency(data.escrow.totalAmount)}</p>
            </div>

            <a
              href={data.escrow.paymentLink}
              className="block w-full text-center py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-lg shadow-emerald-500/20"
            >
              <CreditCard className="w-5 h-5 inline mr-2" />
              {t('clientQuote.escrowPay.cta', { amount: formatCurrency(data.escrow.totalAmount) })}
            </a>

            <p className="text-xs text-center text-surface-muted mt-3">
              {t('clientQuote.escrowPay.stripeNote')}
            </p>
          </Card>
        </div>
      );
    }

    if (data?.escrow?.status === 'funded') {
      return (
        <div className="max-w-lg mx-auto text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">{t('clientQuote.funded.title')}</h1>
          <p className="text-surface-muted mb-6">{t('clientQuote.funded.body')}</p>
          <Button variant="outline" onClick={() => router.push(`/client/${token}`)}>
            <ArrowLeft className="w-4 h-4" /> {t('client.back')}
          </Button>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-heading font-bold text-white mb-2">{t('clientQuote.none.title')}</h1>
        <p className="text-surface-muted mb-6">{t('clientQuote.none.body')}</p>
        <Button variant="outline" onClick={() => router.push(`/client/${token}`)}>
          <ArrowLeft className="w-4 h-4" /> {t('client.back')}
        </Button>
      </div>
    );
  }

  const q = data.activeQuote;

  // Calculate fee breakdown using the quote's snapshotted percentages
  const quotePlatformPct = q.platformFeePct ?? 5;
  const quoteCommissionPct = q.commissionPct ?? 20;
  const platformFee = q.amount * quotePlatformPct / 100;
  const commission = q.amount * quoteCommissionPct / 100;
  const contractorPayout = q.amount - platformFee - commission;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> {t('client.back')}
      </button>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white">{t('clientQuote.title')}</h1>
            <p className="text-xs text-surface-muted">
              {t('clientQuote.from', { name: data.contractor?.name ?? t('clientQuote.fallbackContractor'), title: data.job.title })}
            </p>
          </div>
        </div>

        {/* Quote amount */}
        <div className="text-center py-6 mb-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-surface-border">
          <p className="text-xs text-surface-muted mb-1">{t('clientQuote.totalAmount')}</p>
          <p className="text-4xl font-heading font-bold text-white">{formatCurrency(q.amount)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-sm text-surface-muted">
              {t('clientQuote.scheduled', { date: formatDate(q.scheduledDate) })}
            </p>
          </div>
        </div>

        {/* Scope */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-2">{t('clientQuote.scope')}</h3>
          <div className="p-4 rounded-xl bg-navy-900 border border-surface-border">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{q.scope}</p>
          </div>
        </div>

        {/* Escrow trust badge */}
        <div className="mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">{t('clientQuote.escrow.title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('clientQuote.escrow.bodyLead')} <strong className="text-white">{t('clientQuote.escrow.bodyStrong')}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> {t('clientQuote.breakdown.title')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-muted">{t('clientQuote.breakdown.contractor', { pct: 100 - quoteCommissionPct - quotePlatformPct })}</span>
              <span className="text-white">{formatCurrency(contractorPayout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">{t('clientQuote.breakdown.commission', { pct: quoteCommissionPct })}</span>
              <span className="text-white">{formatCurrency(commission)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">{t('clientQuote.breakdown.platform', { pct: quotePlatformPct })}</span>
              <span className="text-white">{formatCurrency(platformFee)}</span>
            </div>
            <div className="border-t border-surface-border pt-2 mt-2 flex justify-between font-semibold">
              <span className="text-white">{t('clientQuote.breakdown.youPay')}</span>
              <span className="text-emerald-400">{formatCurrency(q.amount)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons — Approve / Negotiate / Reject */}
        {q.status === 'sent' && !showReject && !showNegotiate && (
          <div className="space-y-3">
            <Button className="w-full" onClick={handleApprove} loading={actionLoading}>
              <CheckCircle2 className="w-4 h-4" /> {t('clientQuote.approve', { amount: formatCurrency(q.amount) })}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowNegotiate(true)}>
                <MessageSquare className="w-4 h-4" /> {t('clientQuote.negotiate')}
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setShowReject(true)}>
                <X className="w-4 h-4" /> {t('clientQuote.reject')}
              </Button>
            </div>
          </div>
        )}

        {/* Negotiate form */}
        {q.status === 'sent' && showNegotiate && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 font-medium">
              {t('clientQuote.negotiate.intro')}
            </p>
            <div>
              <label className="text-xs text-surface-muted mb-1 block">{t('clientQuote.negotiate.amount')}</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder={t('clientQuote.negotiate.amountPlaceholder')}
                value={counterAmount}
                onChange={(e: any) => setCounterAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-surface-muted mb-1 block">{t('clientQuote.negotiate.message')}</label>
              <textarea
                className="input-field resize-none w-full"
                rows={3}
                placeholder={t('clientQuote.negotiate.messagePlaceholder')}
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleCounterOffer} loading={actionLoading}
                disabled={!counterAmount || parseFloat(counterAmount) <= 0}>
                <MessageSquare className="w-4 h-4" /> {t('clientQuote.negotiate.send')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowNegotiate(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {q.status === 'sent' && showReject && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              {t('clientQuote.reject.intro')}
            </p>
            <textarea
              className="input-field resize-none w-full"
              rows={3}
              placeholder={t('clientQuote.reject.placeholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={handleReject} loading={actionLoading}>
                <X className="w-4 h-4" /> {t('clientQuote.reject.confirm')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {q.status !== 'sent' && (
          <Badge variant={q.status === 'approved' ? 'green' : 'red'} className="text-sm px-4 py-2">
            {q.status === 'approved' ? t('clientQuote.approvedBadge') : t('clientQuote.statusBadge', { status: q.status })}
          </Badge>
        )}
      </Card>
    </div>
  );
}
