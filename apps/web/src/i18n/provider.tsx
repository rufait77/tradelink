'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_TAGS,
  persistLocale,
  readStoredLocale,
  type Locale,
} from './config';
import { en, type Dictionary, type TranslationKey } from './en';
import { es } from './es';

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

export type TranslateVars = Record<string, string | number>;

export type TranslateFn = (key: TranslationKey, vars?: TranslateVars) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslateFn;
  /** False until the stored locale has been applied on the client. */
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function translate(locale: Locale, key: TranslationKey, vars?: TranslateVars): string {
  // Fall back to English, then to the key itself, so a gap never renders blank.
  const template = DICTIONARIES[locale]?.[key] ?? en[key] ?? key;
  return interpolate(template, vars);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start from the default so the server-rendered markup and the first
  // client render agree; the stored choice is applied in the effect below.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  // `t` is captured by effects and callbacks that are created on mount and not
  // re-created when the locale changes — for example a data-loading effect that
  // reports an API failure. Resolving through a ref means such a stale closure
  // still produces text in the locale that is active when it finally runs,
  // rather than the default locale the page first rendered with.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== DEFAULT_LOCALE) setLocaleState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    // A fresh identity on every locale change, so `useMemo([t])` consumers
    // (translated Zod schemas, option lists) rebuild when the language flips.
    const t: TranslateFn = (key, vars) => translate(localeRef.current, key, vars);
    return { locale, setLocale, t, ready };
  }, [locale, setLocale, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

/** Shorthand for components that only need the translate function. */
export function useT(): TranslateFn {
  return useI18n().t;
}
