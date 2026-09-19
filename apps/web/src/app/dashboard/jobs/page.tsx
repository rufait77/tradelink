'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { MapPin, Clock, Search, Briefcase, ChevronLeft, ChevronRight, Users, Timer, Navigation } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { useRouter } from 'next/navigation';
import { useT, useLabels, useFormat, type TranslateFn, type TranslationKey } from '../../../i18n';

const RADIUS_VALUES = ['10', '25', '50', '100'] as const;
const RADIUS_LABEL_KEYS: Record<string, TranslationKey> = {
  '10': 'board.radius10',
  '25': 'board.radius25',
  '50': 'board.radius50',
  '100': 'board.radius100',
};

// Enum values sent to the API — only the displayed label is translated.
const TRADE_VALUES = ['Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','PressureWashing','JunkRemoval','WindowInstallation','Siding','Clearing','GeneralContracting','Welding','Drywall','Barber','Cosmetology','Esthetician','AutoMechanics','Other'];

const URGENCY_VALUES = ['Low', 'Medium', 'High', 'Emergency'] as const;

function getUrgencyClass(u: string) {
  switch (u) {
    case 'Emergency': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'High': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'Medium': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
}

interface Job {
  id: string; title: string; description: string; tradeType: string;
  budgetMin: number; budgetMax: number; city: string; state: string; zipCode: string;
  urgency: string; status: string; createdAt: string;
  estimatedValue?: number | null;
  interestWindowEnd?: string | null;
  _count?: { interests?: number };
  postedBy?: { name: string };
  _distanceMiles?: number | null;
}

const URGENT_WINDOW_HOURS = 4;

function getInterestWindowLabel(t: TranslateFn, end: string | null | undefined): { text: string; urgent: boolean } | null {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return { text: t('board.windowClosed'), urgent: false };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return { text: t('board.windowHours', { hours, minutes }), urgent: hours < URGENT_WINDOW_HOURS };
  return { text: t('board.windowMinutes', { minutes }), urgent: true };
}

function JobBoardContent() {
  const params = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [trade, setTrade] = useState(params.get('trade') || '');
  const [urgency, setUrgency] = useState('');
  const [search, setSearch] = useState('');
  const [nearZip, setNearZip] = useState('');
  const [radius, setRadius] = useState('30');
  const pageSize = 12;
  const isReferrer = useAuthStore((s) => s.user?.role === 'referrer');
  const router = useRouter();
  const t = useT();
  const { tradeLabel, urgencyLabel } = useLabels();
  const { formatRelativeTime } = useFormat();

  const RADIUS_OPTIONS = RADIUS_VALUES.map((value) => ({ label: t(RADIUS_LABEL_KEYS[value]), value }));
  const TRADE_OPTIONS = [
    { label: t('board.allTrades'), value: '' },
    ...TRADE_VALUES.map((value) => ({ label: tradeLabel(value), value })),
  ];
  const URGENCY_OPTIONS = [
    { label: t('board.anyUrgency'), value: '' },
    ...URGENCY_VALUES.map((value) => ({ label: urgencyLabel(value), value })),
  ];

  useEffect(() => {
    async function load() {
      if (isReferrer) { setLoading(false); return; } // board is contractor-only; skip the fetch
      setLoading(true);
      try {
        const q = new URLSearchParams();
        q.set('page', String(page));
        q.set('pageSize', String(pageSize));
        q.set('status', 'Open');
        if (trade) q.set('tradeType', trade);
        if (urgency) q.set('urgency', urgency);
        if (nearZip.length === 5) { q.set('nearZip', nearZip); q.set('radius', radius); }
        const res = await api.get(`/jobs?${q.toString()}`);
        setJobs(res.data.data?.jobs || res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, trade, urgency, nearZip, radius, isReferrer]);

  const totalPages = Math.ceil(total / pageSize);

  const filteredJobs = search
    ? jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.city.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  if (isReferrer) {
    return (
      <EmptyState
        icon={Briefcase}
        title={t('board.referrer.title')}
        description={t('board.referrer.desc')}
        actionLabel={t('board.referrer.action')}
        onAction={() => router.push('/dashboard/post-job')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">{t('board.title')}</h1>
          <p className="text-sm text-surface-muted">{t('board.openCount', { count: total })}</p>
        </div>
        <Link href="/dashboard/post-job">
          <Button size="sm">{t('board.postReferral')}</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('board.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select options={TRADE_OPTIONS} value={trade} onChange={(v) => { setTrade(v); setPage(1); }} placeholder={t('board.allTrades')} />
        <Select options={URGENCY_OPTIONS} value={urgency} onChange={(v) => { setUrgency(v); setPage(1); }} placeholder={t('board.anyUrgency')} />
      </div>

      {/* Geo radius filter */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-surface-muted mb-1 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-400" /> {t('board.nearYou')}
          </label>
          <Input
            placeholder={t('board.zipPlaceholder')}
            value={nearZip}
            onChange={(e) => { setNearZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setPage(1); }}
            maxLength={5}
          />
        </div>
        <Select
          options={RADIUS_OPTIONS}
          value={radius}
          onChange={(v) => { setRadius(v); setPage(1); }}
          placeholder={t('board.radiusPlaceholder')}
        />
        {nearZip.length === 5 && (
          <Button variant="ghost" size="sm" onClick={() => { setNearZip(''); setPage(1); }}>
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Job grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('board.empty.title')} description={t('board.empty.desc')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const interestCount = job._count?.interests ?? 0;
            const windowInfo = getInterestWindowLabel(t, job.interestWindowEnd);
            const displayValue = job.estimatedValue || ((job.budgetMin + job.budgetMax) / 2);

            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card hover className="h-full flex flex-col">
                  {/* Header badges */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="amber">{tradeLabel(job.tradeType)}</Badge>
                    <Badge variant="status" statusClass={getUrgencyClass(job.urgency)}>{urgencyLabel(job.urgency)}</Badge>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{job.title}</h3>
                  <p className="text-xs text-surface-muted line-clamp-2 mb-3 flex-1">{job.description}</p>

                  {/* Location + Value + Distance */}
                  <div className="flex items-center justify-between text-xs text-surface-muted pt-3 border-t border-surface-border/50">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.city}, {job.state}
                      {job._distanceMiles != null && (
                        <span className="text-amber-400 font-medium ml-1">• {t('board.distance', { miles: job._distanceMiles })}</span>
                      )}
                    </span>
                    <span className="font-medium text-emerald-400">
                      ~{formatCurrency(displayValue)}
                    </span>
                  </div>

                  {/* Interest count + window timer */}
                  <div className="flex items-center justify-between text-xs text-surface-muted mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400" />
                      <span className={interestCount > 0 ? 'text-amber-400' : ''}>
                        {t('board.interested', { count: interestCount })}
                      </span>
                    </span>
                    {windowInfo ? (
                      <span className={`flex items-center gap-1 ${windowInfo.urgent ? 'text-red-400' : 'text-sky-400'}`}>
                        <Timer className="w-3 h-3" /> {windowInfo.text}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(job.createdAt)}</span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-surface-muted">{t('board.pageOf', { page, total: totalPages })}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function JobBoardPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{Array.from({length:6}).map((_,i) => <SkeletonCard key={i}/>)}</div>}>
      <JobBoardContent />
    </Suspense>
  );
}
