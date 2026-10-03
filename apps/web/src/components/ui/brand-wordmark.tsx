import { cn } from '../../lib/utils';

interface BrandWordmarkProps {
  className?: string;
}

// "Tradelink" + bold amber "PRO" must stay on one line with no whitespace so it reads as one word.
// PRO is slightly larger and italic in wordmarks only; plain-text "TradelinkPRO" strings stay plain.
export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={cn('font-heading font-bold text-white tracking-tight', className)}>
      Tradelink<span className="font-black italic text-amber-500 text-[1.08em] pr-0.5">PRO</span>
    </span>
  );
}
