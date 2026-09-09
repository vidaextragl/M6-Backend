import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCachedRate,
  setCachedRate,
} from '../../../src/modules/exchange-rates/exchange-rates.cache';

describe('exchange-rates cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null on a cache miss', () => {
    expect(getCachedRate('USD', 'XYZ')).toBeNull();
  });

  it('returns what was just cached', () => {
    setCachedRate('USD', 'ARS', 1500, 'frankfurter');

    const cached = getCachedRate('USD', 'ARS');

    expect(cached).not.toBeNull();
    expect(cached?.rate).toBe(1500);
    expect(cached?.provider).toBe('frankfurter');
  });

  it('evicts an entry older than the TTL', () => {
    setCachedRate('USD', 'EUR', 0.9, 'frankfurter');

    // TTL de test = 30 minutos (EXCHANGE_RATE_CACHE_TTL_MINUTES en .env.test); avanzar 31 vence.
    vi.setSystemTime(new Date('2026-01-01T00:31:00Z'));

    expect(getCachedRate('USD', 'EUR')).toBeNull();
  });

  it('still returns an entry just under the TTL', () => {
    setCachedRate('USD', 'BRL', 5.2, 'frankfurter');

    vi.setSystemTime(new Date('2026-01-01T00:29:00Z'));

    expect(getCachedRate('USD', 'BRL')?.rate).toBe(5.2);
  });
});
