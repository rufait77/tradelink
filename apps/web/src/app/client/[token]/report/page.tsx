'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'not_responding', label: 'Contractor Not Responding', desc: 'No contact for 48+ hours after assignment' },
  { value: 'off_platform', label: 'Off-Platform Activity', desc: 'Contractor asked to negotiate or pay outside Tradelink' },
  { value: 'poor_quality', label: 'Quality Concern', desc: 'Work quality does not meet expectations' },
  { value: 'unprofessional', label: 'Unprofessional Conduct', desc: 'Rude, late, or inappropriate behavior' },
  { value: 'other', label: 'Other Issue', desc: 'Something else not listed above' },
];

export default function ReportPage() {
  const { token } = useParams();
  const router = useRouter();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!selectedType) { toast.error('Please select a report type'); return; }
    if (description.length < 10) { toast.error('Please describe the issue (at least 10 characters)'); return; }

    setSubmitLoading(true);
    try {
      await clientApi.post(`/client/${token}/report`, {
        type: selectedType,
        description,
      });
      toast.success('Report submitted successfully');
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Report Received</h1>
          <p className="text-surface-muted">
            Thank you for reporting this. Our team will investigate within{' '}
            <span className="text-amber-400 font-medium">24 hours</span> and take appropriate action.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push(`/client/${token}`)}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white">Report an Issue</h1>
            <p className="text-xs text-surface-muted">
              We take all reports seriously and will investigate promptly.
            </p>
          </div>
        </div>

        {/* Report type selector */}
        <div className="mb-5">
          <label className="label mb-2 block">What type of issue?</label>
          <div className="space-y-2">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedType(r.value)}
                className={`w-full p-4 rounded-xl border text-left transition ${
                  selectedType === r.value
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-surface-border bg-surface-elevated hover:border-surface-muted'
                }`}
              >
                <p className={`text-sm font-medium ${selectedType === r.value ? 'text-amber-400' : 'text-white'}`}>
                  {r.label}
                </p>
                <p className="text-xs text-surface-muted mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="label mb-2 block">Tell us more</label>
          <textarea
            className="input-field resize-none w-full"
            rows={4}
            placeholder="Please describe the issue in detail. Include dates, times, and specific examples if possible..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button variant="danger" className="w-full" size="lg" onClick={handleSubmit} loading={submitLoading}>
          <Send className="w-4 h-4" /> Submit Report
        </Button>

        <p className="text-[11px] text-surface-muted text-center mt-4">
          Reports are confidential. The contractor will not see your identity.
        </p>
      </Card>
    </div>
  );
}
