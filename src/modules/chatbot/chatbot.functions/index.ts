import type { FunctionDeclaration } from '@google/genai';

import { getBalancesDeclaration, getBalancesHandler } from './get-balances.function';
import { getExchangeRateDeclaration, getExchangeRateHandler } from './get-exchange-rate.function';
import { getRewardsDeclaration, getRewardsHandler } from './get-rewards.function';
import { getTransactionsDeclaration, getTransactionsHandler } from './get-transactions.function';

type FunctionHandler = (
  userId: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

// Único punto donde el nombre que devuelve el modelo se resuelve a código real. Cualquier función
// que no esté en este mapa se rechaza en `dispatchFunctionCall` en vez de ejecutarse — el modelo
// nunca puede invocar código arbitrario, solo estas 4 funciones de lectura.
const HANDLERS: Record<string, FunctionHandler> = {
  get_balances: (userId) => getBalancesHandler(userId),
  get_transaction_history: (userId, args) => getTransactionsHandler(userId, args),
  get_exchange_rate: (userId, args) => getExchangeRateHandler(userId, args),
  get_rewards_summary: (userId) => getRewardsHandler(userId),
};

export const CHATBOT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  getBalancesDeclaration,
  getTransactionsDeclaration,
  getExchangeRateDeclaration,
  getRewardsDeclaration,
];

// `userId` siempre sale del JWT ya verificado por `authMiddleware`, nunca de los argumentos que
// arma el modelo — así una instrucción maliciosa en el mensaje del usuario no puede pedirle al bot
// que consulte datos de otra cuenta.
export async function dispatchFunctionCall(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const handler = HANDLERS[name];
  if (!handler) {
    return { error: `Unknown function "${name}"` };
  }

  try {
    return await handler(userId, args);
  } catch (error) {
    console.error(`Chatbot function "${name}" failed`, error);
    return { error: 'Failed to retrieve the requested data' };
  }
}
