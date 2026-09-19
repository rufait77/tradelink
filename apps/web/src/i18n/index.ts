export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  LOCALE_SHORT_NAMES,
  LOCALE_TAGS,
  isLocale,
  type Locale,
} from './config';

export { I18nProvider, useI18n, useT, translate, type TranslateFn } from './provider';

export { en, type TranslationKey, type Dictionary } from './en';
export { es } from './es';

export {
  useFormat,
  formatDateFor,
  formatMonthYearFor,
  formatLongDateFor,
  formatRelativeTimeFor,
  formatCurrencyFor,
  formatNumberFor,
} from './format';

export {
  useLabels,
  tradeLabel,
  statusLabel,
  urgencyLabel,
  escrowStatusLabel,
  roleLabel,
  apiErrorMessage,
} from './labels';
