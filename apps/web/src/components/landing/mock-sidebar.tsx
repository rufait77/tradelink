'use client';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Briefcase, Send, ClipboardList, FolderOpen,
  DollarSign, MessageSquare, Bell, Zap,
} from 'lucide-react';
import type { MockRole } from './mock-data';
import { useT, type TranslationKey } from '../../i18n';

const BRAND = 'Tradelink';

type NavItem = { key: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; contractorOnly?: boolean; dot?: boolean; badge?: number };

// Mirrors the real sidebar, so it reuses the same labels.
const NAV: NavItem[] = [
  { key: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { key: 'jobs', labelKey: 'sidebar.jobBoard', icon: Briefcase, contractorOnly: true },
  { key: 'post', labelKey: 'sidebar.postReferral', icon: Send, dot: true },
  { key: 'referrals', labelKey: 'sidebar.myReferrals', icon: ClipboardList },
  { key: 'my-jobs', labelKey: 'sidebar.myJobs', icon: FolderOpen, contractorOnly: true },
  { key: 'earnings', labelKey: 'sidebar.earnings', icon: DollarSign },
  { key: 'messages', labelKey: 'sidebar.messages', icon: MessageSquare, badge: 2 },
  { key: 'notifications', labelKey: 'sidebar.notifications', icon: Bell },
];

interface MockSidebarProps {
  role: MockRole;
  name: string;
  email: string;
}

export function MockSidebar({ role, name, email }: MockSidebarProps) {
  const t = useT();
  const items = NAV.filter((item) => !(role === 'referrer' && item.contractorOnly));

  return (
    <aside className="hidden md:flex w-52 shrink-0 flex-col bg-navy-900 border-r border-surface-border/50">
      <div className="px-4 py-4 border-b border-surface-border/30 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-navy-950" />
        </div>
        <span className="text-base font-heading font-bold text-white">{BRAND}</span>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = i === 0;
          return (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium',
                active ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400'
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-amber-500')} />
              {t(item.labelKey)}
              {item.dot &&<span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-amber" />}
              {item.badge && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-navy-950 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-surface-border/30">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
            <span className="text-sm font-bold text-amber-400">{name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-200 truncate">{name}</p>
            <p className="text-[11px] text-surface-muted truncate">{email}</p>
          </div>
        </div>
        <span className="mt-2 ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-elevated text-slate-300 border border-surface-border">
          {role === 'referrer' ? t('role.referrer') : t('role.contractor')}
        </span>
      </div>
    </aside>
  );
}
