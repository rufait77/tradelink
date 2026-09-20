'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, HardHat, UserRound } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { usePlatformSettings } from '../../lib/useSettings';
import { MockDashboard } from './mock-dashboard';
import type { MockRole } from './mock-data';
import { useT, type TranslationKey } from '../../i18n';

const ROLE_OPTIONS: { role: MockRole; labelKey: TranslationKey; icon: typeof HardHat }[] = [
  { role: 'contractor', labelKey: 'mockSection.toggle.contractor', icon: HardHat },
  { role: 'referrer', labelKey: 'mockSection.toggle.referrer', icon: UserRound },
];

export function MockDashboardSection() {
  const [role, setRole] = useState<MockRole>('contractor');
  const { commissionPct, referrerCommissionPct, referrerSignupFee } = usePlatformSettings();
  const t = useT();

  const caption = role === 'contractor'
    ? t('mockSection.caption.contractor', { pct: commissionPct })
    : t('mockSection.caption.referrer', { pct: referrerCommissionPct, fee: referrerSignupFee });

  return (
    <section className="section bg-navy-900/50 relative overflow-hidden" aria-labelledby="mock-dashboard-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <div className="container-wide">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-3">{t('mockSection.eyebrow')}</p>
          <h2 id="mock-dashboard-heading" className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            {t('mockSection.title')}
          </h2>
          <p className="text-surface-muted max-w-2xl mx-auto">{t('mockSection.subtitle')}</p>
        </motion.div>

        {/* Role toggle */}
        <div className="flex justify-center mb-6">
          <div role="tablist" aria-label={t('mockSection.roleTablistLabel')} className="inline-flex p-1 rounded-2xl bg-navy-950 border border-surface-border/60">
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
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    active
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 shadow-glow-amber'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  <Icon className="w-4 h-4" /> {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Framed dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative"
        >
          <div className="absolute -inset-6 rounded-[2rem] bg-amber-500/5 blur-3xl pointer-events-none" />
          <div className="relative rounded-[1.25rem] p-1.5 bg-gradient-to-br from-amber-500/30 via-surface-border/40 to-transparent">
            <div className="rounded-2xl bg-navy-950 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 h-9 bg-navy-900 border-b border-surface-border/40">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-navy-950 border border-surface-border/40 text-[10px] text-surface-muted flex items-center px-2 truncate">
                  {t('mockSection.browserUrl')}
                </span>
              </div>
              <MockDashboard role={role} className="rounded-none border-0 shadow-none" />
            </div>
          </div>
        </motion.div>

        {/* Caption + CTAs */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <p className="text-sm text-surface-muted max-w-2xl mx-auto mb-6 leading-relaxed">{caption}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup?role=contractor">
              <Button size="md">
                {t('mockSection.ctaContractor')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/signup?role=referrer">
              <Button variant="outline" size="md">
                {t('mockSection.ctaReferrer')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo" className="text-sm text-amber-400 hover:text-amber-300 transition-colors sm:ml-2">
              {t('mockSection.fullDemo')}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
