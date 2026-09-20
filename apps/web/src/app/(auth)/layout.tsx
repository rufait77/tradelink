'use client';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { usePlatformSettings } from '../../lib/useSettings';
import { useT } from '../../i18n';
import { LanguageSwitcher } from '../../components/layout/language-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { commissionPct, signupFee } = usePlatformSettings();
  const t = useT();
  return (
    <div className="min-h-screen bg-navy-950 flex relative">
      {/* Language switcher — fixed to the top right across every auth screen */}
      <div className="absolute top-4 right-4 z-30">
        <LanguageSwitcher />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-amber-500/5 blur-[100px]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 mb-16 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Zap className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-xl font-heading font-bold text-white">Tradelink</span>
          </Link>

          <h2 className="text-3xl font-heading font-bold text-white leading-tight mb-4">
            {t('authLayout.titleLead')}{' '}
            <span className="gradient-text">{t('authLayout.titleAccent')}</span>
          </h2>
          <p className="text-surface-muted text-lg leading-relaxed">
            {t('authLayout.subtitle', { pct: commissionPct })}
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6">
          {[
            { value: `${commissionPct}%`, label: t('authLayout.stat.commission') },
            { value: `$${signupFee}`, label: t('authLayout.stat.signupFee') },
            { value: '10+', label: t('authLayout.stat.tradeTypes') },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-heading font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-surface-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-navy-950" />
            </div>
            <span className="text-lg font-heading font-bold text-white">Tradelink</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
