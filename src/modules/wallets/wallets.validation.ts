import { z } from 'zod';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export const depositWithdrawSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive number with up to 2 decimal places')
    .refine((val) => Number(val) > 0, { message: 'Amount must be greater than 0' }),
});
