import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Zap, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-6xl font-heading font-extrabold gradient-text mb-4">404</h1>
        <h2 className="text-xl font-heading font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-sm text-surface-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button size="lg">
            <Home className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
