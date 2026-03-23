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
import { formatCurrency, formatRelativeTime } from '../../../lib/utils';
import { MapPin, Clock, Search, Briefcase, ChevronLeft, ChevronRight, Users, Timer, Navigation } from 'lucide-react';

const RADIUS_OPTIONS = [
  { label: 'Within 10 mi', value: '10' },
  { label: 'Within 25 mi', value: '25' },
  { label: 'Within 50 mi', value: '50' },
  { label: 'Within 100 mi', value: '100' },
];

const TRADE_OPTIONS = [
  { label: 'All Trades', value: '' },
  ...['Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','PressureWashing','JunkRemoval','WindowInstallation','Siding','Clearing','GeneralContracting','Welding','Drywall','Barber','Cosmetology','Esthetician','Other']
    .map((t) => ({ label: t.replace(/([A-Z])/g, ' $1').trim(), value: t })),
];

const URGENCY_OPTIONS = [
  { label: 'Any Urgency', value: '' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Emergency', value: 'Emergency' },
];

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

function getInterestWindowLabel(end: string | null | undefined): { text: string; urgent: boolean } | null {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return { text: 'Window closed', urgent: false };
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs > 0) return { text: `${hrs}h ${mins}m left`, urgent: hrs < 4 };
  return { text: `${mins}m left`, urgent: true };
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

  useEffect(() => {
    async function load() {
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
  }, [page, trade, urgency, nearZip, radius]);

  const totalPages = Math.ceil(total / pageSize);

  const filteredJobs = search
    ? jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.city.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Job Board</h1>
          <p className="text-sm text-surface-muted">{total} open referrals available</p>
        </div>
        <Link href="/dashboard/post-job">
          <Button size="sm">Post a Referral</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by title or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select options={TRADE_OPTIONS} value={trade} onChange={(v) => { setTrade(v); setPage(1); }} placeholder="All Trades" />
        <Select options={URGENCY_OPTIONS} value={urgency} onChange={(v) => { setUrgency(v); setPage(1); }} placeholder="Any Urgency" />
      </div>

      {/* Geo radius filter */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-surface-muted mb-1 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-400" /> Find jobs near you
          </label>
          <Input
            placeholder="Enter your ZIP code"
            value={nearZip}
            onChange={(e) => { setNearZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setPage(1); }}
            maxLength={5}
          />
        </div>
        <Select
          options={RADIUS_OPTIONS}
          value={radius}
          onChange={(v) => { setRadius(v); setPage(1); }}
          placeholder="Radius"
        />
        {nearZip.length === 5 && (
          <Button variant="ghost" size="sm" onClick={() => { setNearZip(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Job grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs found" description="Try adjusting your filters or check back later." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const interestCount = job._count?.interests ?? 0;
            const windowInfo = getInterestWindowLabel(job.interestWindowEnd);
            const displayValue = job.estimatedValue || ((job.budgetMin + job.budgetMax) / 2);

            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card hover className="h-full flex flex-col">
                  {/* Header badges */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="amber">{job.tradeType.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                    <Badge variant="status" statusClass={getUrgencyClass(job.urgency)}>{job.urgency}</Badge>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{job.title}</h3>
                  <p className="text-xs text-surface-muted line-clamp-2 mb-3 flex-1">{job.description}</p>

                  {/* Location + Value + Distance */}
                  <div className="flex items-center justify-between text-xs text-surface-muted pt-3 border-t border-surface-border/50">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.city}, {job.state}
                      {job._distanceMiles != null && (
                        <span className="text-amber-400 font-medium ml-1">• {job._distanceMiles} mi</span>
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
                        {interestCount} interested
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
          <span className="text-sm text-surface-muted">Page {page} of {totalPages}</span>
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
