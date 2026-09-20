'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { Eye, EyeOff } from 'lucide-react';
import { RoleSelector, type SelectableRole } from '../../../components/auth/role-selector';
import { apiErrorMessage, useT, type TranslateFn } from '../../../i18n';

function buildSignupSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(2, t('auth.validation.nameMin')).max(100),
    email: z.string().email(t('auth.validation.email')),
    password: z.string()
      .min(8, t('auth.validation.passwordMin'))
      .regex(/[A-Z]/, t('auth.validation.passwordUpper'))
      .regex(/[0-9]/, t('auth.validation.passwordNumber')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('auth.validation.passwordMismatch'),
    path: ['confirmPassword'],
  });
}

type SignupInput = z.infer<ReturnType<typeof buildSignupSchema>>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<SelectableRole>('contractor');
  const t = useT();
  const signupSchema = useMemo(() => buildSignupSchema(t), [t]);

  // Preselect role from ?role=referrer (landing-page CTAs). window read avoids a Suspense boundary.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('role');
    if (preset === 'referrer' || preset === 'contractor') setRole(preset);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupInput) {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role,
      });
      const { devMode, clientSecret, userId } = res.data.data;

      if (devMode) {
        toast.success(t('signup.toast.created'));
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        // Store for payment page
        sessionStorage.setItem('signup_clientSecret', clientSecret);
        sessionStorage.setItem('signup_userId', userId);
        sessionStorage.setItem('signup_email', data.email);
        router.push('/signup/payment');
      }
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t, t('signup.toast.failed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">{t('signup.title')}</h1>
      <p className="text-sm text-surface-muted mb-8">
        {t('signup.subtitle')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <RoleSelector value={role} onChange={setRole} />
        <Input
          label={t('auth.field.fullName')}
          placeholder={t('auth.field.fullNamePlaceholder')}
          error={errors.name?.message}
          {...register('name')}
        />
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
            placeholder={t('auth.field.passwordRule')}
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
        <Input
          label={t('auth.field.confirmPassword')}
          type="password"
          placeholder={t('auth.field.confirmPasswordPlaceholder')}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('signup.submit')}
        </Button>
      </form>

      <p className="text-sm text-surface-muted text-center mt-6">
        {t('signup.haveAccount')}{' '}
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          {t('signup.loginLink')}
        </Link>
      </p>

      <p className="text-xs text-surface-muted text-center mt-4">
        {t('signup.legalPrefix')}{' '}
        <Link href="/terms" className="text-amber-500/80 hover:text-amber-400">{t('signup.legalTerms')}</Link>{' '}
        {t('signup.legalAnd')}{' '}
        <Link href="/privacy" className="text-amber-500/80 hover:text-amber-400">{t('signup.legalPrivacy')}</Link>.
      </p>
    </div>
  );
}
