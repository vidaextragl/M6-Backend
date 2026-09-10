import { describe, expect, it } from 'vitest';

import { depositWithdrawSchema, transferSchema } from '../../../src/modules/wallets/wallets.validation';

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

  it('accepts an amount with exactly 16 integer digits (matches the decimal(18,2) column)', () => {
    const amount = '9'.repeat(16);
    expect(depositWithdrawSchema.safeParse({ currency: 'USD', amount }).success).toBe(true);
  });

  it('rejects an amount with more than 16 integer digits (would overflow the DB column)', () => {
    const amount = '9'.repeat(17);
    const result = depositWithdrawSchema.safeParse({ currency: 'USD', amount });
    expect(result.success).toBe(false);
  });
});

describe('transferSchema', () => {
  it('accepts a valid transfer payload', () => {
    const result = transferSchema.safeParse({
      recipientEmail: 'friend@example.com',
      currency: 'USD',
      amount: '10.00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed recipient email', () => {
    const result = transferSchema.safeParse({
      recipientEmail: 'not-an-email',
      currency: 'USD',
      amount: '10.00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    const result = transferSchema.safeParse({
      recipientEmail: 'friend@example.com',
      currency: 'XYZ',
      amount: '10.00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    const result = transferSchema.safeParse({
      recipientEmail: 'friend@example.com',
      currency: 'USD',
      amount: '0.00',
    });
    expect(result.success).toBe(false);
  });
});
