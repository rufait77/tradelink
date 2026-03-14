'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { PageLoader } from '../../../../components/ui/spinner';
import { formatCurrency } from '../../../../lib/utils';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import {
  CreditCard, Shield, ArrowLeft, AlertTriangle,
  Lock, ExternalLink, CheckCircle2,
} from 'lucide-react';

interface PayData {
  clientName: string;
  job: { title: string; tradeType: string; status: string };
  activeQuote: { id: string; amount: number; status: string } | null;
  escrow: { status: string; totalAmount: number; paidAt?: string } | null;
}

export default function PaymentPage() {
  const { token } = useParams();
  const router = useRouter();
  const [data, setData] = useState<PayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setData(res.data.data);
      } catch {
        toast.error('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handlePay() {
    setPayLoading(true);
    try {
      const res = await clientApi.get(`/client/${token}/pay`);
      const url = res.data.data?.url || res.data.data?.paymentLink;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Payment link not available yet. Please try again later.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load payment page');
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-heading font-bold text-white">Access Error</h1>
        <p className="text-surface-muted mt-2">Could not load payment details.</p>
      </div>
    );
  }

  // Already paid
  if (data.escrow && (data.escrow.status === 'funded' || data.escrow.status === 'released')) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Payment Received!</h1>
          <p className="text-surface-muted mb-4">
            Your payment of {formatCurrency(data.escrow.totalAmount)} is being held securely
            and will be released to the contractor upon job completion.
          </p>
          <Badge variant="green" className="text-sm px-4 py-1.5">
            {data.escrow.status === 'funded' ? 'Funds Held in Escrow' : 'Funds Released'}
          </Badge>
        </Card>
      </div>
    );
  }

  // Quote not approved yet
  if (!data.activeQuote || data.activeQuote.status !== 'approved') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Payment Not Ready</h1>
          <p className="text-surface-muted">
            Payment is available after a quote has been approved.
            {data.activeQuote?.status === 'sent' && ' Please review and approve the quote first.'}
          </p>
          {data.activeQuote?.status === 'sent' && (
            <Button className="mt-4" onClick={() => router.push(`/client/${token}/quote`)}>
              Review Quote
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white mb-1">Secure Payment</h1>
          <p className="text-sm text-surface-muted">for &quot;{data.job.title}&quot;</p>
        </div>

        {/* Amount */}
        <div className="text-center py-6 mb-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-surface-border">
          <p className="text-xs text-surface-muted mb-1">Amount Due</p>
          <p className="text-4xl font-heading font-bold text-white">
            {formatCurrency(data.activeQuote.amount)}
          </p>
        </div>

        {/* Secure payment features */}
        <div className="space-y-3 mb-6">
          {[
            { icon: Lock, text: 'Your payment is secured with bank-level encryption' },
            { icon: Shield, text: 'Funds held in escrow until job is completed' },
            { icon: CheckCircle2, text: 'Full refund available if a dispute is resolved in your favor' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-slate-300">{text}</p>
            </div>
          ))}
        </div>

        <Button className="w-full" size="lg" onClick={handlePay} loading={payLoading}>
          <CreditCard className="w-4 h-4" /> Pay {formatCurrency(data.activeQuote.amount)}
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </Button>

        <p className="text-[11px] text-surface-muted text-center mt-4 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Powered by Stripe — never see or store your card details
        </p>
      </Card>
    </div>
  );
}
