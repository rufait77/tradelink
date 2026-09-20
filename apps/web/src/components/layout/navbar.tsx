'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/button';
import { Zap, Menu, X } from 'lucide-react';
import { useT } from '../../i18n';
import { LanguageSwitcher } from './language-switcher';

const NAV_LINKS = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/how-it-works', labelKey: 'nav.howItWorks' },
  { href: '/pricing', labelKey: 'nav.pricing' },
  { href: '/contact', labelKey: 'nav.contact' },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();
  const t = useT();

  return (
    <nav className="fixed top-0 inset-x-0 z-40 glass border-b border-surface-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Zap className="w-4.5 h-4.5 text-navy-950" />
            </div>
            <span className="text-lg font-heading font-bold text-white">Tradelink</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-surface-elevated/50 transition-all"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">{t('nav.dashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">{t('nav.login')}</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">{t('nav.getStarted')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile switcher + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher compact />
            <button
              aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="p-2 rounded-lg text-slate-300 hover:bg-surface-elevated"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-surface-border/30 animate-slide-up">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-surface-elevated/50 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <div className="pt-3 border-t border-surface-border/30 flex flex-col gap-2">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full" size="sm">{t('nav.dashboard')}</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full" size="sm">{t('nav.login')}</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full" size="sm">{t('nav.getStarted')}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
