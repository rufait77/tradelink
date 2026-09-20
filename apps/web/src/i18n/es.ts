import { esCommon } from './dictionaries/es/common';
import { esLanding } from './dictionaries/es/landing';
import { esLegal } from './dictionaries/es/legal';
import { esAuth } from './dictionaries/es/auth';
import { esDashboard } from './dictionaries/es/dashboard';
import { esJobs } from './dictionaries/es/jobs';
import { esMessages } from './dictionaries/es/messages';
import { esClient } from './dictionaries/es/client';
import type { Dictionary } from './en';

export const es: Dictionary = {
  ...esCommon,
  ...esLanding,
  ...esLegal,
  ...esAuth,
  ...esDashboard,
  ...esJobs,
  ...esMessages,
  ...esClient,
};
