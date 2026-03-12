'use client';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { CreditCard, Calendar, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubData {
  status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean;
  stripePriceId?: string;
}

export default function BillingPage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [connectStatus, setConnectStatus] = useState('not_connected');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, conRes] = await Promise.all([
          api.get('/payments/subscription-status').catch(() => ({ data: { data: null } })),
          api.get('/payments/connect/status').catch(() => ({ data: { data: { status: 'not_connected' } } })),
        ]);
        setSub(subRes.data.data);
        setConnectStatus(conRes.data.data?.status || 'not_connected');
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleSubscribe() {
    setActionLoading(true);
    try {
      const res = await api.post('/payments/create-subscription');
      if (res.data.data?.url) window.location.href = res.data.data.url;
      else toast.success('Subscription created!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll retain access until the end of your billing period.')) return;
    setActionLoading(true);
    try {
      await api.post('/payments/cancel-subscription');
      toast.success('Subscription will cancel at period end.');
      const res = await api.get('/payments/subscription-status');
      setSub(res.data.data);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  }

  async function handleConnect() {
    setActionLoading(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.location.href = res.data.data.url;
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-white">Billing</h1>

      {/* Subscription */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" /> Subscription
            </h2>
          </div>
          {sub?.status === 'active' && <Badge variant="green">Active</Badge>}
          {sub?.status === 'past_due' && <Badge variant="red">Past Due</Badge>}
          {sub?.status === 'cancelled' && <Badge variant="red">Cancelled</Badge>}
          {!sub && <Badge variant="default">No Subscription</Badge>}
        </div>

        {sub ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-surface-muted">
              <Calendar className="w-4 h-4" />
              <span>Current period ends: <span className="text-slate-200">{formatDate(sub.currentPeriodEnd)}</span></span>
            </div>
            {sub.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Will cancel at end of current period</span>
              </div>
            )}
            {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
              <Button variant="danger" size="sm" onClick={handleCancel} loading={actionLoading}>
                Cancel Subscription
              </Button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-surface-muted mb-4">Subscribe to unlock all Tradelink features including posting referrals and claiming jobs.</p>
            <Button onClick={handleSubscribe} loading={actionLoading}>
              Subscribe — $9.99/mo
            </Button>
          </div>
        )}
      </Card>

      {/* Stripe Connect */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
              <DollarSignIcon className="w-5 h-5 text-emerald-400" /> Payout Account
            </h2>
          </div>
          {connectStatus === 'active' ? (
            <Badge variant="green"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>
          ) : connectStatus === 'pending' ? (
            <Badge variant="amber">Pending</Badge>
          ) : (
            <Badge variant="default">Not Connected</Badge>
          )}
        </div>
        <p className="text-sm text-surface-muted mb-4">
          {connectStatus === 'active'
            ? 'Your bank account is connected. Commission payouts will be deposited automatically.'
            : 'Connect your bank account via Stripe to receive commission payouts.'}
        </p>
        {connectStatus !== 'active' && (
          <Button variant="outline" onClick={handleConnect} loading={actionLoading}>
            <ExternalLink className="w-4 h-4" /> {connectStatus === 'pending' ? 'Complete Setup' : 'Connect Stripe'}
          </Button>
        )}
      </Card>
    </div>
  );
}

function DollarSignIcon(props: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
