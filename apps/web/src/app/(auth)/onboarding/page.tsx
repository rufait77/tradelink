'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { ArrowRight, ArrowLeft, CheckCircle2, Wrench, MapPin, User, CreditCard } from 'lucide-react';
import { apiErrorMessage, useT, tradeLabel, type TranslateFn } from '../../../i18n';

// Enum values sent to the API — only the displayed label is translated.
const TRADE_VALUES = [
  'Landscaping', 'Roofing', 'HVAC', 'Plumbing', 'Electrical',
  'Painting', 'Carpentry', 'Flooring', 'Masonry', 'Cleaning',
  'PressureWashing', 'JunkRemoval', 'WindowInstallation', 'Siding', 'Clearing',
  'GeneralContracting', 'Welding', 'Drywall', 'Barber', 'Cosmetology', 'Esthetician', 'AutoMechanics', 'Other',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map((s) => ({ label: s, value: s }));

function buildProfileSchema(t: TranslateFn) {
  return z.object({
    bio: z.string().min(20, t('onboarding.validation.bio')).max(1000),
    licenseNumber: z.string().optional(),
    streetAddress: z.string().min(5, t('onboarding.validation.street')),
    city: z.string().min(2, t('onboarding.validation.city')),
    zipCode: z.string().regex(/^\d{5}$/, t('onboarding.validation.zip')),
    yearsExperience: z.number().min(0).max(60),
  });
}

type ProfileFormData = z.infer<ReturnType<typeof buildProfileSchema>>;

const STEP_ICONS = [Wrench, MapPin, User, CreditCard];

export default function OnboardingPage() {
  const router = useRouter();
  const { fetchMe, user } = useAuthStore();
  // Referrers skip the Trade Types step (and the license field) — they start at Location.
  const isReferrer = user?.role === 'referrer';
  const firstStep = isReferrer ? 1 : 0;
  const [step, setStep] = useState(0);
  // Reactive floor: user may hydrate after first render (hard refresh), so never show step 0 to a referrer.
  useEffect(() => {
    if (isReferrer && step < 1) setStep(1);
  }, [isReferrer, step]);
  const [loading, setLoading] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const t = useT();
  const profileSchema = useMemo(() => buildProfileSchema(t), [t]);
  const tradeOptions = useMemo(
    () => TRADE_VALUES.map((value) => ({ label: tradeLabel(t, value), value })),
    [t],
  );

  const { register, formState: { errors }, getValues } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { yearsExperience: 0, bio: '', streetAddress: '', city: '', zipCode: '' },
  });

  function toggleTrade(t: string) {
    setSelectedTrades((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 5 ? [...prev, t] : prev
    );
  }

  async function handleFinish() {
    if (step === 0 && !isReferrer && selectedTrades.length === 0) {
      toast.error(t('onboarding.toast.pickTrade'));
      return;
    }
    if (step === 1 && !selectedState) {
      toast.error(t('onboarding.toast.pickState'));
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Final step — save profile
    setLoading(true);
    try {
      const vals = getValues();
      await api.put('/contractors/profile', {
        // Referrers omit tradeTypes entirely — the validator's min(1) still runs on an empty array
        ...(isReferrer ? {} : { tradeTypes: selectedTrades }),
        state: selectedState,
        bio: vals.bio,
        licenseNumber: vals.licenseNumber || undefined,
        streetAddress: vals.streetAddress,
        city: vals.city,
        zipCode: vals.zipCode,
        yearsExperience: Number(vals.yearsExperience),
      });
      await fetchMe();
      toast.success(t('onboarding.toast.success'));
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t, t('onboarding.toast.failed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEP_ICONS.map((Icon, i) => {
            if (i < firstStep) return null; // referrers: hide the Trade Types indicator
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-navy-950'
                    : 'bg-surface-elevated text-surface-muted'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {i < STEP_ICONS.length - 1 && (
                  <div className={`w-8 h-0.5 ${i < step ? 'bg-amber-500' : 'bg-surface-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-card p-8">
          {/* Step 0: Trade Types */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-heading font-bold text-white mb-2">{t('onboarding.trades.title')}</h2>
              <p className="text-sm text-surface-muted mb-6">{t('onboarding.trades.subtitle')}</p>
              <div className="grid grid-cols-2 gap-2">
                {tradeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => toggleTrade(option.value)}
                    className={`p-3 rounded-xl text-sm font-medium text-left transition-all border ${
                      selectedTrades.includes(option.value)
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                        : 'bg-navy-900 border-surface-border text-slate-300 hover:border-amber-500/30'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-white mb-2">{t('onboarding.location.title')}</h2>
              <p className="text-sm text-surface-muted mb-4">{t('onboarding.location.subtitle')}</p>
              <Input label={t('onboarding.field.street')} {...register('streetAddress')} error={errors.streetAddress?.message as string} />
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('onboarding.field.city')} {...register('city')} error={errors.city?.message as string} />
                <Select label={t('onboarding.field.state')} options={US_STATES} value={selectedState} onChange={setSelectedState} />
              </div>
              <Input label={t('onboarding.field.zip')} {...register('zipCode')} error={errors.zipCode?.message as string} placeholder={t('onboarding.field.zipPlaceholder')} />
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-white mb-2">{t('onboarding.profile.title')}</h2>
              <div className="space-y-1.5">
                <label className="label">{t('onboarding.field.bio')}</label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder={t('onboarding.field.bioPlaceholder')}
                  {...register('bio')}
                />
                {errors.bio && <p className="text-xs text-red-400">{errors.bio.message as string}</p>}
              </div>
              {!isReferrer && (
                <Input label={t('onboarding.field.license')} {...register('licenseNumber')} placeholder={t('onboarding.field.licensePlaceholder')} />
              )}
              <Input
                label={t('onboarding.field.years')}
                type="number"
                {...register('yearsExperience', { valueAsNumber: true })}
                error={errors.yearsExperience?.message as string}
              />
            </div>
          )}

          {/* Step 3: Payouts */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-navy-950" />
              </div>
              <h2 className="text-xl font-heading font-bold text-white mb-2">{t('onboarding.payouts.title')}</h2>
              <p className="text-sm text-surface-muted mb-6">
                {t('onboarding.payouts.body')}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-border">
            {step > firstStep ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4" /> {t('onboarding.back')}
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={handleFinish} loading={loading}>
              {step < 3 ? (
                <>{t('onboarding.next')} <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>{t('onboarding.complete')} <CheckCircle2 className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
