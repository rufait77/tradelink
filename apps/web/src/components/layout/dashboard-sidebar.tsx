'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import {
  LayoutDashboard, Briefcase, Send, ClipboardList, FolderOpen,
  DollarSign, MessageSquare, Bell, User, Settings, CreditCard,
  Zap, LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: 'Job Board', icon: Briefcase },
  { href: '/dashboard/post-job', label: 'Post a Referral', icon: Send },
  { href: '/dashboard/my-referrals', label: 'My Referrals', icon: ClipboardList },
  { href: '/dashboard/my-jobs', label: 'My Jobs', icon: FolderOpen },
  { href: '/dashboard/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-navy-900 border-r border-surface-border/50 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border/30">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="w-5 h-5 text-navy-950" />
          </div>
          <span className="text-lg font-heading font-bold text-white">Tradelink</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
              )}
            >
              <Icon className={cn('w-[18px] h-[18px]', active ? 'text-amber-500' : '')} />
              {item.label}
              {item.label === 'Post a Referral' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-amber" />
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-surface-border/30">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px]', active ? 'text-amber-500' : '')} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-surface-border/30">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
            <span className="text-sm font-bold text-amber-400">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-surface-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
