'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[0-9]/, 'One number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      toast.success('Password reset! You can now log in.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-sm text-surface-muted mb-6">This password reset link is invalid.</p>
        <Button variant="outline" onClick={() => router.push('/forgot-password')}>Request New Link</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Password Reset!</h1>
        <p className="text-sm text-surface-muted mb-6">Your password has been changed. You can now log in.</p>
        <Button onClick={() => router.push('/login')} size="lg">Go to Login</Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">Reset your password</h1>
      <p className="text-sm text-surface-muted mb-8">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Input
            label="New Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            error={errors.password?.message as string}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-9 text-surface-muted hover:text-white transition"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input
          label="Confirm New Password"
          type="password"
          error={errors.confirmPassword?.message as string}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Reset Password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-8"><p className="text-surface-muted">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
