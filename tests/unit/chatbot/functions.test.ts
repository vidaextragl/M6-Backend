import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWallet, listTransactions, getExchangeRate, getRewardsSummary } = vi.hoisted(() => ({
  getWallet: vi.fn(),
  listTransactions: vi.fn(),
  getExchangeRate: vi.fn(),
  getRewardsSummary: vi.fn(),
}));

vi.mock('../../../src/modules/wallets/wallets.service', () => ({ getWallet }));
vi.mock('../../../src/modules/transactions/transactions.service', () => ({ listTransactions }));
vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({ getExchangeRate }));
vi.mock('../../../src/modules/rewards/rewards.service', () => ({ getRewardsSummary }));

import { ExchangeRateUnavailableError } from '../../../src/shared/errors';
import { getBalancesHandler } from '../../../src/modules/chatbot/chatbot.functions/get-balances.function';
import { getTransactionsHandler } from '../../../src/modules/chatbot/chatbot.functions/get-transactions.function';
import { getExchangeRateHandler } from '../../../src/modules/chatbot/chatbot.functions/get-exchange-rate.function';
import { getRewardsHandler } from '../../../src/modules/chatbot/chatbot.functions/get-rewards.function';

describe('getBalancesHandler', () => {
  beforeEach(() => {
    getWallet.mockReset();
  });

  it("returns the user's balances from the wallet service", async () => {
    getWallet.mockResolvedValue({ id: 'wallet-1', balances: [{ currency: 'USD', amount: '100.00' }] });

    const result = await getBalancesHandler('user-1');

    expect(getWallet).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ balances: [{ currency: 'USD', amount: '100.00' }] });
  });
});

describe('getTransactionsHandler', () => {
  beforeEach(() => {
    listTransactions.mockReset().mockResolvedValue({ transactions: [], total: 0 });
  });

  it('defaults to a limit of 10 when the model omits it', async () => {
    await getTransactionsHandler('user-1', {});

    expect(listTransactions).toHaveBeenCalledWith('user-1', {
      type: undefined,
      currency: undefined,
      limit: 10,
      offset: 0,
    });
  });

  it('clamps a limit above the 20-item maximum', async () => {
    await getTransactionsHandler('user-1', { limit: 500 });

    expect(listTransactions).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ limit: 20 }),
    );
  });

  it('passes through a valid type and currency filter', async () => {
    await getTransactionsHandler('user-1', { type: 'DEPOSIT', currency: 'EUR' });

    expect(listTransactions).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'DEPOSIT', currency: 'EUR' }),
    );
  });

  it('drops a type or currency the model invented that is not a real one', async () => {
    await getTransactionsHandler('user-1', { type: 'NOT_REAL', currency: 'XYZ' });

    expect(listTransactions).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: undefined, currency: undefined }),
    );
  });
});

describe('getExchangeRateHandler', () => {
  beforeEach(() => {
    getExchangeRate.mockReset();
  });

  it('returns the rate for a valid currency pair', async () => {
    getExchangeRate.mockResolvedValue({
      from: 'USD',
      to: 'ARS',
      rate: 1500,
      provider: 'mock',
      fetchedAt: new Date('2026-01-01'),
      source: 'live' as const,
    });

    const result = await getExchangeRateHandler('user-1', { from: 'USD', to: 'ARS' });

    expect(result).toMatchObject({ from: 'USD', to: 'ARS', rate: 1500 });
  });

  it('rejects an unsupported currency without calling the exchange-rates service', async () => {
    const result = await getExchangeRateHandler('user-1', { from: 'USD', to: 'XYZ' });

    expect(result).toEqual({ error: '"XYZ" is not a supported currency' });
    expect(getExchangeRate).not.toHaveBeenCalled();
  });

  it('returns a friendly error when the exchange rate is unavailable', async () => {
    getExchangeRate.mockRejectedValue(new ExchangeRateUnavailableError());

    const result = await getExchangeRateHandler('user-1', { from: 'USD', to: 'ARS' });

    expect(result).toEqual({ error: 'Exchange rate is temporarily unavailable, swaps may be disabled' });
  });

  it('lets an unexpected error propagate instead of swallowing it', async () => {
    getExchangeRate.mockRejectedValue(new Error('unexpected'));

    await expect(getExchangeRateHandler('user-1', { from: 'USD', to: 'ARS' })).rejects.toThrow(
      'unexpected',
    );
  });
});

describe('getRewardsHandler', () => {
  beforeEach(() => {
    getRewardsSummary.mockReset();
  });

  it('maps the points balance and a trimmed catalog', async () => {
    getRewardsSummary.mockResolvedValue({
      pointsBalance: 500,
      catalog: [
        { id: 'item-1', name: 'Cupón 10% OFF', description: 'desc', costPoints: 200 },
      ],
    });

    const result = await getRewardsHandler('user-1');

    expect(result).toEqual({
      pointsBalance: 500,
      catalog: [{ id: 'item-1', name: 'Cupón 10% OFF', costPoints: 200 }],
    });
  });
});
