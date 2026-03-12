'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Send, ArrowLeft } from 'lucide-react';

const TRADE_OPTIONS = [
  'Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','PressureWashing','JunkRemoval','WindowInstallation','Siding','Clearing','GeneralContracting','Other',
].map((t) => ({ label: t.replace(/([A-Z])/g, ' $1').trim(), value: t }));

const URGENCY_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Emergency', value: 'Emergency' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map((s) => ({ label: s, value: s }));

const jobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  budgetMin: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be positive'),
  budgetMax: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be positive'),
  streetAddress: z.string().min(5, 'Enter a street address'),
  city: z.string().min(2, 'Enter a city'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  clientName: z.string().max(100).optional(),
  clientNote: z.string().max(500).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

function PostJobContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tradeType, setTradeType] = useState('');
  const [urgency, setUrgency] = useState('Low');
  const [state, setState] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
  });

  async function onSubmit(data: JobFormData) {
    if (!tradeType) { toast.error('Select a trade type'); return; }
    if (!state) { toast.error('Select a state'); return; }

    setLoading(true);
    try {
      await api.post('/jobs', { ...data, tradeType, urgency, state });
      toast.success('Referral posted!');
      router.push('/dashboard/my-referrals');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post job');
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
        <p className="text-sm text-surface-muted">Got a lead you can&apos;t take? Post it and earn a commission when it&apos;s completed.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="space-y-5">
          {/* Job details */}
          <Input label="Job Title" placeholder="e.g. Residential Roof Repair" error={errors.title?.message as string} {...register('title')} />
          <div className="space-y-1.5">
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={5}
              placeholder="Describe the job scope, requirements, and any details the contractor should know..."
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Trade Type" options={TRADE_OPTIONS} value={tradeType} onChange={setTradeType} placeholder="Select trade..." />
            <Select label="Urgency" options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Budget ($)" type="number" placeholder="500" error={errors.budgetMin?.message as string} {...register('budgetMin', { valueAsNumber: true })} />
            <Input label="Max Budget ($)" type="number" placeholder="2000" error={errors.budgetMax?.message as string} {...register('budgetMax', { valueAsNumber: true })} />
          </div>

          {/* Location */}
          <div className="pt-4 border-t border-surface-border">
            <p className="text-sm font-medium text-slate-200 mb-3">Job Location</p>
            <Input label="Street Address" className="mb-3" error={errors.streetAddress?.message as string} {...register('streetAddress')} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" error={errors.city?.message as string} {...register('city')} />
              <Select label="State" options={US_STATES} value={state} onChange={setState} placeholder="State" />
              <Input label="ZIP" error={errors.zipCode?.message as string} {...register('zipCode')} placeholder="77001" />
            </div>
          </div>

          {/* Client info */}
          <div className="pt-4 border-t border-surface-border">
            <p className="text-sm font-medium text-slate-200 mb-3">Client Information (Optional)</p>
            <Input label="Client Name" className="mb-3" {...register('clientName')} placeholder="e.g. John Smith" />
            <div className="space-y-1.5">
              <label className="label">Client Notes</label>
              <textarea className="input-field resize-none" rows={3} {...register('clientNote')} placeholder="Any notes about the client or job site..." />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            <Send className="w-4 h-4" /> Post Referral
          </Button>
        </Card>
      </form>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense><PostJobContent /></Suspense>
  );
}
