'use client';
import { Button } from '../components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-xl font-heading font-bold text-white mb-2">Something Went Wrong</h1>
        <p className="text-sm text-surface-muted mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} size="lg">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}
