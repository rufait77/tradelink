'use client';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Zap, Home } from 'lucide-react';
import { useT } from '../i18n';

export default function NotFoundPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-6xl font-heading font-extrabold gradient-text mb-4">404</h1>
        <h2 className="text-xl font-heading font-bold text-white mb-2">{t('notFound.heading')}</h2>
        <p className="text-sm text-surface-muted mb-8">
          {t('notFound.body')}
        </p>
        <Link href="/">
          <Button size="lg">
            <Home className="w-4 h-4" /> {t('notFound.cta')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
