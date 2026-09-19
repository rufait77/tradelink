'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { PageLoader } from '../../../../components/ui/spinner';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, ShieldAlert, Send } from 'lucide-react';
import { useT, useLabels, type TranslationKey } from '../../../../i18n';

// `value` is the API enum; only the label is translated.
const DISPUTE_REASONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'incomplete_work', labelKey: 'clientDispute.reason.incomplete' },
  { value: 'poor_quality', labelKey: 'clientDispute.reason.quality' },
  { value: 'scope_mismatch', labelKey: 'clientDispute.reason.scope' },
  { value: 'damage', labelKey: 'clientDispute.reason.damage' },
  { value: 'no_show', labelKey: 'clientDispute.reason.noShow' },
  { value: 'other', labelKey: 'clientDispute.reason.other' },
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
  const t = useT();
  const { apiErrorMessage } = useLabels();

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setJobStatus(res.data.data.job.status);
        if (res.data.data.job.status === 'Disputed') setSubmitted(true);
      } catch {
        toast.error(t('client.invalidLink'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSubmit() {
    if (!selectedReason) { toast.error(t('clientDispute.toast.pickReason')); return; }
    if (description.length < 20) { toast.error(t('clientDispute.toast.tooShort')); return; }

    setSubmitLoading(true);
    try {
      const reason = DISPUTE_REASONS.find(r => r.value === selectedReason);
      const reasonLabel = reason ? t(reason.labelKey) : selectedReason;
      await clientApi.post(`/client/${token}/dispute`, {
        reason: `${reasonLabel}: ${description}`,
      });
      toast.success(t('clientDispute.toast.success'));
      setSubmitted(true);
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('clientDispute.toast.failed')));
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
          <ArrowLeft className="w-4 h-4" /> {t('client.back')}
        </button>
        <Card className="text-center py-8">
          <ShieldAlert className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">{t('clientDispute.filedTitle')}</h1>
          <p className="text-surface-muted mb-2">
            {t('clientDispute.filedLead')} <span className="text-amber-400 font-medium">{t('clientDispute.filedHours')}</span>.
          </p>
          <p className="text-xs text-surface-muted">
            {t('clientDispute.filedNote')}
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
          <ArrowLeft className="w-4 h-4" /> {t('client.back')}
        </button>
        <Card className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">{t('clientDispute.blockedTitle')}</h1>
          <p className="text-surface-muted">
            {t('clientDispute.blockedBody')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> {t('client.back')}
      </button>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white">{t('clientDispute.title')}</h1>
            <p className="text-xs text-surface-muted">
              {t('clientDispute.subtitle')}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <p className="text-sm text-slate-300">
            <span className="text-red-400 font-medium">{t('clientDispute.warningWord')}</span> {t('clientDispute.warningBody')}
          </p>
        </div>

        {/* Reason selector */}
        <div className="mb-5">
          <label className="label mb-2 block">{t('clientDispute.reasonLabel')}</label>
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
                {t(r.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="label mb-2 block">{t('clientDispute.describeLabel')}</label>
          <textarea
            className="input-field resize-none w-full"
            rows={5}
            placeholder={t('clientDispute.describePlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-surface-muted mt-1">{t('clientDispute.charCount', { count: description.length })}</p>
        </div>

        <Button variant="danger" className="w-full" size="lg" onClick={handleSubmit} loading={submitLoading}>
          <Send className="w-4 h-4" /> {t('clientDispute.submit')}
        </Button>
      </Card>
    </div>
  );
}
