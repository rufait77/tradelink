'use client';
import { useMemo, useState } from 'react';
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
import { apiErrorMessage, useT, type TranslateFn } from '../../../i18n';

function buildLoginSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t('auth.validation.email')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
    rememberMe: z.boolean().optional(),
  });
}

type LoginInput = z.infer<ReturnType<typeof buildLoginSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const t = useT();
  const loginSchema = useMemo(() => buildLoginSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
    mode: 'onTouched',          // validate only after field is blurred (fixes autofill flicker)
    reValidateMode: 'onChange',  // clear errors as user types
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      toast.success(t('login.toast.success'));
      // Check if onboarding needed
      const store = useAuthStore.getState();
      if (store.needsOnboarding()) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msg = apiErrorMessage(err, t, t('login.toast.failed'));
      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error(msg);
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (code === 'ACCOUNT_INACTIVE') {
        toast.error(t('login.toast.inactive'));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">{t('login.title')}</h1>
      <p className="text-sm text-surface-muted mb-8">{t('login.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('auth.field.email')}
          type="email"
          placeholder={t('auth.field.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="relative">
          <Input
            label={t('auth.field.password')}
            type={showPw ? 'text' : 'password'}
            placeholder={t('auth.field.passwordPlaceholder')}
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
            <span className="text-sm text-slate-300">{t('login.rememberMe')}</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            {t('login.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('login.submit')}
        </Button>
      </form>

      <p className="text-sm text-surface-muted text-center mt-6">
        {t('login.noAccount')}{' '}
        <Link href="/signup" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          {t('login.signUpLink')}
        </Link>
      </p>
    </div>
  );
}
