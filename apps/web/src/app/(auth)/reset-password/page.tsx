'use client';
import { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { apiErrorMessage, useT, type TranslateFn } from '../../../i18n';

function buildSchema(t: TranslateFn) {
  return z.object({
    password: z.string()
      .min(8, t('auth.validation.min8'))
      .regex(/[A-Z]/, t('auth.validation.oneUpper'))
      .regex(/[0-9]/, t('auth.validation.oneNumber')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('auth.validation.passwordMismatch'),
    path: ['confirmPassword'],
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const t = useT();
  const schema = useMemo(() => buildSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      toast.success(t('reset.toast.success'));
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t, t('reset.toast.failed')));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-white mb-2">{t('reset.invalidTitle')}</h1>
        <p className="text-sm text-surface-muted mb-6">{t('reset.invalidBody')}</p>
        <Button variant="outline" onClick={() => router.push('/forgot-password')}>{t('reset.requestNew')}</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">{t('reset.successTitle')}</h1>
        <p className="text-sm text-surface-muted mb-6">{t('reset.successBody')}</p>
        <Button onClick={() => router.push('/login')} size="lg">{t('reset.goToLogin')}</Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">{t('reset.title')}</h1>
      <p className="text-sm text-surface-muted mb-8">{t('reset.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Input
            label={t('reset.newPassword')}
            type={showPw ? 'text' : 'password'}
            placeholder={t('auth.field.passwordRule')}
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
          label={t('reset.confirmNewPassword')}
          type="password"
          error={errors.confirmPassword?.message as string}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('reset.submit')}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="text-center py-8"><p className="text-surface-muted">{t('auth.loading')}</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
