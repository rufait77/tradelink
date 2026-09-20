'use client';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { usePlatformSettings } from '../../lib/useSettings';
import { useT } from '../../i18n';

const FOOTER_GROUPS = [
  {
    titleKey: 'footer.group.product',
    links: [
      { href: '/how-it-works', labelKey: 'footer.link.howItWorks' },
      { href: '/pricing', labelKey: 'footer.link.pricing' },
      { href: '/signup', labelKey: 'footer.link.getStarted' },
    ],
  },
  {
    titleKey: 'footer.group.company',
    links: [
      { href: '/contact', labelKey: 'footer.link.contact' },
      { href: '/terms', labelKey: 'footer.link.terms' },
      { href: '/privacy', labelKey: 'footer.link.privacy' },
    ],
  },
  {
    titleKey: 'footer.group.trades',
    links: [
      { href: '/dashboard/jobs?trade=Landscaping', labelKey: 'trade.Landscaping' },
      { href: '/dashboard/jobs?trade=Roofing', labelKey: 'trade.Roofing' },
      { href: '/dashboard/jobs?trade=HVAC', labelKey: 'trade.HVAC' },
      { href: '/dashboard/jobs?trade=Plumbing', labelKey: 'trade.Plumbing' },
      { href: '/dashboard/jobs?trade=Electrical', labelKey: 'trade.Electrical' },
      { href: '/dashboard/jobs?trade=PressureWashing', labelKey: 'trade.PressureWashing' },
      { href: '/dashboard/jobs?trade=Barber', labelKey: 'trade.Barber' },
      { href: '/dashboard/jobs?trade=Cosmetology', labelKey: 'trade.Cosmetology' },
      { href: '/dashboard/jobs?trade=Esthetician', labelKey: 'trade.Esthetician' },
    ],
  },
] as const;

export function Footer() {
  const { commissionPct } = usePlatformSettings();
  const t = useT();
  return (
    <footer className="border-t border-surface-border/30 bg-navy-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-navy-950" />
              </div>
              <span className="text-lg font-heading font-bold text-white">Tradelink</span>
            </Link>
            <p className="text-sm text-surface-muted leading-relaxed">
              {t('footer.tagline', { pct: commissionPct })}
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h4 className="text-sm font-semibold text-slate-200 mb-4">{t(group.titleKey)}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-surface-muted hover:text-amber-400 transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-surface-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-muted">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs text-surface-muted">
            {t('footer.builtBy')}{' '}
            <a href="https://rufaitlabs.cloud" className="text-amber-500 hover:text-amber-400 transition-colors">
              RufaitLabs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
