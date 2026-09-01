import { z } from 'zod';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';

export const getExchangeRateQuerySchema = z
  .object({
    from: z.enum(SUPPORTED_CURRENCIES),
    to: z.enum(SUPPORTED_CURRENCIES),
  })
  .refine((data) => data.from !== data.to, {
    message: '"from" and "to" must be different currencies',
    path: ['to'],
  });
