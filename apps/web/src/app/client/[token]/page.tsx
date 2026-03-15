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

// ─── 7B: Ghost Report Button ────────────────────────────────────────────────
function GhostReportButton({ token, jobTitle }: { token: string; jobTitle: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleReport = async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      await clientApi.post(`/client/${token}/report`, {
        type: 'not_responding',
        description: `Client reports contractor is not responding for "${jobTitle}".`,
      });
      setSubmitted(true);
      toast.success('Report submitted. We will follow up within 24 hours.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
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
            <p className="text-sm font-semibold text-amber-300">Report Submitted</p>
            <p className="text-xs text-surface-muted">We'll follow up within 24 hours</p>
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
            {submitting ? 'Submitting...' : 'Contractor Not Responding?'}
          </p>
          <p className="text-xs text-surface-muted">Report if no contact after 48 hours</p>
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
const TIMELINE_STEPS = [
  { status: 'Open', label: 'Referral Posted', icon: Briefcase },
  { status: 'Assigned', label: 'Contractor Assigned', icon: User },
  { status: 'QuoteSent', label: 'Quote Sent', icon: FileText },
  { status: 'QuoteApproved', label: 'Quote Approved', icon: CheckCircle2 },
  { status: 'EscrowFunded', label: 'Payment Received', icon: CreditCard },
  { status: 'InProgress', label: 'Work In Progress', icon: Clock },
  { status: 'ContractorDone', label: 'Work Complete', icon: CheckCircle2 },
  { status: 'Completed', label: 'Job Completed', icon: Star },
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

  useEffect(() => {
    async function load() {
      try {
        const res = await clientApi.get(`/client/${token}`);
        setData(res.data.data);
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Invalid or expired access link';
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
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Access Denied</h1>
        <p className="text-surface-muted">{error || 'This link is invalid or has expired.'}</p>
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
          Welcome, {data.clientName}
        </h1>
        <p className="text-sm text-surface-muted">
          {data.referee.name} referred your job to our platform.
          Track everything about your project here.
        </p>
      </Card>

      {/* Job Info */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="amber">{data.job.tradeType.replace(/([A-Z])/g, ' $1').trim()}</Badge>
              <Badge variant="status" statusClass={getStatusClass(data.job.status)}>
                {isDisputeActive ? '⚠️ Disputed' : data.job.status.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            </div>
            <h2 className="text-lg font-heading font-semibold text-white">{data.job.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-heading font-bold text-emerald-400">
              {formatCurrency(data.job.budgetMin)} – {formatCurrency(data.job.budgetMax)}
            </p>
            <p className="text-xs text-surface-muted">Estimated Budget</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{data.job.description}</p>
      </Card>

      {/* Timeline */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Job Progress
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
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-emerald-400 mt-0.5">Current stage</p>
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
            <User className="w-4 h-4 text-amber-500" /> Your Contractor
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
                  <Briefcase className="w-3.5 h-3.5" /> {data.contractor.totalJobsCompleted} jobs
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {data.contractor.city}, {data.contractor.state}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.contractor.tradeTypes.map(t => (
                  <Badge key={t} variant="amber">{t.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                ))}
              </div>
              {data.contractor.licenseNumber && (
                <p className="text-xs text-surface-muted mt-2">License: {data.contractor.licenseNumber}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Active Quote */}
      {data.activeQuote && (
        <Card glow={data.activeQuote.status === 'sent'}>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> Quote Details
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-surface-muted">Total</p>
              <p className="text-lg font-heading font-bold text-emerald-400">
                {formatCurrency(data.activeQuote.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-muted">Scheduled</p>
              <p className="text-sm font-medium text-white">
                {new Date(data.activeQuote.scheduledDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-muted">Status</p>
              <Badge variant={data.activeQuote.status === 'approved' ? 'green' : 'amber'}>
                {data.activeQuote.status}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{data.activeQuote.scope}</p>

          {data.activeQuote.status === 'sent' && (
            <Button
              className="w-full"
              onClick={() => router.push(`/client/${token}/quote`)}
            >
              <FileText className="w-4 h-4" /> Review & Approve Quote
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
                <p className="text-sm font-semibold text-white">Make Payment</p>
                <p className="text-xs text-surface-muted">Pay securely via Stripe</p>
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
                <p className="text-sm font-semibold text-white">Confirm Completion</p>
                <p className="text-xs text-surface-muted">Review work & release payment</p>
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
                <p className="text-sm font-semibold text-white">Rate Contractor</p>
                <p className="text-xs text-surface-muted">Leave a review</p>
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
              <p className="text-sm font-semibold text-white">Report an Issue</p>
              <p className="text-xs text-surface-muted">Something not right?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-muted ml-auto" />
          </div>
        </Card>
      </div>

      {/* Escrow status */}
      {data.escrow && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" /> Payment Status
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-muted">Amount</p>
              <p className="text-lg font-heading font-bold text-white">{formatCurrency(data.escrow.totalAmount)}</p>
            </div>
            <Badge variant={data.escrow.status === 'funded' ? 'green' : data.escrow.status === 'released' ? 'blue' : 'amber'}>
              {data.escrow.status === 'funded' ? 'Funds Held Securely' :
               data.escrow.status === 'released' ? 'Funds Released' :
               data.escrow.status === 'disputed' ? '⚠️ Frozen — Under Review' :
               data.escrow.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-surface-muted py-4">
        This portal is provided by <span className="text-amber-400 font-medium">Tradelink</span>.
        Your data is secure. Need help? <a href="mailto:support@tradelinkpro.net" className="text-amber-400 hover:underline">Contact support</a>.
      </p>
    </div>
  );
}
