import { enCommon } from './dictionaries/en/common';
import { enLanding } from './dictionaries/en/landing';
import { enLegal } from './dictionaries/en/legal';
import { enAuth } from './dictionaries/en/auth';

/**
 * The English dictionary is the source of truth for the key set.
 * Every other locale is typed as `Record<TranslationKey, string>`, so a missing
 * or misspelled key is a compile error rather than a runtime fallback.
 */
export const en = {
  ...enCommon,
  ...enLanding,
  ...enLegal,
  ...enAuth,
} as const;

export type TranslationKey = keyof typeof en;

export type Dictionary = Record<TranslationKey, string>;
