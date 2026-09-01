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

// Exige ISO 8601 (YYYY-MM-DD o datetime completo) para no depender de qué formato ambiguo
// (DD/MM vs MM/DD) interprete Date.parse, y valida que el día exista de verdad en el calendario
// (Date.parse "corrige" silenciosamente 2026-02-30 a 2026-03-02 en vez de rechazarlo).
const dateParam = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
    'Date must be in ISO 8601 format (YYYY-MM-DD or full ISO datetime)',
  )
  .refine(
    (val) => {
      const parsed = new Date(val);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === val.slice(0, 10);
    },
    { message: 'Invalid date' },
  )
  .transform((val) => new Date(val));

export const listTransactionsQuerySchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES).optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    from: dateParam.optional(),
    to: dateParam.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" must be before or equal to "to"',
    path: ['from'],
  });
