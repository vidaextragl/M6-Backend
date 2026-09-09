import { describe, expect, it } from 'vitest';

import { buySchema, swapSchema } from '../../../src/modules/swaps/swaps.validation';

describe('swapSchema', () => {
  it('accepts a valid swap payload', () => {
    const result = swapSchema.safeParse({
      fromCurrency: 'USD',
      toCurrency: 'ARS',
      amountToReceive: '100.00',
    });

    expect(result.success).toBe(true);
  });

  it('rejects swapping a currency into itself', () => {
    const result = swapSchema.safeParse({
      fromCurrency: 'USD',
      toCurrency: 'USD',
      amountToReceive: '100.00',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    const result = swapSchema.safeParse({
      fromCurrency: 'USD',
      toCurrency: 'ARS',
      amountToReceive: '0.00',
    });

    expect(result.success).toBe(false);
  });
});

describe('buySchema', () => {
  it('accepts a valid buy payload', () => {
    expect(buySchema.safeParse({ currency: 'USD', amount: '100.00' }).success).toBe(true);
  });

  it('rejects an unsupported currency', () => {
    expect(buySchema.safeParse({ currency: 'XYZ', amount: '100.00' }).success).toBe(false);
  });

  it('rejects a malformed amount', () => {
    expect(buySchema.safeParse({ currency: 'USD', amount: 'not-a-number' }).success).toBe(false);
  });
});
