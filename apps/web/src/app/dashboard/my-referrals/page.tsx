'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatCurrency, formatRelativeTime, getStatusClass } from '../../../lib/utils';
import { Send, MapPin, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface Job {
  id: string; title: string; tradeType: string; budgetMin: number; budgetMax: number;
  city: string; state: string; status: string; urgency: string; createdAt: string;
  claimedBy?: { name: string };
}

export default function MyReferralsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/jobs/my-referrals?page=${page}&pageSize=10`);
        setJobs(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      } catch { setJobs([]); }
      finally { setLoading(false); }
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">My Referrals</h1>
          <p className="text-sm text-surface-muted">Jobs you&apos;ve posted as referrals ({total} total)</p>
        </div>
        <Link href="/dashboard/post-job">
          <Button size="sm"><Plus className="w-4 h-4" /> Post Referral</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No referrals yet"
          description="Post your first referral to start earning commissions."
          actionLabel="Post a Referral"
          onAction={() => window.location.href = '/dashboard/post-job'}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
              <Card hover className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="amber">{job.tradeType}</Badge>
                    <Badge variant="status" statusClass={getStatusClass(job.status)}>{job.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-surface-muted">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.city}, {job.state}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(job.createdAt)}</span>
                    {job.claimedBy && <span>Claimed by {job.claimedBy.name}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-400">{formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-surface-muted">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}
