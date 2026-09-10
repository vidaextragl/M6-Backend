import { z } from 'zod';

import { amountSchema } from '../../shared/amount.schema';
import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export const depositWithdrawSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  amount: amountSchema,
});
