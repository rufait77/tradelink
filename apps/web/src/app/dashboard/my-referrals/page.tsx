'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { usePlatformSettings } from '../../../lib/useSettings';
import {
  Send, MapPin, Clock, ChevronLeft, ChevronRight, Plus,
  Users, DollarSign, User, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useT, useLabels, useFormat, type TranslateFn, type TranslationKey } from '../../../i18n';
import { en } from '../../../i18n/en';

function getStatusClass(s: string) {
  if (['Completed', 'ClientConfirmed'].includes(s)) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (['InProgress', 'EscrowFunded', 'ContractorDone'].includes(s)) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (['Cancelled', 'Expired', 'Disputed'].includes(s)) return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
}

// Referral-specific lifecycle wording; falls back to the raw status value.
function getStatusLabel(t: TranslateFn, s: string): string {
  const key = `referralStatus.${s}`;
  return key in en ? t(key as TranslationKey) : s;
}

interface Job {
  id: string; title: string; tradeType: string; budgetMin: number; budgetMax: number;
  city: string; state: string; status: string; urgency: string; createdAt: string;
  estimatedValue?: number | null;
  interestWindowEnd?: string | null;
  claimedBy?: { id: string; name: string; profile?: { photoUrl?: string; avgRating?: number } } | null;
  _count?: { interests?: number };
  escrow?: { status: string; totalAmount: number } | null;
}

export default function MyReferralsPage() {
  const router = useRouter();
  const { commissionPct } = usePlatformSettings();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const t = useT();
  const { tradeLabel, escrowStatusLabel } = useLabels();
  const { formatRelativeTime } = useFormat();
  const FILTER_LABELS = {
    all: t('myReferrals.filter.all'),
    active: t('myReferrals.filter.active'),
    completed: t('myReferrals.filter.completed'),
  } as const;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/jobs/my-referrals?page=${page}&pageSize=10`);
        const allJobs = res.data.data?.jobs || res.data.data?.items || [];
        setJobs(allJobs);
        setTotal(res.data.data?.total || allJobs.length);
      } catch { setJobs([]); }
      finally { setLoading(false); }
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / 10);

  const filteredJobs = useMemo(() => {
    if (filter === 'active') return jobs.filter((j) => !['Completed', 'Cancelled', 'Expired'].includes(j.status));
    if (filter === 'completed') return jobs.filter((j) => ['Completed', 'ClientConfirmed'].includes(j.status));
    return jobs;
  }, [jobs, filter]);

  // Stats
  const activeCount = jobs.filter((j) => !['Completed', 'Cancelled', 'Expired'].includes(j.status)).length;
  const completedCount = jobs.filter((j) => ['Completed', 'ClientConfirmed'].includes(j.status)).length;
  const totalEarnings = jobs
    .filter((j) => ['Completed', 'ClientConfirmed'].includes(j.status))
    .reduce((sum, j) => sum + ((j.estimatedValue || ((j.budgetMin + j.budgetMax) / 2)) * (commissionPct / 100)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">{t('myReferrals.title')}</h1>
          <p className="text-sm text-surface-muted">{t('myReferrals.subtitle')}</p>
        </div>
        <Link href="/dashboard/post-job">
          <Button size="sm"><Plus className="w-4 h-4" /> {t('myReferrals.postReferral')}</Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-3">
          <p className="text-2xl font-heading font-bold text-amber-400">{activeCount}</p>
          <p className="text-xs text-surface-muted">{t('myReferrals.stat.active')}</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-heading font-bold text-emerald-400">{completedCount}</p>
          <p className="text-xs text-surface-muted">{t('myReferrals.stat.completed')}</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-heading font-bold text-white">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs text-surface-muted">{t('myReferrals.stat.estCommission')}</p>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-surface-muted hover:text-white'
            }`}
          >
            {FILTER_LABELS[f]} ({f === 'all' ? jobs.length : f === 'active' ? activeCount : completedCount})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={Send}
          title={t('myReferrals.empty.title')}
          description={t('myReferrals.empty.desc')}
          actionLabel={t('myReferrals.empty.action')}
          onAction={() => router.push('/dashboard/post-job')}
        />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const interestCount = job._count?.interests ?? 0;
            const displayValue = job.estimatedValue || ((job.budgetMin + job.budgetMax) / 2);
            const commission = displayValue * (commissionPct / 100);

            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card hover className="mb-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status + Trade */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="amber">{tradeLabel(job.tradeType)}</Badge>
                        <Badge variant="status" statusClass={getStatusClass(job.status)}>
                          {getStatusLabel(t, job.status)}
                        </Badge>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold text-white mb-2">{job.title}</p>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 flex-wrap text-xs text-surface-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.city}, {job.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatRelativeTime(job.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span className={interestCount > 0 ? 'text-amber-400' : ''}>{t('myReferrals.interested', { count: interestCount })}</span>
                        </span>
                        {job.claimedBy && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <User className="w-3 h-3" /> {job.claimedBy.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side — value + commission */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">~{formatCurrency(displayValue)}</p>
                      <p className="text-xs text-emerald-400">+{formatCurrency(commission)} {t('myReferrals.commissionSuffix')}</p>
                      {job.escrow && (
                        <Badge variant={job.escrow.status === 'funded' ? 'green' : 'amber'} className="mt-1 text-[10px]">
                          {t('myReferrals.escrowPrefix')} {escrowStatusLabel(job.escrow.status)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-surface-muted">{t('myReferrals.pageOf', { page, total: totalPages })}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}
