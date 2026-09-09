import { describe, expect, it } from 'vitest';

import { calculateCashback, CASHBACK_RATE } from '../../../src/modules/rewards/cashback.calculator';

describe('calculateCashback', () => {
  it('returns 5% of the spent amount as cashback', () => {
    expect(CASHBACK_RATE).toBe(0.05);

    const result = calculateCashback('200.00');

    expect(result.cashbackAmount).toBe('10.00');
    expect(result.points).toBe(1000);
  });

  it('rounds the cashback amount to 2 decimal places', () => {
    const result = calculateCashback('33.33');

    expect(result.cashbackAmount).toBe('1.67');
  });

  it('floors the points instead of rounding them', () => {
    // 19.99 * 0.05 * 100 = 99.95 puntos -> floor a 99, no redondea a 100.
    const result = calculateCashback('19.99');

    expect(result.points).toBe(99);
  });

  it('returns zero cashback for a zero amount', () => {
    const result = calculateCashback('0.00');

    expect(result.cashbackAmount).toBe('0.00');
    expect(result.points).toBe(0);
  });
});
