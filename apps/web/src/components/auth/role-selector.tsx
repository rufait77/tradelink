'use client';
import { Check, HardHat, UserRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlatformSettings } from '../../lib/useSettings';
import { useT } from '../../i18n';

export type SelectableRole = 'contractor' | 'referrer';

interface RoleSelectorProps {
  value: SelectableRole;
  onChange: (role: SelectableRole) => void;
  className?: string;
}

export function RoleSelector({ value, onChange, className }: RoleSelectorProps) {
  const s = usePlatformSettings();
  const t = useT();

  const options: { role: SelectableRole; title: string; tagline: string; perks: string[]; icon: typeof HardHat }[] = [
    {
      role: 'contractor',
      icon: HardHat,
      title: t('roleSelector.contractor.title'),
      tagline: t('roleSelector.contractor.tagline'),
      perks: [
        t('roleSelector.contractor.p1', { pct: s.commissionPct }),
        t('roleSelector.contractor.p2'),
        t('roleSelector.contractor.p3', { signupFee: s.signupFee, subscriptionFee: s.subscriptionFee }),
      ],
    },
    {
      role: 'referrer',
      icon: UserRound,
      title: t('roleSelector.referrer.title'),
      tagline: t('roleSelector.referrer.tagline'),
      perks: [
        t('roleSelector.referrer.p1', { pct: s.referrerCommissionPct }),
        t('roleSelector.referrer.p2'),
        s.referrerRequiresSubscription
          ? t('roleSelector.referrer.p3Sub', { signupFee: s.referrerSignupFee })
          : t('roleSelector.referrer.p3NoSub', { signupFee: s.referrerSignupFee }),
      ],
    },
  ];

  return (
    <fieldset className={cn('space-y-2', className)}>
      <legend className="label">{t('roleSelector.label')}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.role;
          return (
            <button
              key={opt.role}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.role)}
              className={cn(
                'relative text-left p-4 rounded-xl border transition-all outline-none',
                'focus-visible:ring-2 focus-visible:ring-amber-500/40',
                selected
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-glow-amber'
                  : 'bg-navy-900 border-surface-border hover:border-amber-500/30',
              )}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  selected ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-surface-elevated',
                )}>
                  <Icon className={cn('w-4 h-4', selected ? 'text-navy-950' : 'text-slate-300')} />
                </div>
                <p className={cn('text-sm font-semibold', selected ? 'text-amber-400' : 'text-slate-200')}>{opt.title}</p>
                {selected && <Check className="w-4 h-4 text-amber-400 ml-auto" />}
              </div>
              <p className="text-xs text-surface-muted mb-2.5 leading-snug">{opt.tagline}</p>
              <ul className="space-y-1">
                {opt.perks.map((perk) => (
                  <li key={perk} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
