'use client';
import { Navbar } from '../../../components/layout/navbar';
import { Footer } from '../../../components/layout/footer';
import { useT } from '../../../i18n';

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  // The language switcher reaches this surface through <Navbar />, which is
  // rendered below — clients can switch before touching a quote or a payment.
  const t = useT();
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-narrow px-4">
          {/* Client Portal Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t('clientPortal.badge')}
            </div>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
