'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import clientApi from '../../../../lib/clientApi';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { useT, useLabels, type TranslationKey } from '../../../../i18n';

// `value` is the API enum; only the label and description are translated.
const REPORT_TYPES: { value: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { value: 'not_responding', labelKey: 'clientReport.type.notResponding', descKey: 'clientReport.type.notRespondingDesc' },
  { value: 'off_platform', labelKey: 'clientReport.type.offPlatform', descKey: 'clientReport.type.offPlatformDesc' },
  { value: 'poor_quality', labelKey: 'clientReport.type.quality', descKey: 'clientReport.type.qualityDesc' },
  { value: 'unprofessional', labelKey: 'clientReport.type.unprofessional', descKey: 'clientReport.type.unprofessionalDesc' },
  { value: 'other', labelKey: 'clientReport.type.other', descKey: 'clientReport.type.otherDesc' },
];

export default function ReportPage() {
  const { token } = useParams();
  const router = useRouter();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const t = useT();
  const { apiErrorMessage } = useLabels();

  async function handleSubmit() {
    if (!selectedType) { toast.error(t('clientReport.toast.pickType')); return; }
    if (description.length < 10) { toast.error(t('clientReport.toast.tooShort')); return; }

    setSubmitLoading(true);
    try {
      await clientApi.post(`/client/${token}/report`, {
        type: selectedType,
        description,
      });
      toast.success(t('clientReport.toast.success'));
      setSubmitted(true);
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('clientReport.toast.failed')));
    } finally {
      setSubmitLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> {t('client.back')}
        </button>
        <Card className="text-center py-8">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">{t('clientReport.receivedTitle')}</h1>
          <p className="text-surface-muted">
            {t('clientReport.receivedLead')}{' '}
            <span className="text-amber-400 font-medium">{t('clientReport.receivedHours')}</span> {t('clientReport.receivedRest')}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push(`/client/${token}`)}>
            {t('client.back')}
          </Button>
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
            <h1 className="text-lg font-heading font-bold text-white">{t('clientReport.title')}</h1>
            <p className="text-xs text-surface-muted">
              {t('clientReport.subtitle')}
            </p>
          </div>
        </div>

        {/* Report type selector */}
        <div className="mb-5">
          <label className="label mb-2 block">{t('clientReport.typeLabel')}</label>
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
                  {t(r.labelKey)}
                </p>
                <p className="text-xs text-surface-muted mt-0.5">{t(r.descKey)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="label mb-2 block">{t('clientReport.describeLabel')}</label>
          <textarea
            className="input-field resize-none w-full"
            rows={4}
            placeholder={t('clientReport.describePlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button variant="danger" className="w-full" size="lg" onClick={handleSubmit} loading={submitLoading}>
          <Send className="w-4 h-4" /> {t('clientReport.submit')}
        </Button>

        <p className="text-[11px] text-surface-muted text-center mt-4">
          {t('clientReport.confidential')}
        </p>
      </Card>
    </div>
  );
}
