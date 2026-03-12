'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { PageLoader } from '../../../../components/ui/spinner';
import { useAuthStore } from '../../../../store/auth.store';
import api from '../../../../lib/api';
import { formatCurrency, formatDate, getStatusClass, getUrgencyClass } from '../../../../lib/utils';
import { toast } from 'sonner';
import {
  MapPin, Clock, DollarSign, User, ArrowLeft,
  Send, CheckCircle2, Play, MessageSquare,
} from 'lucide-react';

interface JobDetail {
  id: string; title: string; description: string; tradeType: string;
  budgetMin: number; budgetMax: number; streetAddress: string; city: string;
  state: string; zipCode: string; urgency: string; status: string;
  clientName?: string; clientNote?: string; expiresAt: string; createdAt: string;
  postedBy: { id: string; name: string; profile?: { photoUrl?: string; avgRating?: number } };
  claimedBy?: { id: string; name: string };
}

interface Message {
  id: string; senderId: string; content: string; createdAt: string;
  sender: { name: string };
}

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/jobs/${id}`);
        setJob(res.data.data);
        // Load messages
        const msgRes = await api.get(`/messages/${id}`).catch(() => ({ data: { data: [] } }));
        setMessages(msgRes.data.data || []);
      } catch {
        toast.error('Job not found');
        router.push('/dashboard/jobs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleClaim() {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/claim`);
      toast.success('Job claimed! You can now start working.');
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to claim job');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart() {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/start`);
      toast.success('Job marked as In Progress!');
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start job');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/complete`);
      toast.success('Job completed! Commission will be processed.');
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to complete job');
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
      setMessages(msgRes.data.data || []);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!job) return null;

  const isOwner = user?.id === job.postedBy.id;
  const isClaimer = user?.id === job.claimedBy?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Main info */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="amber">{job.tradeType}</Badge>
              <Badge variant="status" statusClass={getStatusClass(job.status)}>{job.status}</Badge>
              <Badge variant="status" statusClass={getUrgencyClass(job.urgency)}>{job.urgency}</Badge>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">{job.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-heading font-bold text-emerald-400">
              {formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}
            </p>
            <p className="text-xs text-surface-muted">Budget Range</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">{job.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>{job.city}, {job.state} {job.zipCode}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Posted {formatDate(job.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <User className="w-4 h-4 text-amber-500" />
            <span>By {job.postedBy.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-muted">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>Expires {formatDate(job.expiresAt)}</span>
          </div>
        </div>

        {job.clientName && (
          <div className="mt-4 p-4 bg-navy-900 rounded-xl">
            <p className="text-xs text-surface-muted mb-1">Client Info</p>
            <p className="text-sm text-slate-200 font-medium">{job.clientName}</p>
            {job.clientNote && <p className="text-xs text-surface-muted mt-1">{job.clientNote}</p>}
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <Card>
        <div className="flex flex-wrap gap-3">
          {job.status === 'Open' && !isOwner && (
            <Button onClick={handleClaim} loading={actionLoading}>
              <CheckCircle2 className="w-4 h-4" /> Claim This Job
            </Button>
          )}
          {job.status === 'Claimed' && isClaimer && (
            <Button onClick={handleStart} loading={actionLoading}>
              <Play className="w-4 h-4" /> Start Job
            </Button>
          )}
          {job.status === 'InProgress' && isClaimer && (
            <Button onClick={handleComplete} loading={actionLoading}>
              <CheckCircle2 className="w-4 h-4" /> Mark Complete
            </Button>
          )}
          {isOwner && job.status === 'Open' && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/post-job?edit=${job.id}`)}>
              Edit Job
            </Button>
          )}
        </div>
      </Card>

      {/* Messages */}
      {(isOwner || isClaimer) && (
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
    </div>
  );
}
