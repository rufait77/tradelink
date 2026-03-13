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
import { FolderOpen, MapPin, Clock, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Job {
  id: string; title: string; tradeType: string; budgetMin: number; budgetMax: number;
  city: string; state: string; status: string; createdAt: string;
  postedBy: { name: string };
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/jobs/my-claimed?pageSize=50');
      setJobs(res.data.data.items || []);
    } catch { setJobs([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(id: string, action: 'start' | 'complete') {
    setActionLoading(id);
    try {
      await api.post(`/jobs/${id}/${action}`);
      toast.success(action === 'start' ? 'Job started!' : 'Job completed!');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">My Jobs</h1>
        <p className="text-sm text-surface-muted">Jobs you&apos;ve claimed from other contractors</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No claimed jobs"
          description="Browse the job board and claim jobs that match your skills."
          actionLabel="Browse Job Board"
          onAction={() => window.location.href = '/dashboard/jobs'}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="flex items-center justify-between gap-4">
              <Link href={`/dashboard/jobs/${job.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="amber">{job.tradeType}</Badge>
                  <Badge variant="status" statusClass={getStatusClass(job.status)}>{job.status}</Badge>
                </div>
                <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-muted">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.city}, {job.state}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(job.createdAt)}</span>
                  <span>Referred by {job.postedBy.name}</span>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-semibold text-emerald-400 mr-2">{formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}</p>
                {job.status === 'Assigned' && (
                  <Button size="sm" loading={actionLoading === job.id} onClick={() => handleAction(job.id, 'start')}>
                    <Play className="w-3 h-3" /> Start
                  </Button>
                )}
                {job.status === 'InProgress' && (
                  <Button size="sm" loading={actionLoading === job.id} onClick={() => handleAction(job.id, 'complete')}>
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
