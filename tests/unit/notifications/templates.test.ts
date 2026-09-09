import { describe, expect, it } from 'vitest';

import { buildTransactionReceiptEmail } from '../../../src/modules/notifications/email/templates/receipt.template';
import { buildRedemptionReceiptEmail } from '../../../src/modules/notifications/email/templates/redemption.template';
import type { TransactionRecord, TransactionType } from '../../../src/modules/transactions/transactions.types';
import type { RewardCatalogItemRecord, RewardRecord } from '../../../src/modules/rewards/rewards.types';

function makeTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-123',
    wallet_id: 'wallet-1',
    transaction_type: 'DEPOSIT',
    from_currency: null,
    to_currency: 'USD',
    amount_sent: null,
    amount_received: '100.00',
    exchange_rate: null,
    status: 'COMPLETED',
    failed_reason: null,
    created_at: new Date('2026-01-01T12:00:00Z'),
    updated_at: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('buildTransactionReceiptEmail', () => {
  const cases: Array<[TransactionType, Partial<TransactionRecord>]> = [
    ['DEPOSIT', { to_currency: 'USD', amount_received: '100.00' }],
    ['WITHDRAWAL', { from_currency: 'USD', amount_sent: '50.00', to_currency: null, amount_received: null }],
    [
      'SWAP',
      {
        from_currency: 'USD',
        to_currency: 'ARS',
        amount_sent: '10.00',
        amount_received: '15000.00',
        exchange_rate: '1500.000000',
      },
    ],
    ['BUY', { from_currency: 'USD', amount_sent: '200.00', to_currency: null, amount_received: null }],
    ['REWARD_CASHBACK', { to_currency: 'USD', amount_received: '10.00' }],
  ];

  it.each(cases)('builds a non-empty subject and html for %s without throwing', (type, overrides) => {
    const transaction = makeTransaction({ transaction_type: type, ...overrides });

    const email = buildTransactionReceiptEmail(transaction);

    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.html).toContain(transaction.id);
    expect(email.html).toContain(transaction.status);
  });

  it('includes both amounts and the exchange rate for a SWAP', () => {
    const transaction = makeTransaction({
      transaction_type: 'SWAP',
      from_currency: 'USD',
      to_currency: 'ARS',
      amount_sent: '10.00',
      amount_received: '15000.00',
      exchange_rate: '1500.000000',
    });

    const email = buildTransactionReceiptEmail(transaction);

    expect(email.html).toContain('10.00 USD');
    expect(email.html).toContain('15000.00 ARS');
    expect(email.html).toContain('1500.000000');
  });

  it('omits the exchange rate row for a plain DEPOSIT', () => {
    const transaction = makeTransaction({ transaction_type: 'DEPOSIT' });

    const email = buildTransactionReceiptEmail(transaction);

    expect(email.html).not.toContain('Tasa de cambio');
  });
});

describe('buildRedemptionReceiptEmail', () => {
  it('builds a non-empty subject and html including the reward name and points', () => {
    const reward: RewardRecord = {
      id: 'reward-1',
      user_id: 'user-1',
      transaction_id: null,
      catalog_item_id: 'item-1',
      points: -200,
      source: 'REDEMPTION',
      description: 'Redeemed: Cupón 10% OFF',
      created_at: new Date('2026-01-01T12:00:00Z'),
    };
    const catalogItem: RewardCatalogItemRecord = {
      id: 'item-1',
      name: 'Cupón 10% OFF',
      description: null,
      cost_points: 200,
      created_at: new Date('2026-01-01T12:00:00Z'),
    };

    const email = buildRedemptionReceiptEmail(reward, catalogItem);

    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.html).toContain('Cupón 10% OFF');
    expect(email.html).toContain('200');
    expect(email.html).toContain(reward.id);
  });
});
