import { beforeEach, describe, expect, it, vi } from 'vitest';

const { frankfurterGetRate, exchangeRateApiGetRate, currencyFreaksGetRate } = vi.hoisted(() => ({
  frankfurterGetRate: vi.fn(),
  exchangeRateApiGetRate: vi.fn(),
  currencyFreaksGetRate: vi.fn(),
}));

vi.mock('../../../src/modules/exchange-rates/providers', () => ({
  PROVIDERS: [
    { name: 'frankfurter', getRate: frankfurterGetRate },
    { name: 'exchangerate-api', getRate: exchangeRateApiGetRate },
    { name: 'currencyfreaks', getRate: currencyFreaksGetRate },
  ],
}));

import { fetchRateWithFallback } from '../../../src/modules/exchange-rates/exchange-rates.fallback';

describe('fetchRateWithFallback', () => {
  beforeEach(() => {
    frankfurterGetRate.mockReset();
    exchangeRateApiGetRate.mockReset();
    currencyFreaksGetRate.mockReset();
  });

  it('uses Plan A when it succeeds, without calling B or C', async () => {
    frankfurterGetRate.mockResolvedValue(1500);

    const result = await fetchRateWithFallback('USD', 'ARS');

    expect(result).toEqual({ rate: 1500, provider: 'frankfurter' });
    expect(exchangeRateApiGetRate).not.toHaveBeenCalled();
    expect(currencyFreaksGetRate).not.toHaveBeenCalled();
  });

  it('falls back to Plan B when Plan A fails', async () => {
    frankfurterGetRate.mockRejectedValue(new Error('down'));
    exchangeRateApiGetRate.mockResolvedValue(1510);

    const result = await fetchRateWithFallback('USD', 'ARS');

    expect(result).toEqual({ rate: 1510, provider: 'exchangerate-api' });
    expect(currencyFreaksGetRate).not.toHaveBeenCalled();
  });

  it('falls back to Plan C when Plan A and B fail', async () => {
    frankfurterGetRate.mockRejectedValue(new Error('down'));
    exchangeRateApiGetRate.mockRejectedValue(new Error('down'));
    currencyFreaksGetRate.mockResolvedValue(1520);

    const result = await fetchRateWithFallback('USD', 'ARS');

    expect(result).toEqual({ rate: 1520, provider: 'currencyfreaks' });
  });

  it('throws a combined error when all 3 providers fail', async () => {
    frankfurterGetRate.mockRejectedValue(new Error('down A'));
    exchangeRateApiGetRate.mockRejectedValue(new Error('down B'));
    currencyFreaksGetRate.mockRejectedValue(new Error('down C'));

    await expect(fetchRateWithFallback('USD', 'ARS')).rejects.toThrow(
      /frankfurter: down A.*exchangerate-api: down B.*currencyfreaks: down C/s,
    );
  });

  it.each([0, -5, NaN, Infinity])(
    'treats an invalid rate (%s) from Plan A as a failure and falls back to B',
    async (invalidRate) => {
      frankfurterGetRate.mockResolvedValue(invalidRate);
      exchangeRateApiGetRate.mockResolvedValue(1510);

      const result = await fetchRateWithFallback('USD', 'ARS');

      expect(result).toEqual({ rate: 1510, provider: 'exchangerate-api' });
    },
  );
});
