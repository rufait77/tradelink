'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { PageLoader } from '../../../components/ui/spinner';
import { formatCurrency, getStatusClass } from '../../../lib/utils';
import clientApi from '../../../lib/clientApi';
import { toast } from 'sonner';
import {
  Briefcase, User, Star, MapPin, Shield, Clock,
  CheckCircle2, FileText, CreditCard, AlertTriangle,
  MessageSquare, ChevronRight, PhoneOff,
} from 'lucide-react';
import { useT, useLabels, useFormat, type TranslationKey } from '../../../i18n';
import { en } from '../../../i18n/en';

// ─── 7B: Ghost Report Button ────────────────────────────────────────────────
function GhostReportButton({ token, jobTitle }: { token: string; jobTitle: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const t = useT();
  const { apiErrorMessage } = useLabels();

  const handleReport = async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      await clientApi.post(`/client/${token}/report`, {
        type: 'not_responding',
        description: t('client.ghost.description', { title: jobTitle }),
      });
      setSubmitted(true);
      toast.success(t('client.ghost.toastSuccess'));
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('client.ghost.toastFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">{t('client.ghost.submitted')}</p>
            <p className="text-xs text-surface-muted">{t('client.ghost.submittedDesc')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card hover className="cursor-pointer border-amber-500/10" onClick={handleReport}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <PhoneOff className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {submitting ? t('client.ghost.submitting') : t('client.ghost.prompt')}
          </p>
          <p className="text-xs text-surface-muted">{t('client.ghost.promptDesc')}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
      </div>
    </Card>
  );
}

interface DashboardData {
  clientName: string;
  job: {
    title: string;
    description: string;
    tradeType: string;
    status: string;
    budgetMin: number;
    budgetMax: number;
  };
  contractor: {
    name: string;
    photoUrl?: string;
    avgRating: number;
    tradeTypes: string[];
    bio?: string;
    yearsExperience: number;
    totalJobsCompleted: number;
    city: string;
    state: string;
    isVerified: boolean;
    licenseNumber?: string;
    hasInsurance: boolean;
  } | null;
  activeQuote: {
    id: string;
    amount: number;
    scope: string;
    scheduledDate: string;
    status: string;
  } | null;
  escrow: {
    status: string;
    totalAmount: number;
    paidAt?: string;
  } | null;
  referee: { name: string };
}

// Timeline steps mapped to job statuses
const TIMELINE_STEPS: { status: string; labelKey: TranslationKey; icon: typeof Briefcase }[] = [
  { status: 'Open', labelKey: 'client.step.posted', icon: Briefcase },
  { status: 'Assigned', labelKey: 'client.step.assigned', icon: User },
  { status: 'QuoteSent', labelKey: 'client.step.quoteSent', icon: FileText },
  { status: 'QuoteApproved', labelKey: 'client.step.quoteApproved', icon: CheckCircle2 },
  { status: 'EscrowFunded', labelKey: 'client.step.paid', icon: CreditCard },
  { status: 'InProgress', labelKey: 'client.step.inProgress', icon: Clock },
  { status: 'ContractorDone', labelKey: 'client.step.workDone', icon: CheckCircle2 },
  { status: 'Completed', labelKey: 'client.step.completed', icon: Star },
];

function getStepIndex(status: string): number {
  const directMap: Record<string, number> = {
    Open: 0, InterestClosed: 0, Assigned: 1, QuoteSent: 2, QuoteApproved: 3,
    EscrowFunded: 4, InProgress: 5, ContractorDone: 6, ClientConfirmed: 7,
    Completed: 7, Disputed: 6, Cancelled: -1, Expired: -1,
  };
  return directMap[status] ?? 0;
}

export default function ClientDashboardPage() {
  const { token } = useParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useT();
  const { tradeLabel, statusLabel, escrowStatusLabel, apiErrorMessage } = useLabels();
  const { formatDate } = useFormat();

  // Quote review states come from the API; fall back to the raw value.
  function quoteStatusLabel(status: string) {
    const key = `quoteStatus.${status}`;
    return key in en ? t(key as TranslationKey) : status;
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setData(res.data.data);
      } catch (err: any) {
        const msg = apiErrorMessage(err, t('client.loadFailed'));
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) return <PageLoader />;

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">{t('client.accessDenied')}</h1>
        <p className="text-surface-muted">{error || t('client.accessExpired')}</p>
      </div>
    );
  }

  const currentStep = getStepIndex(data.job.status);
  const isDisputeActive = data.job.status === 'Disputed';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome banner */}
      <Card className="bg-gradient-to-br from-amber-500/5 to-emerald-500/5 border-amber-500/10">
        <h1 className="text-xl font-heading font-bold text-white mb-1">
          {t('client.welcome', { name: data.clientName })}
        </h1>
        <p className="text-sm text-surface-muted">
          {t('client.welcomeBody', { name: data.referee.name })}
        </p>
      </Card>

      {/* Job Info */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="amber">{tradeLabel(data.job.tradeType)}</Badge>
              <Badge variant="status" statusClass={getStatusClass(data.job.status)}>
                {isDisputeActive ? t('client.disputedBadge') : statusLabel(data.job.status)}
              </Badge>
            </div>
            <h2 className="text-lg font-heading font-semibold text-white">{data.job.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-heading font-bold text-emerald-400">
              {formatCurrency(data.job.budgetMin)} – {formatCurrency(data.job.budgetMax)}
            </p>
            <p className="text-xs text-surface-muted">{t('client.estimatedBudget')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{data.job.description}</p>
      </Card>

      {/* Timeline */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> {t('client.progress')}
        </h3>
        <div className="relative">
          {TIMELINE_STEPS.map((step, i) => {
            const isCompleted = i <= currentStep;
            const isCurrent = i === currentStep;
            const StepIcon = step.icon;
            return (
              <div key={step.status} className="flex items-start gap-4 relative">
                {/* Vertical line */}
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`absolute left-[15px] top-[32px] w-0.5 h-8 ${
                    i < currentStep ? 'bg-emerald-500' : 'bg-surface-border'
                  }`} />
                )}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-surface-elevated border-surface-border text-surface-muted'
                } ${isCurrent ? 'ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-navy-950' : ''}`}>
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <div className="pb-8">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-white' : 'text-surface-muted'}`}>
                    {t(step.labelKey)}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-emerald-400 mt-0.5">{t('client.currentStage')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Assigned Contractor */}
      {data.contractor && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-500" /> {t('client.contractor.title')}
          </h3>
          <div className="flex items-start gap-4">
            {data.contractor.photoUrl ? (
              <img src={data.contractor.photoUrl} alt={data.contractor.name}
                className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-amber-400">{data.contractor.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-semibold text-white">{data.contractor.name}</h4>
                {data.contractor.isVerified && (
                  <Shield className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-surface-muted mb-2">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> {data.contractor.avgRating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> {t('client.contractor.jobs', { count: data.contractor.totalJobsCompleted })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {data.contractor.city}, {data.contractor.state}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.contractor.tradeTypes.map(trade => (
                  <Badge key={trade} variant="amber">{tradeLabel(trade)}</Badge>
                ))}
              </div>
              {data.contractor.licenseNumber && (
                <p className="text-xs text-surface-muted mt-2">{t('client.contractor.license', { number: data.contractor.licenseNumber })}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Active Quote */}
      {data.activeQuote && (
        <Card glow={data.activeQuote.status === 'sent'}>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> {t('client.quote.title')}
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-surface-muted">{t('client.quote.total')}</p>
              <p className="text-lg font-heading font-bold text-emerald-400">
                {formatCurrency(data.activeQuote.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-muted">{t('client.quote.scheduled')}</p>
              <p className="text-sm font-medium text-white">
                {formatDate(data.activeQuote.scheduledDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-muted">{t('client.quote.status')}</p>
              <Badge variant={data.activeQuote.status === 'approved' ? 'green' : 'amber'}>
                {quoteStatusLabel(data.activeQuote.status)}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{data.activeQuote.scope}</p>

          {data.activeQuote.status === 'sent' && (
            <Button
              className="w-full"
              onClick={() => router.push(`/client/${token}/quote`)}
            >
              <FileText className="w-4 h-4" /> {t('client.quote.review')}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment */}
        {data.job.status === 'QuoteApproved' && (
          <Card hover className="cursor-pointer" onClick={() => router.push(`/client/${token}/pay`)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('client.action.pay')}</p>
                <p className="text-xs text-surface-muted">{t('client.action.payDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
            </div>
          </Card>
        )}

        {/* Confirm Completion */}
        {data.job.status === 'ContractorDone' && (
          <Card hover className="cursor-pointer" onClick={() => router.push(`/client/${token}/confirm`)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('client.action.confirm')}</p>
                <p className="text-xs text-surface-muted">{t('client.action.confirmDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
            </div>
          </Card>
        )}

        {/* 7B: Contractor Not Responding? — visible after 48hrs on InProgress/Assigned */}
        {(data.job.status === 'InProgress' || data.job.status === 'Assigned') && (
          <GhostReportButton token={token as string} jobTitle={data.job.title} />
        )}

        {/* Rate contractor */}
        {(data.job.status === 'ClientConfirmed' || data.job.status === 'Completed') && (
          <Card hover className="cursor-pointer" onClick={() => router.push(`/client/${token}/rate`)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('client.action.rate')}</p>
                <p className="text-xs text-surface-muted">{t('client.action.rateDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
            </div>
          </Card>
        )}

        {/* Report an issue — always visible */}
        <Card hover className="cursor-pointer" onClick={() => router.push(`/client/${token}/report`)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('client.action.report')}</p>
              <p className="text-xs text-surface-muted">{t('client.action.reportDesc')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
          </div>
        </Card>
      </div>

      {/* Escrow status */}
      {data.escrow && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" /> {t('client.payment.title')}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-muted">{t('client.payment.amount')}</p>
              <p className="text-lg font-heading font-bold text-white">{formatCurrency(data.escrow.totalAmount)}</p>
            </div>
            <Badge variant={data.escrow.status === 'funded' ? 'green' : data.escrow.status === 'released' ? 'blue' : 'amber'}>
              {data.escrow.status === 'funded' ? t('client.payment.held') :
               data.escrow.status === 'released' ? t('client.payment.released') :
               data.escrow.status === 'disputed' ? t('client.payment.frozen') :
               escrowStatusLabel(data.escrow.status)}
            </Badge>
          </div>
        </Card>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-surface-muted py-4">
        {t('client.footerLead')} <span className="text-amber-400 font-medium">Tradelink</span>.{' '}
        {t('client.footerRest')} <a href="mailto:support@tradelinkpro.net" className="text-amber-400 hover:underline">{t('client.footerSupport')}</a>.
      </p>
    </div>
  );
}
