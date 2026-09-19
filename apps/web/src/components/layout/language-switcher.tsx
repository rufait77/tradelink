'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT_NAMES, useI18n, type Locale } from '../../i18n';

interface LanguageSwitcherProps {
  className?: string;
  /** `compact` hides the EN/ES badge and shows the globe only (tight toolbars). */
  compact?: boolean;
}

export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('language.change')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-400',
            'hover:text-white hover:bg-surface-elevated transition-all',
            'data-[state=open]:text-amber-400 data-[state=open]:bg-surface-elevated',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60',
            className
          )}
        >
          <Globe className="w-[18px] h-[18px]" />
          {!compact && (
            <span className="text-xs font-semibold tracking-wide">{LOCALE_SHORT_NAMES[locale]}</span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 glass-card min-w-[10rem] overflow-hidden p-1"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-muted">
            {t('language.label')}
          </DropdownMenu.Label>

          {LOCALES.map((option: Locale) => {
            const active = option === locale;
            return (
              <DropdownMenu.Item
                key={option}
                onSelect={() => setLocale(option)}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none',
                  active
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-300 data-[highlighted]:bg-amber-500/10 data-[highlighted]:text-amber-400'
                )}
              >
                <span>{LOCALE_NAMES[option]}</span>
                {active && <Check className="w-3.5 h-3.5 text-amber-500" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
