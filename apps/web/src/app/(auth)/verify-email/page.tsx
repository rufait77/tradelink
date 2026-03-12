'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { Mail, CheckCircle2, RefreshCcw } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [resending, setResending] = useState(false);

  // Auto-verify if token present in URL
  useEffect(() => {
    if (!token) return;
    setStatus('verifying');
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        toast.success('Email verified successfully!');
      })
      .catch(() => {
        setStatus('error');
        toast.error('Verification link is invalid or expired.');
      });
  }, [token]);

  async function resend() {
    if (!email) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification email resent!');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  // Token verification result
  if (token) {
    if (status === 'verifying') {
      return (
        <div className="text-center py-8">
          <RefreshCcw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white">Verifying your email...</h1>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Email Verified!</h1>
          <p className="text-surface-muted mb-6">Your account is now active. You can log in.</p>
          <Button onClick={() => router.push('/login')} size="lg">Go to Login</Button>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Verification Failed</h1>
        <p className="text-surface-muted mb-6">This link may be invalid or expired.</p>
        <Button variant="outline" onClick={() => router.push('/signup')}>Sign Up Again</Button>
      </div>
    );
  }

  // Waiting for verification (no token in URL)
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Check Your Email</h1>
      <p className="text-surface-muted mb-1">
        We&apos;ve sent a verification link to:
      </p>
      {email && <p className="text-amber-400 font-medium mb-6">{email}</p>}
      <p className="text-xs text-surface-muted mb-8">
        Click the link in your email to verify your account. The link expires in 24 hours.
      </p>

      <div className="space-y-3">
        <Button variant="outline" onClick={resend} loading={resending} className="w-full">
          <RefreshCcw className="w-4 h-4" /> Resend Verification Email
        </Button>
        <Button variant="ghost" onClick={() => router.push('/login')} className="w-full">
          Already verified? Log in
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-8"><p className="text-surface-muted">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
