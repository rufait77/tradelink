import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'amber' | 'green' | 'red' | 'blue' | 'status';
  className?: string;
  statusClass?: string;
}

export function Badge({ children, variant = 'default', className, statusClass }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-surface-elevated text-slate-300 border-surface-border',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    status: '',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variant === 'status' ? statusClass : variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
