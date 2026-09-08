import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';

import { ExchangeRateUnavailableError } from '../../../shared/errors';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants';
import { getExchangeRate } from '../../exchange-rates/exchange-rates.service';

export const getExchangeRateDeclaration: FunctionDeclaration = {
  name: 'get_exchange_rate',
  description: 'Devuelve la tasa de cambio vigente entre dos monedas soportadas por la app.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      from: {
        type: Type.STRING,
        format: 'enum',
        enum: [...SUPPORTED_CURRENCIES],
        description: 'Moneda de origen.',
      },
      to: {
        type: Type.STRING,
        format: 'enum',
        enum: [...SUPPORTED_CURRENCIES],
        description: 'Moneda de destino.',
      },
    },
    required: ['from', 'to'],
  },
};

export async function getExchangeRateHandler(
  _userId: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const from = String(args.from ?? '');
  const to = String(args.to ?? '');

  if (!SUPPORTED_CURRENCIES.includes(from as (typeof SUPPORTED_CURRENCIES)[number])) {
    return { error: `"${from}" is not a supported currency` };
  }
  if (!SUPPORTED_CURRENCIES.includes(to as (typeof SUPPORTED_CURRENCIES)[number])) {
    return { error: `"${to}" is not a supported currency` };
  }

  try {
    const result = await getExchangeRate(from, to);
    return { from: result.from, to: result.to, rate: result.rate, fetchedAt: result.fetchedAt };
  } catch (error) {
    if (error instanceof ExchangeRateUnavailableError) {
      return { error: 'Exchange rate is temporarily unavailable, swaps may be disabled' };
    }
    throw error;
  }
}
