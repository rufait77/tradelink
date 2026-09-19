'use client';

import { format as formatDateFns } from 'date-fns';
import { es as esDateLocale, enUS as enDateLocale } from 'date-fns/locale';
import { formatDate as formatDateEn } from '../lib/utils';
import { LOCALE_TAGS, type Locale } from './config';
import { useI18n, type TranslateFn } from './provider';

const DATE_FNS_LOCALES = { en: enDateLocale, es: esDateLocale } as const;

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_BEFORE_ABSOLUTE = 30;

/** Short absolute date. English keeps the exact legacy `en-US` output. */
export function formatDateFor(locale: Locale, dateStr: string): string {
  if (locale === 'en') return formatDateEn(dateStr);
  return formatDateFns(new Date(dateStr), 'd MMM yyyy', { locale: DATE_FNS_LOCALES[locale] });
}

/** "Sep 2026" / "sept 2026" — used for member-since style labels. */
export function formatMonthYearFor(locale: Locale, dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(LOCALE_TAGS[locale], {
    month: 'short',
    year: 'numeric',
  });
}

/** Long date with weekday, for scheduled work dates. */
export function formatLongDateFor(locale: Locale, dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(LOCALE_TAGS[locale], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Coarse relative time. The English dictionary values reproduce the previous
 * hand-rolled output exactly ("just now", "5m ago", "3h ago", "2d ago").
 */
export function formatRelativeTimeFor(locale: Locale, dateStr: string, t: TranslateFn): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / MINUTE_MS);
  if (minutes < 1) return t('time.justNow');
  if (minutes < MINUTES_PER_HOUR) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return t('time.hoursAgo', { count: hours });
  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days < DAYS_BEFORE_ABSOLUTE) return t('time.daysAgo', { count: days });
  return formatDateFor(locale, dateStr);
}

/** Currency is USD in both locales and formats identically in `en-US`/`es-US`. */
export function formatCurrencyFor(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatNumberFor(locale: Locale, value: number): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);
}

/** Locale-bound formatters for components. */
export function useFormat() {
  const { locale, t } = useI18n();
  return {
    locale,
    formatDate: (dateStr: string) => formatDateFor(locale, dateStr),
    formatMonthYear: (dateStr: string) => formatMonthYearFor(locale, dateStr),
    formatLongDate: (dateStr: string) => formatLongDateFor(locale, dateStr),
    formatRelativeTime: (dateStr: string) => formatRelativeTimeFor(locale, dateStr, t),
    formatCurrency: (amount: number) => formatCurrencyFor(locale, amount),
    formatNumber: (value: number) => formatNumberFor(locale, value),
  };
}
