'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import {
  LayoutDashboard, Users, Briefcase, Settings, BarChart3,
  FileText, DollarSign, LogOut, Bell, Shield, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../lib/api';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/users', icon: Users, label: 'Users' },
  { href: '/dashboard/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/dashboard/commissions', icon: DollarSign, label: 'Commissions' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  { href: '/dashboard/audit-log', icon: FileText, label: 'Audit Log' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  // Fetch developer_mode status on mount and poll every 30s
  useEffect(() => {
    if (!token) return;
    const fetchDevMode = () => {
      api.get('/admin/settings').then((r) => {
        setDevMode(r.data.data.settings?.developer_mode === 'true');
      }).catch(() => {});
    };
    fetchDevMode();
    const interval = setInterval(fetchDevMode, 30_000);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#050d1a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a1628] border-r border-slate-800 flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Tradelink</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} size={18} />
                {item.label}
                {active && <ChevronRight className="ml-auto w-3.5 h-3.5 text-amber-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Admin info + logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={14} className="text-[#050d1a]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{admin?.name ?? 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Developer Mode Banner */}
        {devMode && (
          <div className="sticky top-0 z-20 bg-amber-500 text-[#050d1a] px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-lg">
            <AlertTriangle size={16} />
            Developer Mode ON — All payments are bypassed
            <AlertTriangle size={16} />
          </div>
        )}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

