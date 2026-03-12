import Link from 'next/link';
import { Zap } from 'lucide-react';

const FOOTER_LINKS = {
  Product: [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/signup', label: 'Get Started' },
  ],
  Company: [
    { href: '/contact', label: 'Contact' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
  Trades: [
    { href: '/dashboard/jobs?trade=Landscaping', label: 'Landscaping' },
    { href: '/dashboard/jobs?trade=Roofing', label: 'Roofing' },
    { href: '/dashboard/jobs?trade=HVAC', label: 'HVAC' },
    { href: '/dashboard/jobs?trade=Plumbing', label: 'Plumbing' },
    { href: '/dashboard/jobs?trade=Electrical', label: 'Electrical' },
  ],
};

export function Footer() {
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
              The contractor referral platform that pays. Earn 20% commission on every completed job you refer.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-slate-200 mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-surface-muted hover:text-amber-400 transition-colors"
                    >
                      {link.label}
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
            © {new Date().getFullYear()} Tradelink. All rights reserved.
          </p>
          <p className="text-xs text-surface-muted">
            Built by{' '}
            <a href="https://rufaitlabs.cloud" className="text-amber-500 hover:text-amber-400 transition-colors">
              RufaitLabs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
