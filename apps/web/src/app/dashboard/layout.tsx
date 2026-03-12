'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { DashboardSidebar } from '../../components/layout/dashboard-sidebar';
import { DashboardTopbar } from '../../components/layout/dashboard-topbar';
import { PageLoader } from '../../components/ui/spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, fetchMe, needsOnboarding } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function init() {
      if (!token) {
        router.push('/login');
        return;
      }
      if (!user) {
        await fetchMe();
      }
      setLoading(false);
    }
    init();
  }, [token, user, fetchMe, router]);

  useEffect(() => {
    if (!loading && needsOnboarding()) {
      router.push('/onboarding');
    }
  }, [loading, needsOnboarding, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) return <PageLoader text="Loading your dashboard..." />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Sidebar — desktop */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-30 lg:hidden">
            <DashboardSidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <DashboardTopbar
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          menuOpen={mobileMenuOpen}
        />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
