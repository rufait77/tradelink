'use client';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonStats, SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { DollarSign, TrendingUp, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useT, useLabels, useFormat, type TranslationKey } from '../../../i18n';
import { en } from '../../../i18n/en';

interface EarningsSummary {
  totalEarned: number; pendingAmount: number; thisMonthEarned: number; allTimeJobs: number;
}

interface Commission {
  id: string; amount: number; status: string; createdAt: string; paidAt?: string;
  job: { title: string; tradeType: string };
}

export default function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [connectStatus, setConnectStatus] = useState<string>('not_connected');
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const t = useT();
  const { tradeLabel, apiErrorMessage } = useLabels();
  const { formatDate } = useFormat();

  // Commission payout states come from the API; fall back to the raw value.
  function commissionStatusLabel(status: string) {
    const key = `commissionStatus.${status}`;
    return key in en ? t(key as TranslationKey) : status;
  }

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, comRes, conRes] = await Promise.all([
          api.get('/earnings/summary').catch(() => ({ data: { data: null } })),
          api.get('/commissions?pageSize=20').catch(() => ({ data: { data: { items: [] } } })),
          api.get('/payments/connect/status').catch(() => ({ data: { data: { status: 'not_connected' } } })),
        ]);
        const s = sumRes.data.data;
        if (s) {
          setSummary({
            totalEarned: s.totalEarned ?? 0,
            pendingAmount: s.pending ?? s.pendingAmount ?? 0,
            thisMonthEarned: s.thisMonth ?? s.thisMonthEarned ?? 0,
            allTimeJobs: s.totalReferrals ?? s.allTimeJobs ?? 0,
          });
        }
        const comData = comRes.data.data;
        setCommissions(comData?.items || comData?.commissions || []);
        setConnectStatus(conRes.data.data?.status || 'not_connected');
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleConnect() {
    setConnectLoading(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.location.href = res.data.data.url;
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('earnings.payout.error')));
    } finally {
      setConnectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-white">{t('earnings.title')}</h1>
        <SkeletonStats count={4} />
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  const stats = [
    { icon: DollarSign, label: t('earnings.stat.totalEarned'), value: formatCurrency(summary?.totalEarned || 0), color: 'text-emerald-400' },
    { icon: Clock, label: t('earnings.stat.pending'), value: formatCurrency(summary?.pendingAmount || 0), color: 'text-amber-400' },
    { icon: TrendingUp, label: t('earnings.stat.thisMonth'), value: formatCurrency(summary?.thisMonthEarned || 0), color: 'text-blue-400' },
    { icon: CreditCard, label: t('earnings.stat.totalJobs'), value: String(summary?.allTimeJobs || 0), color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold text-white">{t('earnings.title')}</h1>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-surface-muted">{stat.label}</p>
                  <p className="text-lg font-heading font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Stripe Connect */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-semibold text-white mb-1">{t('earnings.payout.title')}</h2>
            <p className="text-sm text-surface-muted">
              {connectStatus === 'active'
                ? t('earnings.payout.active')
                : connectStatus === 'pending'
                ? t('earnings.payout.pending')
                : t('earnings.payout.notConnected')}
            </p>
          </div>
          {connectStatus === 'active' ? (
            <Badge variant="green">{t('earnings.payout.connected')}</Badge>
          ) : connectStatus === 'pending' ? (
            <Badge variant="amber">{t('earnings.payout.pendingBadge')}</Badge>
          ) : (
            <Button onClick={handleConnect} loading={connectLoading} size="sm">
              <ExternalLink className="w-4 h-4" /> {t('earnings.payout.connect')}
            </Button>
          )}
        </div>
      </Card>

      {/* Commission history */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-white mb-4">{t('earnings.history.title')}</h2>
        {commissions.length === 0 ? (
          <EmptyState icon={DollarSign} title={t('earnings.history.empty.title')} description={t('earnings.history.empty.desc')} />
        ) : (
          <div className="space-y-2">
            {commissions.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{c.job.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="amber">{tradeLabel(c.job.tradeType)}</Badge>
                    <span className="text-xs text-surface-muted">{formatDate(c.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(c.amount)}</p>
                  <Badge
                    variant={c.status === 'paid' ? 'green' : c.status === 'failed' ? 'red' : 'amber'}
                    className="mt-1"
                  >
                    {commissionStatusLabel(c.status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
