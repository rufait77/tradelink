import { esCommon } from './dictionaries/es/common';
import { esLanding } from './dictionaries/es/landing';
import { esLegal } from './dictionaries/es/legal';
import { esAuth } from './dictionaries/es/auth';
import type { Dictionary } from './en';

export const es: Dictionary = {
  ...esCommon,
  ...esLanding,
  ...esLegal,
  ...esAuth,
};
