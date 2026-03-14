'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { PageLoader } from '../../../../components/ui/spinner';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, ShieldAlert, Send } from 'lucide-react';

const DISPUTE_REASONS = [
  { value: 'incomplete_work', label: 'Work was not completed' },
  { value: 'poor_quality', label: 'Work quality is unacceptable' },
  { value: 'scope_mismatch', label: 'Scope doesn\'t match the quote' },
  { value: 'damage', label: 'Contractor caused property damage' },
  { value: 'no_show', label: 'Contractor never showed up' },
  { value: 'other', label: 'Other issue' },
];

export default function DisputePage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/client/${token}`);
        setJobStatus(res.data.data.job.status);
        if (res.data.data.job.status === 'Disputed') setSubmitted(true);
      } catch {
        toast.error('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSubmit() {
    if (!selectedReason) { toast.error('Please select a reason'); return; }
    if (description.length < 20) { toast.error('Please describe the issue in at least 20 characters'); return; }

    setSubmitLoading(true);
    try {
      const reasonLabel = DISPUTE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
      await api.post(`/client/${token}/dispute`, {
        reason: `${reasonLabel}: ${description}`,
      });
      toast.success('Dispute filed successfully. An admin will review your case.');
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit dispute');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <ShieldAlert className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Dispute Filed</h1>
          <p className="text-surface-muted mb-2">
            Your dispute has been submitted. Our team will review your case and the contractor&apos;s response within <span className="text-amber-400 font-medium">48 hours</span>.
          </p>
          <p className="text-xs text-surface-muted">
            Escrowed funds are frozen until the dispute is resolved.
          </p>
        </Card>
      </div>
    );
  }

  // Check if disputable
  const disputeableStatuses = ['InProgress', 'ContractorDone', 'EscrowFunded'];
  if (!disputeableStatuses.includes(jobStatus)) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Cannot File a Dispute</h1>
          <p className="text-surface-muted">
            A dispute can only be filed when the job is in progress, funded, or marked as complete by the contractor.
          </p>
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
            <h1 className="text-lg font-heading font-bold text-white">Raise a Dispute</h1>
            <p className="text-xs text-surface-muted">
              Tell us what went wrong. Our team will review both sides.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <p className="text-sm text-slate-300">
            <span className="text-red-400 font-medium">Important:</span> Filing a dispute will freeze any escrowed funds
            until our admin team resolves the issue. This typically takes 24–48 hours.
          </p>
        </div>

        {/* Reason selector */}
        <div className="mb-5">
          <label className="label mb-2 block">What went wrong?</label>
          <div className="grid grid-cols-2 gap-2">
            {DISPUTE_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedReason(r.value)}
                className={`p-3 rounded-xl border text-sm text-left transition ${
                  selectedReason === r.value
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-surface-border bg-surface-elevated text-surface-muted hover:border-surface-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="label mb-2 block">Describe the issue</label>
          <textarea
            className="input-field resize-none w-full"
            rows={5}
            placeholder="Please provide details about the issue. Include specific examples and any relevant information that will help us understand the situation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-surface-muted mt-1">{description.length}/500 characters (min 20)</p>
        </div>

        <Button variant="danger" className="w-full" size="lg" onClick={handleSubmit} loading={submitLoading}>
          <Send className="w-4 h-4" /> Submit Dispute
        </Button>
      </Card>
    </div>
  );
}
