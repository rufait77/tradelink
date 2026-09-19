'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, HardHat, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { MockDashboard } from '../../components/landing/mock-dashboard';
import type { MockRole } from '../../components/landing/mock-data';

// ─── Display strings ──────────────────────────────────────────────────────────
const DEMO_STRINGS = {
  back: 'Back to home',
  title: 'Interactive demo',
  subtitle: 'Sample data only — nothing here is saved.',
  toggle: { contractor: 'Contractor', referrer: 'Referrer' },
  cta: 'Create your account',
  roleTablistLabel: 'Dashboard role',
} as const;

const ROLE_OPTIONS: { role: MockRole; label: string; icon: typeof HardHat }[] = [
  { role: 'contractor', label: DEMO_STRINGS.toggle.contractor, icon: HardHat },
  { role: 'referrer', label: DEMO_STRINGS.toggle.referrer, icon: UserRound },
];

export default function DemoPage() {
  const [role, setRole] = useState<MockRole>('contractor');

  return (
    <main className="min-h-screen bg-navy-950 px-4 py-6 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-surface-muted hover:text-slate-200 transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" /> {DEMO_STRINGS.back}
            </Link>
            <h1 className="text-2xl font-heading font-bold text-white">{DEMO_STRINGS.title}</h1>
            <p className="text-sm text-surface-muted">{DEMO_STRINGS.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <div role="tablist" aria-label={DEMO_STRINGS.roleTablistLabel} className="inline-flex p-1 rounded-2xl bg-navy-900 border border-surface-border/60">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = role === opt.role;
                return (
                  <button
                    key={opt.role}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRole(opt.role)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all',
                      active
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    <Icon className="w-4 h-4" /> {opt.label}
                  </button>
                );
              })}
            </div>
            <Link href={`/signup?role=${role}`}>
              <Button size="sm">
                {DEMO_STRINGS.cta} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        <MockDashboard role={role} className="min-h-[70vh]" />
      </div>
    </main>
  );
}
