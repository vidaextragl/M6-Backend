import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCachedRate, setCachedRate, fetchRateWithFallback, findLatestRate, upsertRate } =
  vi.hoisted(() => ({
    getCachedRate: vi.fn(),
    setCachedRate: vi.fn(),
    fetchRateWithFallback: vi.fn(),
    findLatestRate: vi.fn(),
    upsertRate: vi.fn(),
  }));

vi.mock('../../../src/modules/exchange-rates/exchange-rates.cache', () => ({
  getCachedRate,
  setCachedRate,
}));
vi.mock('../../../src/modules/exchange-rates/exchange-rates.fallback', () => ({
  fetchRateWithFallback,
}));
vi.mock('../../../src/modules/exchange-rates/exchange-rates.repository', () => ({
  findLatestRate,
  upsertRate,
}));

import { ExchangeRateUnavailableError } from '../../../src/shared/errors';
import { getExchangeRate } from '../../../src/modules/exchange-rates/exchange-rates.service';

describe('getExchangeRate (orchestration: cache -> fallback -> local DB fallback)', () => {
  beforeEach(() => {
    getCachedRate.mockReset().mockReturnValue(null);
    setCachedRate.mockReset();
    fetchRateWithFallback.mockReset();
    findLatestRate.mockReset().mockResolvedValue(null);
    upsertRate.mockReset().mockResolvedValue(undefined);
  });

  it('fetches live, caches it, and persists it when there is no cached rate', async () => {
    fetchRateWithFallback.mockResolvedValue({ rate: 1500, provider: 'frankfurter' });

    const result = await getExchangeRate('USD', 'ARS');

    expect(result.source).toBe('live');
    expect(result.rate).toBe(1500);
    expect(setCachedRate).toHaveBeenCalledWith('USD', 'ARS', 1500, 'frankfurter');
    expect(upsertRate).toHaveBeenCalledWith('USD', 'ARS', 1500, 'frankfurter');
  });

  it('returns the cached rate without touching the fallback cascade', async () => {
    getCachedRate.mockReturnValue({ rate: 1499, provider: 'frankfurter', fetchedAt: new Date() });

    const result = await getExchangeRate('USD', 'ARS');

    expect(result.source).toBe('memory_cache');
    expect(result.rate).toBe(1499);
    expect(fetchRateWithFallback).not.toHaveBeenCalled();
  });

  it('falls back to a recent DB record when the fallback cascade fails', async () => {
    fetchRateWithFallback.mockRejectedValue(new Error('all providers down'));
    findLatestRate.mockResolvedValue({
      id: '1',
      from_currency: 'USD',
      to_currency: 'ARS',
      rate: '1490',
      provider: 'frankfurter',
      fetched_at: new Date(Date.now() - 30 * 60 * 1000),
    });

    const result = await getExchangeRate('USD', 'ARS');

    expect(result.source).toBe('local_fallback');
    expect(result.rate).toBe(1490);
  });

  it('throws when the cascade fails and the only DB record is older than 1 hour', async () => {
    fetchRateWithFallback.mockRejectedValue(new Error('all providers down'));
    findLatestRate.mockResolvedValue({
      id: '1',
      from_currency: 'USD',
      to_currency: 'ARS',
      rate: '1490',
      provider: 'frankfurter',
      fetched_at: new Date(Date.now() - 61 * 60 * 1000),
    });

    await expect(getExchangeRate('USD', 'ARS')).rejects.toThrow(ExchangeRateUnavailableError);
  });

  it('throws when the cascade fails and there is no DB record at all', async () => {
    fetchRateWithFallback.mockRejectedValue(new Error('all providers down'));

    await expect(getExchangeRate('USD', 'ARS')).rejects.toThrow(ExchangeRateUnavailableError);
  });

  it('still returns the live rate even if persisting it to the DB fails', async () => {
    fetchRateWithFallback.mockResolvedValue({ rate: 1500, provider: 'frankfurter' });
    upsertRate.mockRejectedValue(new Error('db down'));

    const result = await getExchangeRate('USD', 'ARS');

    expect(result.source).toBe('live');
    expect(result.rate).toBe(1500);
  });
});
