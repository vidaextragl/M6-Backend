import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';

import { getWallet } from '../../wallets/wallets.service';

export const getBalancesDeclaration: FunctionDeclaration = {
  name: 'get_balances',
  description:
    'Devuelve el saldo actual de la wallet del usuario, desglosado por cada moneda que tiene con saldo.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export async function getBalancesHandler(userId: string): Promise<Record<string, unknown>> {
  const wallet = await getWallet(userId);
  return { balances: wallet.balances };
}
