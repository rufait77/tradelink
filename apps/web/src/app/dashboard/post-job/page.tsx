'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import api from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { usePlatformSettings } from '../../../lib/useSettings';
import { toast } from 'sonner';
import {
  Send, ArrowLeft, DollarSign, User, MapPin,
  FileText, AlertCircle, Lock, Zap,
} from 'lucide-react';
import { apiErrorMessage, useT, useLabels, tradeLabel, type TranslateFn, type TranslationKey } from '../../../i18n';

// Enum values sent to the API — only the displayed label is translated.
const TRADE_VALUES = [
  'Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','PressureWashing','JunkRemoval','WindowInstallation','Siding','Clearing','GeneralContracting','Welding','Drywall','Barber','Cosmetology','Esthetician','AutoMechanics','Other',
];

const URGENCY_VALUES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Low', labelKey: 'postJob.urgency.low' },
  { value: 'Medium', labelKey: 'postJob.urgency.medium' },
  { value: 'High', labelKey: 'postJob.urgency.high' },
  { value: 'Emergency', labelKey: 'postJob.urgency.emergency' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map((s) => ({ label: s, value: s }));

const RADIUS_VALUES = ['5', '10', '15', '25', '50', '100'];

function buildJobSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(5, t('postJob.validation.title')).max(150),
    description: z.string().min(20, t('postJob.validation.description')).max(2000),
    estimatedValue: z.number({ invalid_type_error: t('postJob.validation.number') }).positive(t('postJob.validation.positive')),
    streetAddress: z.string().min(5, t('postJob.validation.street')),
    city: z.string().min(2, t('postJob.validation.city')),
    zipCode: z.string().regex(/^\d{5}$/, t('postJob.validation.zip')),
    // Client contact
    clientFirstName: z.string().min(1, t('postJob.validation.firstName')).max(100),
    clientLastName: z.string().max(100).optional(),
    clientEmail: z.string().email(t('postJob.validation.email')),
    clientPhone: z.string().max(20).optional(),
    clientNotes: z.string().max(1000).optional(),
  });
}

type JobFormData = z.infer<ReturnType<typeof buildJobSchema>>;

function PostJobContent() {
  const router = useRouter();
  const { commissionPct } = usePlatformSettings();
  const [loading, setLoading] = useState(false);
  const [tradeType, setTradeType] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [state, setState] = useState('');
  const [serviceRadius, setServiceRadius] = useState('25');
  const [feePcts, setFeePcts] = useState({ platform: 5, commission: 20 });
  const [usingDefaultFees, setUsingDefaultFees] = useState(false);
  const t = useT();
  const { apiErrorMessage: toApiMessage } = useLabels();
  const jobSchema = useMemo(() => buildJobSchema(t), [t]);
  const TRADE_OPTIONS = useMemo(() => TRADE_VALUES.map((value) => ({ label: tradeLabel(t, value), value })), [t]);
  const URGENCY_OPTIONS = useMemo(() => URGENCY_VALUES.map((o) => ({ label: t(o.labelKey), value: o.value })), [t]);
  const RADIUS_OPTIONS = useMemo(
    () => RADIUS_VALUES.map((value) => ({
      label: value === '100' ? t('postJob.radius.milesPlus') : t('postJob.radius.miles', { count: value }),
      value,
    })),
    [t],
  );

  // Fetch real fee percentages from API
  useEffect(() => {
    api.get('/settings/public').then(res => {
      const s = res.data?.data;
      if (s) {
        setFeePcts({
          platform: parseFloat(s.platform_fee_pct ?? '5'),
          commission: parseFloat(s.commission_pct ?? '20'),
        });
      }
    }).catch(() => { setUsingDefaultFees(true); }); // flag if using defaults
  }, []);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { estimatedValue: undefined },
  });

  const estimatedValue = watch('estimatedValue');

  // Live fee preview (dynamic percentages from API)
  const feePreview = useMemo(() => {
    const val = Number(estimatedValue) || 0;
    if (val <= 0) return null;
    const platformFee = val * (feePcts.platform / 100);
    const referralFee = val * (feePcts.commission / 100);
    const contractorGets = val - platformFee - referralFee;
    return { total: val, platformFee, referralFee, contractorGets };
  }, [estimatedValue, feePcts]);

  async function onSubmit(data: JobFormData) {
    if (!tradeType) { toast.error(t('postJob.toast.pickTrade')); return; }
    if (!state) { toast.error(t('postJob.toast.pickState')); return; }

    setLoading(true);
    try {
      await api.post('/jobs', {
        ...data,
        tradeType,
        urgency,
        state,
        serviceRadiusMiles: parseInt(serviceRadius),
        // Legacy fields (still required by validator)
        budgetMin: data.estimatedValue * 0.8,
        budgetMax: data.estimatedValue * 1.2,
      });
      toast.success(t('postJob.toast.success'));
      router.push('/dashboard/my-referrals');
    } catch (err: any) {
      toast.error(toApiMessage(err, t('postJob.toast.failed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <h1 className="text-2xl font-heading font-bold text-white mb-1">{t('postJob.title')}</h1>
        <p className="text-sm text-surface-muted">{t('postJob.subtitle', { pct: commissionPct })}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Job Details ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base font-heading font-semibold text-white">{t('postJob.section.details')}</h2>
          </div>

          <div className="space-y-4">
            <Input label={t('postJob.field.title')} placeholder={t('postJob.field.titlePlaceholder')} error={errors.title?.message as string} {...register('title')} />

            <div className="space-y-1.5">
              <label className="label">{t('postJob.field.description')}</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder={t('postJob.field.descriptionPlaceholder')}
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label={t('postJob.field.tradeType')} options={TRADE_OPTIONS} value={tradeType} onChange={setTradeType} placeholder={t('postJob.field.tradePlaceholder')} />
              <Select label={t('postJob.field.urgency')} options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('postJob.field.value')}
                type="number"
                placeholder={t('postJob.field.valuePlaceholder')}
                error={errors.estimatedValue?.message as string}
                {...register('estimatedValue', { valueAsNumber: true })}
              />
              <Select label={t('postJob.field.radius')} options={RADIUS_OPTIONS} value={serviceRadius} onChange={setServiceRadius} />
            </div>
          </div>
        </Card>

        {/* ─── Live Fee Preview ─── */}
        {feePreview && (
          <Card className="border-emerald-500/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-base font-heading font-semibold text-white">{t('postJob.section.preview')}</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[11px] text-surface-muted mb-1">{t('postJob.preview.yours', { pct: feePcts.commission })}</p>
                <p className="text-lg font-heading font-bold text-emerald-400">{formatCurrency(feePreview.referralFee)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-navy-900 border border-surface-border">
                <p className="text-[11px] text-surface-muted mb-1">{t('postJob.preview.contractor', { pct: 100 - feePcts.commission - feePcts.platform })}</p>
                <p className="text-lg font-heading font-bold text-white">{formatCurrency(feePreview.contractorGets)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-navy-900 border border-surface-border">
                <p className="text-[11px] text-surface-muted mb-1">{t('postJob.preview.platform', { pct: feePcts.platform })}</p>
                <p className="text-lg font-heading font-bold text-surface-muted">{formatCurrency(feePreview.platformFee)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-surface-muted">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('postJob.preview.note')}</span>
            </div>
          </Card>
        )}

        {/* ─── Job Location ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-heading font-semibold text-white">{t('postJob.section.location')}</h2>
          </div>

          <div className="space-y-4">
            <Input label={t('postJob.field.street')} error={errors.streetAddress?.message as string} {...register('streetAddress')} />
            <div className="grid grid-cols-3 gap-3">
              <Input label={t('postJob.field.city')} error={errors.city?.message as string} {...register('city')} />
              <Select label={t('postJob.field.state')} options={US_STATES} value={state} onChange={setState} placeholder={t('postJob.field.statePlaceholder')} />
              <Input label={t('postJob.field.zip')} error={errors.zipCode?.message as string} {...register('zipCode')} placeholder={t('postJob.field.zipPlaceholder')} />
            </div>
          </div>
        </Card>

        {/* ─── Client Contact Info ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-heading font-semibold text-white">{t('postJob.section.client')}</h2>
              <p className="text-xs text-surface-muted">{t('postJob.client.hint')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('postJob.field.firstName')} error={errors.clientFirstName?.message as string} {...register('clientFirstName')} placeholder={t('postJob.field.firstNamePlaceholder')} />
              <Input label={t('postJob.field.lastName')} error={errors.clientLastName?.message as string} {...register('clientLastName')} placeholder={t('postJob.field.lastNamePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('postJob.field.clientEmail')} type="email" error={errors.clientEmail?.message as string} {...register('clientEmail')} placeholder={t('postJob.field.clientEmailPlaceholder')} />
              <Input label={t('postJob.field.clientPhone')} error={errors.clientPhone?.message as string} {...register('clientPhone')} placeholder={t('postJob.field.clientPhonePlaceholder')} />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <Lock className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              {t('postJob.client.privacyLead')} <span className="text-violet-400 font-medium">{t('postJob.client.privacyWord')}</span> {t('postJob.client.privacyRest')}
            </p>
          </div>
        </Card>

        {/* ─── Private Notes ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-heading font-semibold text-white">{t('postJob.section.notes')}</h2>
              <p className="text-xs text-surface-muted">{t('postJob.notes.hint')}</p>
            </div>
          </div>

          <textarea
            className="input-field resize-none w-full"
            rows={3}
            placeholder={t('postJob.notes.placeholder')}
            {...register('clientNotes')}
          />
        </Card>

        {/* ─── Submit ─── */}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          <Send className="w-4 h-4" /> {t('postJob.submit')}
        </Button>
      </form>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense><PostJobContent /></Suspense>
  );
}
