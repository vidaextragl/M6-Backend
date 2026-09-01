import { z } from 'zod';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';

const TRANSACTION_TYPES = [
  'DEPOSIT',
  'WITHDRAWAL',
  'SWAP',
  'BUY',
  'REWARD_CASHBACK',
  'TRANSFER',
] as const;

const TRANSACTION_STATUSES = ['PENDING', 'COMPLETED', 'FAILED'] as const;

const dateParam = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: 'Invalid date',
});

export const listTransactionsQuerySchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  from: dateParam.optional(),
  to: dateParam.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
