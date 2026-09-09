import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUserById, sendEmail } = vi.hoisted(() => ({
  findUserById: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../../../src/modules/users/users.repository', () => ({ findUserById }));
vi.mock('../../../src/modules/notifications/email/email.service', () => ({ sendEmail }));

import {
  sendRedemptionReceiptEmail,
  sendTransactionReceiptEmail,
} from '../../../src/modules/notifications/email/receipts.service';
import type { TransactionRecord } from '../../../src/modules/transactions/transactions.types';
import type { RewardCatalogItemRecord, RewardRecord } from '../../../src/modules/rewards/rewards.types';

const baseTransaction: TransactionRecord = {
  id: 'tx-1',
  wallet_id: 'wallet-1',
  transaction_type: 'DEPOSIT',
  from_currency: null,
  to_currency: 'USD',
  amount_sent: null,
  amount_received: '100.00',
  exchange_rate: null,
  status: 'COMPLETED',
  failed_reason: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

describe('sendTransactionReceiptEmail', () => {
  beforeEach(() => {
    findUserById.mockReset();
    sendEmail.mockReset();
  });

  it('sends the email to the user tied to the transaction', async () => {
    findUserById.mockResolvedValue({ id: 'user-1', email: 'ciro@example.com' });
    sendEmail.mockResolvedValue(undefined);

    await sendTransactionReceiptEmail('user-1', baseTransaction);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ciro@example.com', subject: expect.any(String) }),
    );
  });

  it('does nothing if the user no longer exists', async () => {
    findUserById.mockResolvedValue(null);

    await sendTransactionReceiptEmail('user-1', baseTransaction);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws even if sending the email fails (the money operation must not be affected)', async () => {
    findUserById.mockResolvedValue({ id: 'user-1', email: 'ciro@example.com' });
    sendEmail.mockRejectedValue(new Error('SES is down'));

    await expect(sendTransactionReceiptEmail('user-1', baseTransaction)).resolves.toBeUndefined();
  });
});

describe('sendRedemptionReceiptEmail', () => {
  const reward: RewardRecord = {
    id: 'reward-1',
    user_id: 'user-1',
    transaction_id: null,
    catalog_item_id: 'item-1',
    points: -200,
    source: 'REDEMPTION',
    description: 'Redeemed: Cupón 10% OFF',
    created_at: new Date('2026-01-01T00:00:00Z'),
  };

  const catalogItem: RewardCatalogItemRecord = {
    id: 'item-1',
    name: 'Cupón 10% OFF',
    description: null,
    cost_points: 200,
    created_at: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    findUserById.mockReset();
    sendEmail.mockReset();
  });

  it('sends the redemption email to the user', async () => {
    findUserById.mockResolvedValue({ id: 'user-1', email: 'ciro@example.com' });
    sendEmail.mockResolvedValue(undefined);

    await sendRedemptionReceiptEmail('user-1', reward, catalogItem);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ciro@example.com' }),
    );
  });

  it('never throws even if sending the email fails', async () => {
    findUserById.mockResolvedValue({ id: 'user-1', email: 'ciro@example.com' });
    sendEmail.mockRejectedValue(new Error('SES is down'));

    await expect(
      sendRedemptionReceiptEmail('user-1', reward, catalogItem),
    ).resolves.toBeUndefined();
  });
});
