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
import { MessageSquare, Clock } from 'lucide-react';

interface Conversation {
  jobId: string;
  jobTitle: string;
  otherUser: { id: string; name: string };
  lastMessage: { content: string; createdAt: string; isRead: boolean };
  unreadCount: number;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/messages/conversations');
        setConversations(res.data.data?.conversations || []);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Messages</h1>
        <p className="text-sm text-surface-muted">Your conversations about jobs</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations"
          description="Messages will appear here when you communicate about a job."
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.jobId} href={`/dashboard/jobs/${conv.jobId}`}>
              <Card hover className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-400">
                    {conv.otherUser.name.charAt(0).toUpperCase()}
                  </span>
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
      )}
    </div>
  );
}
