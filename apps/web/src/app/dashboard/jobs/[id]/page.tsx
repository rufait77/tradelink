'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { PageLoader } from '../../../../components/ui/spinner';
import { useAuthStore } from '../../../../store/auth.store';
import api from '../../../../lib/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../../../../lib/utils';
import { toast } from 'sonner';
import {
  MapPin, Clock, DollarSign, User, ArrowLeft, Send,
  CheckCircle2, MessageSquare, Star, Users, Briefcase,
  FileText, Calendar, Phone, Mail, Lock, Camera,
  AlertTriangle, Timer, XCircle, RotateCcw, Trash2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';
const ASSETS_BASE = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE.replace(/\/+$/, '');
function resolveUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${ASSETS_BASE}${url}`;
}

// ─── Types ─────────────────────────────────────────────────────────────

interface JobDetail {
  id: string; title: string; description: string; tradeType: string;
  budgetMin: number; budgetMax: number; streetAddress: string; city: string;
  state: string; zipCode: string; urgency: string; status: string;
  clientName?: string; clientNote?: string; expiresAt: string; createdAt: string;
  estimatedValue?: number | null;
  interestWindowEnd?: string | null;
  assignedAt?: string | null;
  contractorCompletedAt?: string | null;
  autoReleaseAt?: string | null;
  clientLead?: {
    firstName: string; lastName: string; email: string;
    phone?: string | null; streetAddress: string; city: string;
    state: string; zipCode: string; notes?: string | null;
  } | null;
  postedBy: { id: string; name: string; profile?: { photoUrl?: string; avgRating?: number } };
  claimedBy?: { id: string; name: string; profile?: { photoUrl?: string; avgRating?: number } } | null;
  _count?: { interests?: number };
}

interface Interest {
  id: string; message?: string; createdAt: string; status: string;
  contractor: {
    id: string; name: string;
    profile?: {
      photoUrl?: string; avgRating?: number; totalJobsCompleted?: number;
      avgResponseTime?: string; tradeTypes?: string[]; bio?: string;
      yearsExperience?: number; city?: string; state?: string;
    };
  };
}

interface Quote {
  id: string; amount: number; scope: string; scheduledDate: string;
  status: string; createdAt: string;
  platformFeePct: number; commissionPct: number;
}

interface Message {
  id: string; senderId: string; content: string; createdAt: string;
  sender: { name: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getUrgencyClass(u: string) {
  switch (u) {
    case 'Emergency': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'High': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'Medium': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
}

function getStatusClass(s: string) {
  if (['Completed','ClientConfirmed'].includes(s)) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (['InProgress','EscrowFunded','ContractorDone'].includes(s)) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (['Cancelled','Expired','Disputed'].includes(s)) return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Interest / Assignment
  const [interests, setInterests] = useState<Interest[]>([]);
  const [myInterest, setMyInterest] = useState<any>(null);
  const [interestMessage, setInterestMessage] = useState('');

  // Quote
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteScope, setQuoteScope] = useState('');
  const [quoteDate, setQuoteDate] = useState('');

  // Completion
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Rating Prompt (5F)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingText, setRatingText] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Active tab for referee view
  const [activeTab, setActiveTab] = useState<'details' | 'interests' | 'quotes'>('details');

  // ─── Load Data ────────────────────────────────────────────────────────

  async function loadJob() {
    try {
      const res = await api.get(`/jobs/${id}`);
      const jobData = res.data.data?.job || res.data.data;
      setJob(jobData);
      return jobData;
    } catch {
      toast.error('Job not found');
      router.push('/dashboard/jobs');
      return null;
    }
  }

  useEffect(() => {
    async function init() {
      const jobData = await loadJob();
      if (!jobData) { setLoading(false); return; }

      // Load additional data based on role
      const userId = user?.id;
      const isOwner = userId === jobData.postedBy?.id;
      const isAssigned = userId === jobData.claimedBy?.id;

      try {
        // If owner, load interests
        if (isOwner) {
          const intRes = await api.get(`/jobs/${id}/interests`).catch(() => ({ data: { data: { interests: [] } } }));
          setInterests(intRes.data.data?.interests || []);
        }

        // Check my interest status
        if (!isOwner) {
          const myIntRes = await api.get(`/jobs/${id}/my-interest`).catch(() => ({ data: { data: { interest: null } } }));
          setMyInterest(myIntRes.data.data?.interest);
        }

        // Load quotes if assigned or owner
        if (isOwner || isAssigned) {
          const qRes = await api.get(`/jobs/${id}/quotes`).catch(() => ({ data: { data: { quotes: [] } } }));
          setQuotes(qRes.data.data?.quotes || []);
        }

        // Load messages if involved
        if (isOwner || isAssigned) {
          const msgRes = await api.get(`/messages/${id}`).catch(() => ({ data: { data: { messages: [] } } }));
          const msgData = msgRes.data.data;
          setMessages(Array.isArray(msgData) ? msgData : Array.isArray(msgData?.messages) ? msgData.messages : []);
        }

        // Check if user already rated this job (5F)
        if (['Completed', 'ClientConfirmed', 'ContractorDone'].includes(jobData.status) && (isOwner || isAssigned)) {
          try {
            const revRes = await api.get(`/reviews/my-review/${id}`);
            if (revRes.data.data?.review) setHasRated(true);
          } catch { /* no review yet */ }
        }
      } catch {}

      setLoading(false);
    }
    init();
  }, [id]);

  // ─── Role Detection ───────────────────────────────────────────────────

  const isOwner = user?.id === job?.postedBy?.id;
  const isAssigned = user?.id === job?.claimedBy?.id;
  const isBrowser = !isOwner && !isAssigned;
  const displayValue = job?.estimatedValue || ((job?.budgetMin ?? 0) + (job?.budgetMax ?? 0)) / 2;

  // ─── Actions ──────────────────────────────────────────────────────────

  async function handleExpressInterest() {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/interest`, { message: interestMessage || undefined });
      toast.success('Interest expressed! The referee will review your profile.');
      const res = await api.get(`/jobs/${id}/my-interest`);
      setMyInterest(res.data.data?.interest);
      setInterestMessage('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to express interest');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWithdrawInterest() {
    setActionLoading(true);
    try {
      await api.delete(`/jobs/${id}/interest`);
      toast.success('Interest withdrawn.');
      setMyInterest(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to withdraw');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssign(contractorId: string) {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/assign/${contractorId}`);
      toast.success('Contractor assigned! They will be notified.');
      const jobData = await loadJob();
      if (jobData) {
        const intRes = await api.get(`/jobs/${id}/interests`).catch(() => ({ data: { data: { interests: [] } } }));
        setInterests(intRes.data.data?.interests || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReassign(action: 'reopen' | 'mark_dead') {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/reassign`, { action });
      toast.success(action === 'reopen' ? 'Referral re-opened!' : 'Referral marked as dead.');
      await loadJob();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateQuote() {
    if (!quoteAmount || !quoteScope || !quoteDate) {
      toast.error('Fill in all quote fields');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/quote`, {
        amount: parseFloat(quoteAmount),
        scope: quoteScope,
        scheduledDate: quoteDate,
      });
      toast.success('Quote sent to client!');
      setShowQuoteForm(false);
      setQuoteAmount(''); setQuoteScope(''); setQuoteDate('');
      const qRes = await api.get(`/jobs/${id}/quotes`);
      setQuotes(qRes.data.data?.quotes || []);
      await loadJob();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create quote');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkComplete() {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/contractor-complete`, { notes: completionNotes || undefined });
      toast.success('Job marked as complete! Waiting for client confirmation.');
      setShowCompleteModal(false);
      await loadJob();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to mark complete');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !job) return;
    setSendingMsg(true);
    try {
      const receiverId = user?.id === job.postedBy.id ? job.claimedBy?.id : job.postedBy.id;
      if (!receiverId) { toast.error('No one to message yet.'); return; }
      await api.post('/messages', { receiverId, jobId: job.id, content: newMessage.trim() });
      setNewMessage('');
      const msgRes = await api.get(`/messages/${id}`);
      const msgData = msgRes.data.data;
      setMessages(Array.isArray(msgData) ? msgData : Array.isArray(msgData?.messages) ? msgData.messages : []);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) return <PageLoader />;
  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ─── Header Card ─── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="amber">{job.tradeType.replace(/([A-Z])/g, ' $1').trim()}</Badge>
              <Badge variant="status" statusClass={getStatusClass(job.status)}>{job.status.replace(/([A-Z])/g, ' $1').trim()}</Badge>
              <Badge variant="status" statusClass={getUrgencyClass(job.urgency)}>{job.urgency}</Badge>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">{job.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-heading font-bold text-emerald-400">~{formatCurrency(displayValue)}</p>
            <p className="text-xs text-surface-muted">Estimated Value</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">{job.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>{job.city}, {job.state}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{formatRelativeTime(job.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <User className="w-4 h-4 text-amber-500" />
            <span>By {job.postedBy.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <Users className="w-4 h-4 text-amber-500" />
            <span>{job._count?.interests ?? 0} interested</span>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          BROWSER VIEW — Express Interest
          ═══════════════════════════════════════════════════════════════════ */}
      {isBrowser && (
        <Card>
          {myInterest ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-lg font-heading font-bold text-white mb-1">Interest Expressed!</h2>
              <p className="text-sm text-surface-muted mb-4">
                The referee will review your profile and notify you if selected.
              </p>
              {myInterest.status === 'pending' && (
                <Button variant="danger" size="sm" onClick={handleWithdrawInterest} loading={actionLoading}>
                  <XCircle className="w-4 h-4" /> Withdraw Interest
                </Button>
              )}
              {myInterest.status === 'selected' && (
                <Badge variant="green" className="text-sm px-4 py-1.5">✅ You&apos;ve been selected!</Badge>
              )}
              {myInterest.status === 'rejected' && (
                <Badge variant="red" className="text-sm px-4 py-1.5">Another contractor was chosen</Badge>
              )}
            </div>
          ) : job.status === 'Open' || job.status === 'InterestClosed' ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-base font-heading font-semibold text-white">Express Interest</h2>
              </div>
              <div className="space-y-3">
                <textarea
                  className="input-field resize-none w-full"
                  rows={3}
                  placeholder="Optional: Tell the referee why you're a great fit for this job..."
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                />
                <Button className="w-full" onClick={handleExpressInterest} loading={actionLoading}>
                  <Send className="w-4 h-4" /> Express Interest
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-surface-muted">This job is no longer accepting new interest.</p>
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          REFEREE VIEW — Interests Tab, Assign, Re-list/Dead
          ═══════════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl">
            {(['details', 'interests', 'quotes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                {tab === 'details' ? 'Details' : tab === 'interests' ? `Interests (${interests.length})` : `Quotes (${quotes.length})`}
              </button>
            ))}
          </div>

          {/* Interests Tab */}
          {activeTab === 'interests' && (
            <div className="space-y-4">
              {interests.length === 0 ? (
                <Card className="text-center py-8">
                  <Users className="w-10 h-10 text-surface-muted mx-auto mb-3" />
                  <p className="text-sm text-surface-muted">No contractors have expressed interest yet.</p>
                </Card>
              ) : (
                interests.map((int) => (
                  <Card key={int.id} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shrink-0">
                      {int.contractor.profile?.photoUrl ? (
                        <img src={resolveUrl(int.contractor.profile.photoUrl) || ''} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white">{int.contractor.name}</h3>
                        {int.contractor.profile?.avgRating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-400">
                            <Star className="w-3 h-3" /> {int.contractor.profile.avgRating.toFixed(1)}
                          </span>
                        )}
                        {int.contractor.profile?.totalJobsCompleted !== undefined && (
                          <span className="text-xs text-surface-muted">{int.contractor.profile.totalJobsCompleted} jobs</span>
                        )}
                      </div>
                      {int.contractor.profile?.tradeTypes && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {int.contractor.profile.tradeTypes.slice(0, 3).map((t) => (
                            <Badge key={t} variant="default" className="text-[10px] py-0">{t.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                          ))}
                        </div>
                      )}
                      {int.message && (
                        <p className="text-xs text-slate-300 italic mb-2">&quot;{int.message}&quot;</p>
                      )}
                      <p className="text-xs text-surface-muted">{formatRelativeTime(int.createdAt)}</p>
                    </div>
                    {int.status === 'pending' && ['Open','InterestClosed'].includes(job.status) && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button size="sm" onClick={() => handleAssign(int.contractor.id)} loading={actionLoading}>
                          Assign
                        </Button>
                        <button
                          onClick={() => window.open(`/contractors/${int.contractor.id}`, '_blank')}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/messages/dm/${int.contractor.id}`)}
                          className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg transition"
                        >
                          Message
                        </button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <Card className="text-center py-8">
                  <FileText className="w-10 h-10 text-surface-muted mx-auto mb-3" />
                  <p className="text-sm text-surface-muted">No quotes have been submitted yet.</p>
                </Card>
              ) : (
                quotes.map((q) => (
                  <Card key={q.id}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={q.status === 'approved' ? 'green' : q.status === 'rejected' ? 'red' : 'amber'}>
                          {q.status}
                        </Badge>
                        <span className="text-xs text-surface-muted">{formatRelativeTime(q.createdAt)}</span>
                      </div>
                      <p className="text-lg font-heading font-bold text-emerald-400">{formatCurrency(q.amount)}</p>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{q.scope}</p>
                    <div className="flex items-center gap-2 text-xs text-surface-muted">
                      <Calendar className="w-3 h-3" /> Scheduled: {formatDate(q.scheduledDate)}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Details Tab — client info visible to referee */}
          {activeTab === 'details' && job.clientLead && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-violet-400" />
                </div>
                <h2 className="text-base font-heading font-semibold text-white">Client Contact Info</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-4 h-4 text-surface-muted" />
                  {job.clientLead.firstName} {job.clientLead.lastName}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-surface-muted" />
                  {job.clientLead.email}
                </div>
                {job.clientLead.phone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-surface-muted" />
                    {job.clientLead.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-surface-muted" />
                  {job.clientLead.streetAddress}, {job.clientLead.city}, {job.clientLead.state}
                </div>
              </div>
              {job.clientLead.notes && (
                <div className="mt-3 p-3 rounded-xl bg-navy-900 border border-surface-border">
                  <p className="text-xs text-surface-muted mb-1">Private Notes</p>
                  <p className="text-sm text-slate-300">{job.clientLead.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Re-list / Mark Dead actions */}
          {activeTab === 'details' && ['Cancelled', 'Assigned'].includes(job.status) && (
            <Card>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleReassign('reopen')} loading={actionLoading}>
                  <RotateCcw className="w-4 h-4" /> Re-list Referral
                </Button>
                <Button variant="danger" onClick={() => handleReassign('mark_dead')} loading={actionLoading}>
                  <Trash2 className="w-4 h-4" /> Mark as Dead
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGNED CONTRACTOR VIEW — Client Details + Quote + Complete
          ═══════════════════════════════════════════════════════════════════ */}
      {isAssigned && (
        <>
          {/* Client Details (revealed) */}
          {job.clientLead && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-semibold text-white">Client Details</h2>
                  <p className="text-xs text-surface-muted">Reach out to coordinate the job</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-900 border border-surface-border">
                  <User className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-surface-muted">Name</p>
                    <p className="text-white font-medium">{job.clientLead.firstName} {job.clientLead.lastName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-900 border border-surface-border">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-surface-muted">Email</p>
                    <a href={`mailto:${job.clientLead.email}`} className="text-amber-400 hover:underline">{job.clientLead.email}</a>
                  </div>
                </div>
                {job.clientLead.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-900 border border-surface-border">
                    <Phone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-surface-muted">Phone</p>
                      <a href={`tel:${job.clientLead.phone}`} className="text-amber-400 hover:underline">{job.clientLead.phone}</a>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-900 border border-surface-border">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-surface-muted">Address</p>
                    <p className="text-white">{job.clientLead.streetAddress}, {job.clientLead.city}, {job.clientLead.state} {job.clientLead.zipCode}</p>
                  </div>
                </div>
              </div>

              {job.clientLead.notes && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xs text-amber-400 font-medium mb-1">Notes from Referee</p>
                  <p className="text-sm text-slate-300">{job.clientLead.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Quote Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-base font-heading font-semibold text-white">Quotes</h2>
              </div>
              {(job.status === 'Assigned' || job.status === 'QuoteSent') && !showQuoteForm && (
                <Button size="sm" onClick={() => setShowQuoteForm(true)}>
                  <DollarSign className="w-4 h-4" /> {quotes.length > 0 ? 'Revise Quote' : 'Create Quote'}
                </Button>
              )}
            </div>

            {/* Existing quotes */}
            {quotes.length > 0 && (
              <div className="space-y-3 mb-4">
                {quotes.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl bg-navy-900 border border-surface-border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={q.status === 'approved' ? 'green' : q.status === 'rejected' ? 'red' : 'amber'}>
                        {q.status}
                      </Badge>
                      <span className="text-lg font-heading font-bold text-emerald-400">{formatCurrency(q.amount)}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{q.scope}</p>
                    <div className="flex items-center gap-4 text-xs text-surface-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(q.scheduledDate)}</span>
                      <span>{formatRelativeTime(q.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quote form */}
            {showQuoteForm && (
              <div className="space-y-4 p-4 rounded-xl bg-surface-elevated border border-surface-border">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quote Amount ($)"
                    type="number"
                    placeholder="5000"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                  />
                  <Input
                    label="Scheduled Date"
                    type="date"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Scope of Work</label>
                  <textarea
                    className="input-field resize-none w-full"
                    rows={4}
                    placeholder="Describe in detail what you will do, materials included, timeline, etc..."
                    value={quoteScope}
                    onChange={(e) => setQuoteScope(e.target.value)}
                  />
                </div>

                {/* Fee preview */}
                {parseFloat(quoteAmount) > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <p className="text-[10px] text-surface-muted">You Get (75%)</p>
                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(parseFloat(quoteAmount) * 0.75)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-navy-900 border border-surface-border">
                      <p className="text-[10px] text-surface-muted">Referral (20%)</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(parseFloat(quoteAmount) * 0.20)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-navy-900 border border-surface-border">
                      <p className="text-[10px] text-surface-muted">Platform (5%)</p>
                      <p className="text-sm font-bold text-surface-muted">{formatCurrency(parseFloat(quoteAmount) * 0.05)}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button className="flex-1" onClick={handleCreateQuote} loading={actionLoading}>
                    <Send className="w-4 h-4" /> Send Quote to Client
                  </Button>
                  <Button variant="outline" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {quotes.length === 0 && !showQuoteForm && (
              <p className="text-sm text-surface-muted text-center py-2">No quotes yet. Create one to send to the client.</p>
            )}
          </Card>

          {/* Mark Complete */}
          {['InProgress', 'EscrowFunded', 'QuoteApproved'].includes(job.status) && (
            <Card>
              {!showCompleteModal ? (
                <Button className="w-full" size="lg" onClick={() => setShowCompleteModal(true)}>
                  <Camera className="w-4 h-4" /> Mark Job as Complete
                </Button>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-base font-heading font-semibold text-white">Mark as Complete</h2>
                  <textarea
                    className="input-field resize-none w-full"
                    rows={3}
                    placeholder="Any completion notes (optional)..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={handleMarkComplete} loading={actionLoading}>
                      <CheckCircle2 className="w-4 h-4" /> Confirm Complete
                    </Button>
                    <Button variant="outline" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Waiting for client */}
          {job.status === 'ContractorDone' && (
            <Card className="border-amber-500/20">
              <div className="text-center py-4">
                <Timer className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h2 className="text-lg font-heading font-bold text-white mb-1">Waiting for Client Confirmation</h2>
                <p className="text-sm text-surface-muted">
                  The client will confirm the job is complete. If no response,
                  {job.autoReleaseAt && (
                    <span className="text-amber-400 font-medium"> funds auto-release on {formatDate(job.autoReleaseAt)}</span>
                  )}
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MESSAGES — Shared between owner and assigned
          ═══════════════════════════════════════════════════════════════════ */}
      {(isOwner || isAssigned) && (
        <Card>
          <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" /> Messages
          </h2>

          <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-sm text-surface-muted text-center py-4">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    msg.senderId === user?.id
                      ? 'bg-amber-500/10 text-slate-200'
                      : 'bg-surface-elevated text-slate-300'
                  }`}>
                    <p className="text-xs font-medium mb-1">{msg.sender.name}</p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} loading={sendingMsg} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
      {/* Rating Modal (5F) */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowRatingModal(false)}>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {isOwner ? `Rate ${job?.claimedBy?.name}` : 'Rate this referral'}
            </h3>
            <p className="text-sm text-surface-muted mb-4">
              {isOwner ? 'How was the contractor\'s work?' : 'How was the quality of this job referral?'}
            </p>

            {/* Stars */}
            <div className="flex gap-1 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRatingValue(star)}
                  className="p-1 transition-transform hover:scale-110">
                  <Star size={32} className={`${
                    star <= (ratingHover || ratingValue)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-600'
                  } transition-colors`} />
                </button>
              ))}
            </div>

            {/* Review text */}
            <textarea
              value={ratingText}
              onChange={e => setRatingText(e.target.value)}
              rows={3}
              placeholder="Share your experience (optional)..."
              className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-surface-muted focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRatingModal(false)}>Cancel</Button>
              <Button className="flex-1" loading={submittingRating} disabled={ratingValue === 0}
                onClick={async () => {
                  setSubmittingRating(true);
                  try {
                    await api.post('/reviews', {
                      jobId: id,
                      revieweeId: isOwner ? job?.claimedBy?.id : job?.postedBy?.id,
                      rating: ratingValue,
                      text: ratingText || undefined,
                      dimension: isOwner ? 'referral_quality' : 'job_quality',
                    });
                    toast.success('Review submitted! Thank you.');
                    setHasRated(true);
                    setShowRatingModal(false);
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Failed to submit review');
                  } finally {
                    setSubmittingRating(false);
                  }
                }}>
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Prompt Banner */}
      {!hasRated && ['Completed', 'ClientConfirmed', 'ContractorDone'].includes(job?.status ?? '') && (isOwner || isAssigned) && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setShowRatingModal(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] px-5 py-3 rounded-2xl shadow-xl shadow-amber-500/25 font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform">
            <Star size={18} className="fill-current" />
            {isOwner ? `Rate ${job?.claimedBy?.name ?? 'contractor'}` : 'Rate this referral'}
          </button>
        </div>
      )}
    </div>
  );
}
