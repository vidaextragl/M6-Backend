import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getExchangeRate, sumTransactionAmountsByCurrency } = vi.hoisted(() => ({
  getExchangeRate: vi.fn(),
  sumTransactionAmountsByCurrency: vi.fn(),
}));

vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({ getExchangeRate }));
vi.mock('../../../src/modules/transactions/transactions.repository', () => ({
  sumTransactionAmountsByCurrency,
}));

import { applyCashbackLimits } from '../../../src/modules/rewards/cashback.limits';
import type { CashbackResult } from '../../../src/modules/rewards/cashback.calculator';

// `applyCashbackLimits` llama a `sumTransactionAmountsByCurrency` dos veces en paralelo
// (`Promise.all([...since startOfWeek, ...since startOfMonth])`), en ese orden: el primer
// `mockResolvedValueOnce` cubre la ventana semanal, el segundo la mensual.
function mockUsage(weeklyUsd: number, monthlyUsd: number) {
  sumTransactionAmountsByCurrency
    .mockResolvedValueOnce({ USD: weeklyUsd })
    .mockResolvedValueOnce({ USD: monthlyUsd });
}

describe('applyCashbackLimits', () => {
  beforeEach(() => {
    getExchangeRate.mockReset();
    sumTransactionAmountsByCurrency.mockReset();
  });

  it('leaves the cashback untouched when it is under all 3 caps', async () => {
    mockUsage(0, 0);
    const raw: CashbackResult = { cashbackAmount: '5.00', points: 500 };

    const result = await applyCashbackLimits('wallet-1', 'USD', raw);

    expect(result).toEqual(raw);
  });

  it('caps at the $10 per-transaction limit when weekly and monthly still have room', async () => {
    mockUsage(0, 0);
    const raw: CashbackResult = { cashbackAmount: '25.00', points: 2500 };

    const result = await applyCashbackLimits('wallet-1', 'USD', raw);

    expect(result).toEqual({ cashbackAmount: '10.00', points: 1000 });
  });

  it('the weekly cap binds independently, even with monthly room to spare', async () => {
    // $95 usados esta semana (quedan $5), pero solo $5 usados este mes (quedan $195) — si el tope
    // semanal y el mensual no fueran independientes, el mensual "ganaría" y dejaría pasar más de $5.
    mockUsage(95, 5);
    const raw: CashbackResult = { cashbackAmount: '25.00', points: 2500 };

    const result = await applyCashbackLimits('wallet-1', 'USD', raw);

    expect(result).toEqual({ cashbackAmount: '5.00', points: 500 });
  });

  it('the monthly cap binds independently, even with weekly room to spare', async () => {
    // Semana recién empezada ($0 usados, $100 disponibles) pero el mes ya casi agotado ($195
    // usados, quedan $5) — el semanal por sí solo dejaría pasar $10, el mensual lo frena en $5.
    mockUsage(0, 195);
    const raw: CashbackResult = { cashbackAmount: '25.00', points: 2500 };

    const result = await applyCashbackLimits('wallet-1', 'USD', raw);

    expect(result).toEqual({ cashbackAmount: '5.00', points: 500 });
  });

  it('returns zero cashback once both weekly and monthly caps are fully spent', async () => {
    mockUsage(100, 200);
    const raw: CashbackResult = { cashbackAmount: '25.00', points: 2500 };

    const result = await applyCashbackLimits('wallet-1', 'USD', raw);

    expect(result).toEqual({ cashbackAmount: '0.00', points: 0 });
  });

  it('converts a non-USD cashback amount through USD to compare against the caps', async () => {
    mockUsage(0, 0);
    getExchangeRate.mockImplementation(async (from: string, to: string) => {
      const rate = from === 'EUR' && to === 'USD' ? 1.1 : from === 'USD' && to === 'EUR' ? 1 / 1.1 : 1;
      return { from, to, rate, provider: 'mock', fetchedAt: new Date(), source: 'live' as const };
    });
    // 50 EUR crudos = 55 USD -> tope de $10 USD -> 9.09 EUR (10 / 1.1).
    const raw: CashbackResult = { cashbackAmount: '50.00', points: 5000 };

    const result = await applyCashbackLimits('wallet-1', 'EUR', raw);

    expect(result).toEqual({ cashbackAmount: '9.09', points: 909 });
  });

  it('fails closed to zero cashback when the currency cannot be converted to USD', async () => {
    mockUsage(0, 0);
    getExchangeRate.mockRejectedValue(new Error('all exchange rate providers down'));
    const raw: CashbackResult = { cashbackAmount: '50.00', points: 5000 };

    const result = await applyCashbackLimits('wallet-1', 'EUR', raw);

    expect(result).toEqual({ cashbackAmount: '0.00', points: 0 });
    // El fallo cierra el cashback de esta compra; no debería ni llegar a consultar el uso
    // semanal/mensual, porque ya se sabe que el resultado va a ser 0.
    expect(sumTransactionAmountsByCurrency).not.toHaveBeenCalled();
  });
});
