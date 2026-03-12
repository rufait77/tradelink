'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Check Your Email</h1>
        <p className="text-sm text-surface-muted mb-6">
          If an account with that email exists, you&apos;ll receive a password reset link within a few minutes.
        </p>
        <Link href="/login">
          <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">Forgot password?</h1>
      <p className="text-sm text-surface-muted mb-8">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message as string}
          {...register('email')}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Send Reset Link
        </Button>
      </form>

      <p className="text-sm text-surface-muted text-center mt-6">
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
      </p>
    </div>
  );
}
