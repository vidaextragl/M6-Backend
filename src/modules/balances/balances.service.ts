import type { BalanceRecord } from './balances.types';

export function toBalanceResponse(balance: BalanceRecord) {
  return {
    currency: balance.currency,
    amount: balance.amount,
  };
}
