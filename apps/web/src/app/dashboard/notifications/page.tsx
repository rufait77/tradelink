'use client';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { SkeletonCard } from '../../../components/ui/skeleton';
import api from '../../../lib/api';
import { formatRelativeTime } from '../../../lib/utils';
import { Bell, CheckCheck, Briefcase, DollarSign, Star, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Notification {
  id: string; type: string; title: string;
  message: string; link?: string; isRead: boolean; createdAt: string;
}

const ICON_MAP: Record<string, typeof Bell> = {
  job_claimed: Briefcase, job_started: Briefcase, job_completed: Briefcase,
  commission_paid: DollarSign, payout_failed: AlertCircle,
  review_received: Star, message_received: MessageSquare,
  subscription_renewed: DollarSign, subscription_expiring: AlertCircle,
  subscription_cancelled: AlertCircle, announcement: Bell,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    try {
      const res = await api.get('/notifications?pageSize=50');
      setNotifications(res.data.data.items || res.data.data || []);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      toast.success('All marked as read');
      await load();
    } catch { toast.error('Failed'); }
    finally { setMarkingAll(false); }
  }

  async function markOne(id: string) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Notifications</h1>
          <p className="text-sm text-surface-muted">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} loading={markingAll}>
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type] || Bell;
            const Wrapper = n.link ? Link : 'div';
            const wrapperProps = n.link ? { href: n.link } : {};

            return (
              <Wrapper key={n.id} {...(wrapperProps as any)}>
                <Card
                  hover={!!n.link}
                  className={`flex items-start gap-4 cursor-pointer ${!n.isRead ? 'border-l-2 border-l-amber-500' : ''}`}
                  onClick={() => { if (!n.isRead) markOne(n.id); }}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    !n.isRead ? 'bg-amber-500/10' : 'bg-surface-elevated'
                  }`}>
                    <Icon className={`w-4 h-4 ${!n.isRead ? 'text-amber-500' : 'text-surface-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                    <p className="text-xs text-surface-muted mt-0.5">{n.message}</p>
                    <p className="text-xs text-surface-muted mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />}
                </Card>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
