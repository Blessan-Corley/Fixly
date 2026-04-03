import type { HelpCategory } from '../help.types';

import { accountSettings } from './account';
import { forFixers } from './fixers';
import { gettingStarted } from './getting-started';
import { forHirers } from './hirers';
import { payments } from './payments';
import { safetySecurity } from './safety';

export const HELP_CATEGORIES: HelpCategory[] = [
  gettingStarted,
  forHirers,
  forFixers,
  payments,
  safetySecurity,
  accountSettings,
];
