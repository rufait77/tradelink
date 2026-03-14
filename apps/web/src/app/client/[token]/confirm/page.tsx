'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { PageLoader } from '../../../../components/ui/spinner';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertTriangle, ArrowLeft, Clock,
  Image as ImageIcon, ShieldCheck,
} from 'lucide-react';

interface ConfirmData {
  clientName: string;
  job: {
    title: string; status: string;
    contractorCompletedAt?: string;
    autoReleaseAt?: string;
    completionPhotos?: string[];
  };
  contractor: { name: string } | null;
}

export default function ConfirmCompletionPage() {
  const { token } = useParams();
  const router = useRouter();
  const [data, setData] = useState<ConfirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setData(res.data.data);
      } catch {
        toast.error('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleConfirm() {
    setActionLoading(true);
    try {
      await clientApi.post(`/client/${token}/confirm`);
      toast.success('Job confirmed as complete! Payment is being released.');
      router.push(`/client/${token}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm completion');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-heading font-bold text-white">Access Error</h1>
      </div>
    );
  }

  // Already confirmed
  if (data.job.status === 'ClientConfirmed' || data.job.status === 'Completed') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Job Confirmed!</h1>
          <p className="text-surface-muted">
            You&apos;ve confirmed this job as complete. Payment has been released to the contractor.
          </p>
          <Button className="mt-6" onClick={() => router.push(`/client/${token}/rate`)}>
            Rate Your Contractor
          </Button>
        </Card>
      </div>
    );
  }

  // Job not marked as done yet
  if (data.job.status !== 'ContractorDone') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Work Still in Progress</h1>
          <p className="text-surface-muted">
            The contractor has not yet marked this job as complete.
            You&apos;ll be notified when it&apos;s ready for your review.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate countdown
  let daysRemaining: number | null = null;
  if (data.job.autoReleaseAt) {
    const diff = new Date(data.job.autoReleaseAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card>
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white mb-1">
            {data.contractor?.name} Marked the Job Complete
          </h1>
          <p className="text-sm text-surface-muted">
            Please review and confirm that the work has been done to your satisfaction.
          </p>
        </div>

        {/* Completion photos */}
        {data.job.completionPhotos && data.job.completionPhotos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" /> Completion Photos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {data.job.completionPhotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-surface-border hover:border-amber-500/30 transition">
                  <img src={url} alt={`Completion photo ${i + 1}`}
                    className="w-full h-40 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Auto-release warning */}
        {daysRemaining !== null && daysRemaining > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-slate-300">
                If you don&apos;t respond, payment will auto-release in{' '}
                <span className="text-amber-400 font-semibold">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button className="flex-1" size="lg" onClick={handleConfirm} loading={actionLoading}>
            <CheckCircle2 className="w-4 h-4" /> Confirm — Job is Done
          </Button>
          <Button variant="danger" className="flex-1" size="lg"
            onClick={() => router.push(`/client/${token}/dispute`)}>
            <AlertTriangle className="w-4 h-4" /> Raise a Dispute
          </Button>
        </div>

        <p className="text-[11px] text-surface-muted text-center mt-4">
          By confirming, you authorize the release of escrowed funds to the contractor.
        </p>
      </Card>
    </div>
  );
}
