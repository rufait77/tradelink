'use client';
import { useState } from 'react';
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

const TRADE_OPTIONS = [
  'Landscaping', 'Roofing', 'HVAC', 'Plumbing', 'Electrical',
  'Painting', 'Carpentry', 'Flooring', 'Masonry', 'Cleaning',
  'PressureWashing', 'JunkRemoval', 'WindowInstallation', 'Siding', 'Clearing',
  'GeneralContracting', 'Welding', 'Drywall', 'Barber', 'Cosmetology', 'Esthetician', 'Other',
].map((t) => ({ label: t.replace(/([A-Z])/g, ' $1').trim(), value: t }));

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map((s) => ({ label: s, value: s }));

const profileSchema = z.object({
  bio: z.string().min(20, 'Bio must be at least 20 characters').max(1000),
  licenseNumber: z.string().optional(),
  streetAddress: z.string().min(5, 'Enter your street address'),
  city: z.string().min(2, 'Enter your city'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  yearsExperience: z.number().min(0).max(60),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const STEPS = [
  { icon: Wrench, label: 'Trade Types' },
  { icon: MapPin, label: 'Location' },
  { icon: User, label: 'Profile' },
  { icon: CreditCard, label: 'Payouts' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');

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
    if (step === 0 && selectedTrades.length === 0) {
      toast.error('Select at least one trade type');
      return;
    }
    if (step === 1 && !selectedState) {
      toast.error('Select your state');
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
        tradeTypes: selectedTrades,
        state: selectedState,
        bio: vals.bio,
        licenseNumber: vals.licenseNumber || undefined,
        streetAddress: vals.streetAddress,
        city: vals.city,
        zipCode: vals.zipCode,
        yearsExperience: Number(vals.yearsExperience),
      });
      await fetchMe();
      toast.success('Profile complete! Welcome to Tradelink.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-navy-950'
                    : 'bg-surface-elevated text-surface-muted'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {i < STEPS.length - 1 && (
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
              <h2 className="text-xl font-heading font-bold text-white mb-2">What trades do you specialize in?</h2>
              <p className="text-sm text-surface-muted mb-6">Select up to 5 trade categories.</p>
              <div className="grid grid-cols-2 gap-2">
                {TRADE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => toggleTrade(t.value)}
                    className={`p-3 rounded-xl text-sm font-medium text-left transition-all border ${
                      selectedTrades.includes(t.value)
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                        : 'bg-navy-900 border-surface-border text-slate-300 hover:border-amber-500/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-white mb-2">Where are you located?</h2>
              <p className="text-sm text-surface-muted mb-4">Set your service area for nearby job matching.</p>
              <Input label="Street Address" {...register('streetAddress')} error={errors.streetAddress?.message as string} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" {...register('city')} error={errors.city?.message as string} />
                <Select label="State" options={US_STATES} value={selectedState} onChange={setSelectedState} />
              </div>
              <Input label="ZIP Code" {...register('zipCode')} error={errors.zipCode?.message as string} placeholder="e.g. 77001" />
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-white mb-2">Tell us about yourself</h2>
              <div className="space-y-1.5">
                <label className="label">Bio</label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder="Describe your experience, specialties, and what makes you stand out..."
                  {...register('bio')}
                />
                {errors.bio && <p className="text-xs text-red-400">{errors.bio.message as string}</p>}
              </div>
              <Input label="License Number (optional)" {...register('licenseNumber')} placeholder="e.g. LIC-12345" />
              <Input
                label="Years of Experience"
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
              <h2 className="text-xl font-heading font-bold text-white mb-2">Connect Your Bank</h2>
              <p className="text-sm text-surface-muted mb-6">
                You can connect your Stripe account later from the dashboard to receive commission payouts. Skip this for now and finish setup.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-border">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={handleFinish} loading={loading}>
              {step < 3 ? (
                <>Next <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Complete Setup <CheckCircle2 className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
