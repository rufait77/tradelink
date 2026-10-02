import { cn } from '../../lib/utils';

interface BrandWordmarkProps {
  className?: string;
}

// "Tradelink" + bold amber "PRO" must stay on one line with no whitespace so it reads as one word.
export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={cn('font-heading font-bold text-white tracking-tight', className)}>
      Tradelink<span className="font-black text-amber-500">PRO</span>
    </span>
  );
}
