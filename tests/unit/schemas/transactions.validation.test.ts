import { describe, expect, it } from 'vitest';

import { listTransactionsQuerySchema } from '../../../src/modules/transactions/transactions.validation';

describe('listTransactionsQuerySchema', () => {
  it('applies defaults when nothing is provided', () => {
    const result = listTransactionsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts a fully specified valid query', () => {
    const result = listTransactionsQuerySchema.safeParse({
      type: 'DEPOSIT',
      currency: 'USD',
      status: 'COMPLETED',
      from: '2026-01-01',
      to: '2026-01-31',
      limit: '10',
      offset: '5',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown transaction type', () => {
    expect(listTransactionsQuerySchema.safeParse({ type: 'NOT_A_TYPE' }).success).toBe(false);
  });

  it('rejects a calendar-invalid date (Feb 30th does not exist)', () => {
    expect(listTransactionsQuerySchema.safeParse({ from: '2026-02-30' }).success).toBe(false);
  });

  it('accepts a full ISO datetime', () => {
    expect(listTransactionsQuerySchema.safeParse({ from: '2026-01-01T10:00:00Z' }).success).toBe(true);
  });

  it('rejects when "from" is after "to"', () => {
    const result = listTransactionsQuerySchema.safeParse({ from: '2026-01-31', to: '2026-01-01' });

    expect(result.success).toBe(false);
  });

  it('rejects a limit above 100', () => {
    expect(listTransactionsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects a negative offset', () => {
    expect(listTransactionsQuerySchema.safeParse({ offset: '-1' }).success).toBe(false);
  });
});
