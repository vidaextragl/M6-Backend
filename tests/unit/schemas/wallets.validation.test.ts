import { describe, expect, it } from 'vitest';

import { depositWithdrawSchema } from '../../../src/modules/wallets/wallets.validation';

describe('depositWithdrawSchema', () => {
  it('accepts a valid amount', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount: '10.50' }).success).toBe(true);
  });

  it('accepts an integer amount', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount: '10' }).success).toBe(true);
  });

  it('rejects more than 2 decimal places', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount: '10.123' }).success).toBe(false);
  });

  it('rejects a zero amount', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount: '0.00' }).success).toBe(false);
  });

  it('rejects a negative amount', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount: '-5.00' }).success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    expect(depositWithdrawSchema.safeParse({ currency: 'XYZ', amount: '10.00' }).success).toBe(false);
  });
});
