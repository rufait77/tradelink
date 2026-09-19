'use client';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useT, type TranslateFn } from '../../../i18n';

function buildSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t('auth.validation.email')),
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const t = useT();
  const schema = useMemo(() => buildSchema(t), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast.error(t('forgot.toast.error'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">{t('forgot.sentTitle')}</h1>
        <p className="text-sm text-surface-muted mb-6">
          {t('forgot.sentBody')}
        </p>
        <Link href="/login">
          <Button variant="outline"><ArrowLeft className="w-4 h-4" /> {t('forgot.sentBack')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">{t('forgot.title')}</h1>
      <p className="text-sm text-surface-muted mb-8">{t('forgot.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('auth.field.email')}
          type="email"
          placeholder={t('auth.field.emailPlaceholder')}
          error={errors.email?.message as string}
          {...register('email')}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('forgot.submit')}
        </Button>
      </form>

      <p className="text-sm text-surface-muted text-center mt-6">
        <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {t('forgot.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
