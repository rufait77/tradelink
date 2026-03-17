'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonCard } from '../../../components/ui/skeleton';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';
import { formatRelativeTime } from '../../../lib/utils';
import {
  MessageSquare, Clock, Users, Search, Circle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JobConversation {
  jobId: string;
  jobTitle: string;
  otherUser: { id: string; name: string };
  lastMessage: { content: string; createdAt: string; isRead: boolean };
  unreadCount: number;
}

interface DmConversation {
  partnerId: string;
  partner: {
    id: string; name: string;
    profile?: { photoUrl?: string; tradeTypes?: string[]; city?: string; state?: string };
  };
  lastMessage: {
    id: string; content: string; senderId: string; createdAt: string; isRead: boolean;
  } | null;
  unreadCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';
const ASSETS_BASE = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE.replace(/\/+$/, '');

function resolvePhoto(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${ASSETS_BASE}${url}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'jobs' | 'direct'>('direct');
  const [jobConvos, setJobConvos] = useState<JobConversation[]>([]);
  const [dmConvos, setDmConvos] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [jobRes, dmRes] = await Promise.all([
          api.get('/messages/conversations').catch(() => ({ data: { data: { conversations: [] } } })),
          api.get('/dm/conversations').catch(() => ({ data: { data: { conversations: [] } } })),
        ]);
        setJobConvos(jobRes.data.data?.conversations || []);
        setDmConvos(dmRes.data.data?.conversations || []);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const dmUnread = dmConvos.reduce((sum, c) => sum + c.unreadCount, 0);
  const jobUnread = jobConvos.reduce((sum, c) => sum + c.unreadCount, 0);

  // Filter by search
  const filteredDm = dmConvos.filter(c =>
    !search || c.partner?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredJob = jobConvos.filter(c =>
    !search || c.otherUser?.name?.toLowerCase().includes(search.toLowerCase()) || c.jobTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Messages</h1>
        <p className="text-sm text-surface-muted">Conversations with contractors and job threads</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#0a1628] border border-surface-border rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
          style={{ color: '#e2e8f0' }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border">
        <button
          onClick={() => setTab('direct')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === 'direct'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          Direct Messages
          {dmUnread > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-[#050d1a] rounded-full">{dmUnread}</span>
          )}
        </button>
        <button
          onClick={() => setTab('jobs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === 'jobs'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Job Messages
          {jobUnread > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-[#050d1a] rounded-full">{jobUnread}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : tab === 'direct' ? (
        /* ─── Direct Messages Tab ─── */
        filteredDm.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No direct messages"
            description={search ? 'No conversations match your search.' : 'Start a conversation by visiting a contractor\'s profile and clicking "Message".'}
          />
        ) : (
          <div className="space-y-2">
            {filteredDm.map((conv) => {
              const photo = resolvePhoto(conv.partner?.profile?.photoUrl);
              return (
                <Link key={conv.partnerId} href={`/dashboard/messages/dm/${conv.partnerId}`}>
                  <Card hover className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden">
                        {photo ? (
                          <img src={photo} alt={conv.partner?.name || ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-amber-400">
                              {(conv.partner?.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                          {conv.partner?.name || 'Unknown'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="amber">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      {conv.partner?.profile?.tradeTypes?.[0] && (
                        <p className="text-xs text-amber-500/60 truncate">
                          {conv.partner.profile.tradeTypes[0].replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      )}
                      {conv.lastMessage && (
                        <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                          {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}{conv.lastMessage.content}
                        </p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="text-right shrink-0">
                      {conv.lastMessage && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatRelativeTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        /* ─── Job Messages Tab ─── */
        filteredJob.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No job conversations"
            description={search ? 'No conversations match your search.' : 'Messages will appear here when you communicate about a job.'}
          />
        ) : (
          <div className="space-y-2">
            {filteredJob.map((conv) => (
              <Link key={conv.jobId} href={`/dashboard/jobs/${conv.jobId}`}>
                <Card hover className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{conv.otherUser.name}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="amber">{conv.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-surface-muted truncate">{conv.jobTitle}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessage.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-surface-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
