'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';

interface DashboardTopbarProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function DashboardTopbar({ onMenuToggle, menuOpen }: DashboardTopbarProps) {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.data.count || 0);
      } catch {
        // silent
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-navy-900/80 backdrop-blur-xl border-b border-surface-border/30 flex items-center justify-between px-4 lg:px-8">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-surface-elevated"
        onClick={onMenuToggle}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Greeting */}
      <div className="hidden lg:block">
        <p className="text-sm text-surface-muted">
          Welcome back, <span className="text-slate-200 font-medium">{user?.name}</span>
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Link
          href="/dashboard/notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-elevated transition"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500 text-navy-950 text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-elevated transition"
        >
          {user?.profile?.photoUrl ? (
            <img
              src={user.profile.photoUrl}
              alt={user.name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-400">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
