'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      toast.success('Welcome back!');
      // Check if onboarding needed
      const store = useAuthStore.getState();
      if (store.needsOnboarding()) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed.';
      const code = err.response?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error(msg);
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (code === 'ACCOUNT_INACTIVE') {
        toast.error('Please complete your signup payment first.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">Welcome back</h1>
      <p className="text-sm text-surface-muted mb-8">Log in to your Tradelink account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Enter your password"
            error={errors.password?.message}
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-surface-border bg-navy-900 text-amber-500 focus:ring-amber-500/20"
              {...register('rememberMe')}
            />
            <span className="text-sm text-slate-300">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Log In
        </Button>
      </form>

      <p className="text-sm text-surface-muted text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
