'use client';
import { useEffect, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { CreditCard, Calendar, AlertTriangle, ExternalLink, CheckCircle2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformSettings } from '../../../lib/useSettings';
import { useT, useFormat, apiErrorMessage, type TranslationKey } from '../../../i18n';
import { en } from '../../../i18n/en';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || '');

interface SubData {
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    stripePriceId?: string;
  } | null;
  invoices?: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    pdf?: string;
  }>;
}

// ─── Subscribe form with card input ──────────────────────────────────────────
function SubscribeForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { subscriptionFee } = usePlatformSettings();
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.error(t('billing.sub.cardMissing'));
        return;
      }

      // Create a payment method from card details
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        toast.error(error.message || t('billing.sub.cardInvalid'));
        return;
      }

      // Send to our API
      const res = await api.post('/payments/create-subscription', {
        paymentMethodId: paymentMethod.id,
      });

      if (res.data.data?.devMode) {
        toast.success(t('billing.sub.devMode'));
        onSuccess();
        return;
      }

      // If requires confirmation (3D Secure etc.)
      if (res.data.data?.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(res.data.data.clientSecret);
        if (confirmError) {
          toast.error(confirmError.message || t('billing.sub.paymentFailed'));
          return;
        }
      }

      toast.success(t('billing.sub.created'));
      onSuccess();
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t, t('billing.sub.createFailed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubscribe} className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-navy-900 p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#f1f5f9',
                '::placeholder': { color: '#64748b' },
                iconColor: '#f59e0b',
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <Button type="submit" loading={loading} disabled={!stripe} className="w-full">
        {t('billing.sub.submit', { fee: subscriptionFee })}
      </Button>
    </form>
  );
}

// ─── Main billing page ───────────────────────────────────────────────────────
export default function BillingPage() {
  const [subData, setSubData] = useState<SubData | null>(null);
  const [connectStatus, setConnectStatus] = useState('not_connected');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const t = useT();
  const { formatDate } = useFormat();

  // Invoice states come from Stripe; fall back to the raw value.
  function invoiceStatusLabel(status: string) {
    const key = `invoiceStatus.${status}`;
    return key in en ? t(key as TranslationKey) : status;
  }

  const loadData = useCallback(async () => {
    try {
      const [subRes, conRes] = await Promise.all([
        api.get('/payments/subscription-status').catch(() => ({ data: { data: null } })),
        api.get('/payments/connect/status').catch(() => ({ data: { data: { status: 'not_connected' } } })),
      ]);
      setSubData(subRes.data.data);
      setConnectStatus(conRes.data.data?.status || 'not_connected');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sub = subData?.subscription;

  async function handleCancel() {
    if (!confirm(t('billing.sub.cancelConfirm'))) return;
    setActionLoading(true);
    try {
      await api.post('/payments/cancel-subscription');
      toast.success(t('billing.sub.cancelSuccess'));
      await loadData();
    } catch (err: any) { toast.error(apiErrorMessage(err, t, t('billing.actionFailed'))); }
    finally { setActionLoading(false); }
  }

  async function handleConnect() {
    setActionLoading(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.location.href = res.data.data.url;
    } catch (err: any) { toast.error(apiErrorMessage(err, t, t('billing.actionFailed'))); }
    finally { setActionLoading(false); }
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-white">{t('billing.title')}</h1>

      {/* Subscription */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" /> {t('billing.sub.title')}
          </h2>
          {sub?.status === 'active' && <Badge variant="green">{t('billing.sub.active')}</Badge>}
          {sub?.status === 'past_due' && <Badge variant="red">{t('billing.sub.pastDue')}</Badge>}
          {sub?.status === 'cancelled' && <Badge variant="red">{t('billing.sub.cancelled')}</Badge>}
          {!sub && <Badge variant="default">{t('billing.sub.none')}</Badge>}
        </div>

        {sub ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-surface-muted">
              <Calendar className="w-4 h-4" />
              <span>{t('billing.sub.periodEnds')} <span className="text-slate-200">{formatDate(sub.currentPeriodEnd)}</span></span>
            </div>
            {sub.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('billing.sub.willCancel')}</span>
              </div>
            )}
            {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
              <Button variant="danger" size="sm" onClick={handleCancel} loading={actionLoading}>
                {t('billing.sub.cancel')}
              </Button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-surface-muted mb-4">
              {t('billing.sub.prompt')}
            </p>
            <Elements
              stripe={stripePromise}
              options={{
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#f59e0b',
                    colorBackground: '#0f172a',
                    colorText: '#f1f5f9',
                    borderRadius: '12px',
                  },
                },
              }}
            >
              <SubscribeForm onSuccess={() => loadData()} />
            </Elements>
          </div>
        )}
      </Card>

      {/* Stripe Connect */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> {t('billing.payout.title')}
          </h2>
          {connectStatus === 'active' ? (
            <Badge variant="green"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('billing.payout.connected')}</Badge>
          ) : connectStatus === 'pending' ? (
            <Badge variant="amber">{t('billing.payout.pending')}</Badge>
          ) : (
            <Badge variant="default">{t('billing.payout.notConnected')}</Badge>
          )}
        </div>
        <p className="text-sm text-surface-muted mb-4">
          {connectStatus === 'active'
            ? t('billing.payout.activeBody')
            : t('billing.payout.inactiveBody')}
        </p>
        {connectStatus !== 'active' && (
          <Button variant="outline" onClick={handleConnect} loading={actionLoading}>
            <ExternalLink className="w-4 h-4" /> {connectStatus === 'pending' ? t('billing.payout.completeSetup') : t('billing.payout.connect')}
          </Button>
        )}
      </Card>

      {/* Invoice History */}
      {subData?.invoices && subData.invoices.length > 0 && (
        <Card>
          <h2 className="text-lg font-heading font-semibold text-white mb-4">{t('billing.invoices.title')}</h2>
          <div className="space-y-2">
            {subData.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-surface-border last:border-b-0">
                <div>
                  <p className="text-sm text-slate-200">${inv.amount.toFixed(2)}</p>
                  <p className="text-xs text-surface-muted">{formatDate(inv.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === 'paid' ? 'green' : 'amber'}>{invoiceStatusLabel(inv.status)}</Badge>
                  {inv.pdf && (
                    <a href={inv.pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline">
                      {t('billing.invoices.pdf')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
