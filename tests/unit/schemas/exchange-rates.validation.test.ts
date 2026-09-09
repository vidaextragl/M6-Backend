import { describe, expect, it } from 'vitest';

import { getExchangeRateQuerySchema } from '../../../src/modules/exchange-rates/exchange-rates.validation';

describe('getExchangeRateQuerySchema', () => {
  it('accepts two different supported currencies', () => {
    expect(getExchangeRateQuerySchema.safeParse({ from: 'USD', to: 'ARS' }).success).toBe(true);
  });

  it('rejects the same currency on both sides', () => {
    expect(getExchangeRateQuerySchema.safeParse({ from: 'USD', to: 'USD' }).success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    expect(getExchangeRateQuerySchema.safeParse({ from: 'USD', to: 'XYZ' }).success).toBe(false);
  });

  it('rejects a missing parameter', () => {
    expect(getExchangeRateQuerySchema.safeParse({ from: 'USD' }).success).toBe(false);
  });
});
