// Locale configuration for the Tradelink web app.
// Locale is pure client state — there are no locale-prefixed routes.

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** localStorage key holding the visitor's explicit language choice. */
export const LOCALE_STORAGE_KEY = 'tradelink_locale';

/** Mirrored into a cookie so the choice survives into any future SSR work. */
export const LOCALE_COOKIE = 'tradelink_locale';

/** One year, in seconds — how long the locale cookie lives. */
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Native names, shown in the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

/** Two-letter badge shown in the collapsed switcher trigger. */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
};

/** BCP-47 tags used for `<html lang>` and Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-US',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best-guess locale from the browser's language preferences.
 * Only used on a visitor's very first page view, before they have chosen.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const base = candidate.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Reads the stored choice, falling back to browser detection, then English. */
export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode / blocked storage — fall through to detection.
  }
  return detectBrowserLocale();
}

/** Persists the choice to localStorage and mirrors it into a cookie. */
export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Non-fatal: the choice simply will not survive a reload.
  }
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
  } catch {
    // Non-fatal.
  }
}
