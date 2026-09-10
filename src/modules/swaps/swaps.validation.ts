import { z } from 'zod';

import { amountSchema } from '../../shared/amount.schema';
import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export const swapSchema = z
  .object({
    fromCurrency: z.enum(SUPPORTED_CURRENCIES),
    toCurrency: z.enum(SUPPORTED_CURRENCIES),
    amountToReceive: amountSchema,
  })
  .refine((data) => data.fromCurrency !== data.toCurrency, {
    message: '"fromCurrency" and "toCurrency" must be different',
    path: ['toCurrency'],
  });

export const buySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  amount: amountSchema,
});
