import { z } from 'zod';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export const swapSchema = z
  .object({
    fromCurrency: z.enum(SUPPORTED_CURRENCIES),
    toCurrency: z.enum(SUPPORTED_CURRENCIES),
    amountToReceive: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive number with up to 2 decimal places')
      .refine((val) => Number(val) > 0, { message: 'Amount must be greater than 0' }),
  })
  .refine((data) => data.fromCurrency !== data.toCurrency, {
    message: '"fromCurrency" and "toCurrency" must be different',
    path: ['toCurrency'],
  });
