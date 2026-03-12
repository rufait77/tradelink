'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../../../../components/ui/button';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { Shield, Lock } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || '');

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        const userId = sessionStorage.getItem('signup_userId');
        await api.post('/auth/confirm-signup-payment', {
          userId,
          paymentIntentId: paymentIntent.id,
        });
        toast.success('Payment successful! Now verify your email.');
        const email = sessionStorage.getItem('signup_email') || '';
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <Button type="submit" loading={loading} disabled={!stripe} className="w-full" size="lg">
        <Lock className="w-4 h-4" /> Pay Signup Fee
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    const secret = sessionStorage.getItem('signup_clientSecret');
    if (!secret) {
      router.push('/signup');
      return;
    }
    setClientSecret(secret);
  }, [router]);

  if (!clientSecret) return null;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">Complete Payment</h1>
      <p className="text-sm text-surface-muted mb-6">
        One-time signup fee to activate your account.
      </p>

      <div className="glass-card p-5 mb-6 flex items-center gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-slate-300">
          Secured by Stripe. Your card details are never stored on our servers.
        </p>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#f59e0b',
              colorBackground: '#0f172a',
              colorText: '#f1f5f9',
              borderRadius: '12px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          },
        }}
      >
        <PaymentForm />
      </Elements>
    </div>
  );
}
