import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';

import { SUPPORTED_CURRENCIES } from '../../../shared/constants';
import { listTransactions } from '../../transactions/transactions.service';
import type { TransactionType } from '../../transactions/transactions.types';

const TRANSACTION_TYPES: TransactionType[] = [
  'DEPOSIT',
  'WITHDRAWAL',
  'SWAP',
  'BUY',
  'REWARD_CASHBACK',
  'TRANSFER',
];

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const getTransactionsDeclaration: FunctionDeclaration = {
  name: 'get_transaction_history',
  description:
    'Devuelve las transacciones más recientes del usuario, ordenadas de la más nueva a la más ' +
    'vieja. Se puede filtrar opcionalmente por tipo o por moneda.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        format: 'enum',
        enum: TRANSACTION_TYPES,
        description: 'Tipo de transacción a filtrar. Si no se especifica, trae todos los tipos.',
      },
      currency: {
        type: Type.STRING,
        format: 'enum',
        enum: [...SUPPORTED_CURRENCIES],
        description: 'Moneda a filtrar. Si no se especifica, trae todas las monedas.',
      },
      limit: {
        type: Type.INTEGER,
        description: `Cantidad máxima de transacciones a devolver (por defecto ${DEFAULT_LIMIT}, máximo ${MAX_LIMIT}).`,
      },
    },
  },
};

export async function getTransactionsHandler(
  userId: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const requestedLimit = typeof args.limit === 'number' ? args.limit : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, Math.trunc(requestedLimit)), MAX_LIMIT);

  const result = await listTransactions(userId, {
    type: TRANSACTION_TYPES.includes(args.type as TransactionType)
      ? (args.type as TransactionType)
      : undefined,
    currency: SUPPORTED_CURRENCIES.includes(args.currency as (typeof SUPPORTED_CURRENCIES)[number])
      ? (args.currency as string)
      : undefined,
    limit,
    offset: 0,
  });

  return { transactions: result.transactions, total: result.total };
}
