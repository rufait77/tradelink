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

const TRADE_OPTIONS = [
  'Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','PressureWashing','JunkRemoval','WindowInstallation','Siding','Clearing','GeneralContracting','Welding','Drywall','Barber','Cosmetologist','Esthetician','Other',
].map((t) => ({ label: t.replace(/([A-Z])/g, ' $1').trim(), value: t }));

const URGENCY_OPTIONS = [
  { label: 'Low — No rush', value: 'Low' },
  { label: 'Medium — Within a few weeks', value: 'Medium' },
  { label: 'High — Within a few days', value: 'High' },
  { label: 'Emergency — ASAP', value: 'Emergency' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map((s) => ({ label: s, value: s }));

const RADIUS_OPTIONS = [
  { label: '5 miles', value: '5' },
  { label: '10 miles', value: '10' },
  { label: '15 miles', value: '15' },
  { label: '25 miles', value: '25' },
  { label: '50 miles', value: '50' },
  { label: '100+ miles', value: '100' },
];

const jobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  estimatedValue: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be positive'),
  streetAddress: z.string().min(5, 'Enter a street address'),
  city: z.string().min(2, 'Enter a city'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  // Client contact
  clientFirstName: z.string().min(1, 'First name is required').max(100),
  clientLastName: z.string().max(100).optional(),
  clientEmail: z.string().email('Enter a valid email'),
  clientPhone: z.string().max(20).optional(),
  clientNotes: z.string().max(1000).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

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
    if (!tradeType) { toast.error('Select a trade type'); return; }
    if (!state) { toast.error('Select a state'); return; }

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
      toast.success('Referral posted! Contractors will start expressing interest.');
      router.push('/dashboard/my-referrals');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post referral');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-heading font-bold text-white mb-1">Post a Referral</h1>
        <p className="text-sm text-surface-muted">Got a lead you can&apos;t take? Post it and earn a {commissionPct}% commission when it&apos;s completed.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Job Details ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base font-heading font-semibold text-white">Job Details</h2>
          </div>

          <div className="space-y-4">
            <Input label="Job Title" placeholder="e.g. Kitchen Renovation — Full Remodel" error={errors.title?.message as string} {...register('title')} />

            <div className="space-y-1.5">
              <label className="label">Description</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="Describe the scope, timeline expectations, and any details the contractor should know..."
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Trade Type" options={TRADE_OPTIONS} value={tradeType} onChange={setTradeType} placeholder="Select trade..." />
              <Select label="Urgency" options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Estimated Job Value ($)"
                type="number"
                placeholder="5000"
                error={errors.estimatedValue?.message as string}
                {...register('estimatedValue', { valueAsNumber: true })}
              />
              <Select label="Service Radius" options={RADIUS_OPTIONS} value={serviceRadius} onChange={setServiceRadius} />
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
              <h2 className="text-base font-heading font-semibold text-white">Earnings Preview</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[11px] text-surface-muted mb-1">Your Commission ({feePcts.commission}%)</p>
                <p className="text-lg font-heading font-bold text-emerald-400">{formatCurrency(feePreview.referralFee)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-navy-900 border border-surface-border">
                <p className="text-[11px] text-surface-muted mb-1">Contractor Gets ({100 - feePcts.commission - feePcts.platform}%)</p>
                <p className="text-lg font-heading font-bold text-white">{formatCurrency(feePreview.contractorGets)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-navy-900 border border-surface-border">
                <p className="text-[11px] text-surface-muted mb-1">Platform Fee ({feePcts.platform}%)</p>
                <p className="text-lg font-heading font-bold text-surface-muted">{formatCurrency(feePreview.platformFee)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-surface-muted">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Final amounts are calculated from the contractor&apos;s actual quote, not the estimate.</span>
            </div>
          </Card>
        )}

        {/* ─── Job Location ─── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-heading font-semibold text-white">Job Location</h2>
          </div>

          <div className="space-y-4">
            <Input label="Street Address" error={errors.streetAddress?.message as string} {...register('streetAddress')} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" error={errors.city?.message as string} {...register('city')} />
              <Select label="State" options={US_STATES} value={state} onChange={setState} placeholder="State" />
              <Input label="ZIP Code" error={errors.zipCode?.message as string} {...register('zipCode')} placeholder="77001" />
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
              <h2 className="text-base font-heading font-semibold text-white">Client Contact Info</h2>
              <p className="text-xs text-surface-muted">Hidden from contractors until assigned</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" error={errors.clientFirstName?.message as string} {...register('clientFirstName')} placeholder="John" />
              <Input label="Last Name (optional)" error={errors.clientLastName?.message as string} {...register('clientLastName')} placeholder="Smith" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" type="email" error={errors.clientEmail?.message as string} {...register('clientEmail')} placeholder="john@example.com" />
              <Input label="Phone (optional)" error={errors.clientPhone?.message as string} {...register('clientPhone')} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <Lock className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Client info is <span className="text-violet-400 font-medium">private</span> and only revealed to the assigned contractor.
              The client will receive a secure portal link via email to approve quotes, pay, and track progress.
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
              <h2 className="text-base font-heading font-semibold text-white">Private Notes</h2>
              <p className="text-xs text-surface-muted">Only visible to the assigned contractor</p>
            </div>
          </div>

          <textarea
            className="input-field resize-none w-full"
            rows={3}
            placeholder="e.g. Access code is #1234. The client prefers morning appointments. Dog on premises..."
            {...register('clientNotes')}
          />
        </Card>

        {/* ─── Submit ─── */}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          <Send className="w-4 h-4" /> Post Referral
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
