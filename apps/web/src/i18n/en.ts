import { enCommon } from './dictionaries/en/common';

/**
 * The English dictionary is the source of truth for the key set.
 * Every other locale is typed as `Record<TranslationKey, string>`, so a missing
 * or misspelled key is a compile error rather than a runtime fallback.
 */
export const en = {
  ...enCommon,
} as const;

export type TranslationKey = keyof typeof en;

export type Dictionary = Record<TranslationKey, string>;
