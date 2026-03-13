'use client';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

const EMPTY_SENTINEL = '__none__';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, error, placeholder = 'Select...', options, value, onChange, className }, ref) => {
    // Radix doesn't allow empty-string values — map to sentinel
    const safeValue = value === '' || value === undefined ? EMPTY_SENTINEL : value;
    const safeOptions = options.map((opt) => ({
      ...opt,
      value: opt.value === '' ? EMPTY_SENTINEL : opt.value,
    }));

    function handleChange(v: string) {
      onChange?.(v === EMPTY_SENTINEL ? '' : v);
    }

    return (
      <div className="space-y-1.5">
        {label && <label className="label">{label}</label>}
        <SelectPrimitive.Root value={safeValue} onValueChange={handleChange}>
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              'input-field flex items-center justify-between',
              safeValue === EMPTY_SENTINEL && 'text-surface-muted',
              error && 'border-red-500/50',
              className
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>
              <ChevronDown className="w-4 h-4 text-surface-muted" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-50 glass-card overflow-hidden max-h-60"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1">
                {safeOptions.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none',
                      'text-slate-300 hover:bg-amber-500/10 hover:text-amber-400',
                      'data-[highlighted]:bg-amber-500/10 data-[highlighted]:text-amber-400'
                    )}
                  >
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check className="w-3.5 h-3.5 text-amber-500" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

