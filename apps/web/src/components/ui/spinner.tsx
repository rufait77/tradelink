import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  return <Loader2 className={cn(sizes[size], 'animate-spin text-amber-500', className)} />;
}

export function PageLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Spinner size="lg" />
      {text && <p className="text-surface-muted text-sm">{text}</p>}
    </div>
  );
}
