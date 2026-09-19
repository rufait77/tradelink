'use client';

import { en, type TranslationKey } from './en';
import { useI18n, type TranslateFn } from './provider';

/**
 * Enum values (trade types, job statuses, urgency…) are sent to and from the
 * API verbatim. These helpers only translate them for display, and fall back to
 * the raw value whenever the API introduces something the dictionary predates.
 */
function lookup(prefix: string, value: string | null | undefined): TranslationKey | null {
  if (!value) return null;
  const key = `${prefix}${value}`;
  return key in en ? (key as TranslationKey) : null;
}

function labelFor(t: TranslateFn, prefix: string, value: string | null | undefined): string {
  const key = lookup(prefix, value);
  return key ? t(key) : (value ?? '');
}

export function tradeLabel(t: TranslateFn, value: string | null | undefined): string {
  return labelFor(t, 'trade.', value);
}

export function statusLabel(t: TranslateFn, value: string | null | undefined): string {
  return labelFor(t, 'status.', value);
}

export function urgencyLabel(t: TranslateFn, value: string | null | undefined): string {
  return labelFor(t, 'urgency.', value);
}

export function escrowStatusLabel(t: TranslateFn, value: string | null | undefined): string {
  return labelFor(t, 'escrowStatus.', value);
}

export function roleLabel(t: TranslateFn, value: string | null | undefined): string {
  return labelFor(t, 'role.', value);
}

/**
 * Turns an API failure into a message for the user.
 * Prefers a translated message for the error `code`; otherwise shows the
 * server's own `error` string, which stays in English for now (see CR-B01).
 */
export function apiErrorMessage(error: unknown, t: TranslateFn, fallback?: string): string {
  const response = (error as { response?: { data?: { code?: string; error?: string } } })?.response;
  const code = response?.data?.code;
  const key = lookup('apiError.', code);
  if (key) return t(key);

  const serverMessage = response?.data?.error;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;

  if (!response) return t('apiError.network');
  return fallback ?? t('apiError.generic');
}

/** Hook form of the label helpers, bound to the active locale. */
export function useLabels() {
  const { t } = useI18n();
  return {
    tradeLabel: (value: string | null | undefined) => tradeLabel(t, value),
    statusLabel: (value: string | null | undefined) => statusLabel(t, value),
    urgencyLabel: (value: string | null | undefined) => urgencyLabel(t, value),
    escrowStatusLabel: (value: string | null | undefined) => escrowStatusLabel(t, value),
    roleLabel: (value: string | null | undefined) => roleLabel(t, value),
    apiErrorMessage: (error: unknown, fallback?: string) => apiErrorMessage(error, t, fallback),
  };
}
