import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { pool, withTransaction } from '../../../src/database';
import { findBalancesByWallet } from '../../../src/modules/balances/balances.repository';
import { InsufficientFundsError } from '../../../src/shared/errors';
import {
  recordBuy,
  recordCashback,
  recordDeposit,
  recordSwap,
  recordWithdrawal,
} from '../../../src/modules/transactions/transactions.ledger';
import { findWalletByUserId } from '../../../src/modules/wallets/wallets.repository';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

async function createWalletForTest(): Promise<string> {
  const user = await registerTestUser();
  const wallet = await findWalletByUserId(user.userId);
  if (!wallet) {
    throw new Error('Wallet not found for freshly registered test user');
  }
  return wallet.id;
}

async function getBalance(walletId: string, currency: string): Promise<string> {
  const balances = await findBalancesByWallet(walletId);
  const balance = balances.find((b) => b.currency === currency);
  if (!balance) {
    throw new Error(`No balance row for ${currency}`);
  }
  return balance.amount;
}

describe('transactions ledger (double-entry bookkeeping)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('recordDeposit credits the balance and creates a completed DEPOSIT transaction', async () => {
    const walletId = await createWalletForTest();

    const { transaction, balance } = await withTransaction((client) =>
      recordDeposit(client, walletId, 'USD', '100.00'),
    );

    expect(transaction.transaction_type).toBe('DEPOSIT');
    expect(transaction.status).toBe('COMPLETED');
    expect(transaction.amount_received).toBe('100.00');
    expect(balance.amount).toBe('100.00');
  });

  it('recordWithdrawal debits the balance and creates a WITHDRAWAL transaction', async () => {
    const walletId = await createWalletForTest();
    await withTransaction((client) => recordDeposit(client, walletId, 'USD', '100.00'));

    const { transaction, balance } = await withTransaction((client) =>
      recordWithdrawal(client, walletId, 'USD', '40.00'),
    );

    expect(transaction.transaction_type).toBe('WITHDRAWAL');
    expect(transaction.amount_sent).toBe('40.00');
    expect(balance.amount).toBe('60.00');
  });

  it('recordWithdrawal throws InsufficientFundsError and leaves the balance untouched', async () => {
    const walletId = await createWalletForTest();

    await expect(
      withTransaction((client) => recordWithdrawal(client, walletId, 'USD', '10.00')),
    ).rejects.toThrow(InsufficientFundsError);

    expect(await getBalance(walletId, 'USD')).toBe('0.00');
  });

  it('recordSwap debits fromCurrency and credits toCurrency in the same operation', async () => {
    const walletId = await createWalletForTest();
    await withTransaction((client) => recordDeposit(client, walletId, 'USD', '100.00'));

    const { transaction, fromBalance, toBalance } = await withTransaction((client) =>
      recordSwap(client, walletId, 'USD', 'ARS', '10.00', '15000.00', 1500),
    );

    expect(transaction.transaction_type).toBe('SWAP');
    expect(fromBalance.amount).toBe('90.00');
    expect(toBalance.amount).toBe('15000.00');
  });

  it('recordSwap throws InsufficientFundsError when the source balance is too low', async () => {
    const walletId = await createWalletForTest();

    await expect(
      withTransaction((client) => recordSwap(client, walletId, 'USD', 'ARS', '10.00', '15000.00', 1500)),
    ).rejects.toThrow(InsufficientFundsError);
  });

  it('recordBuy debits the balance and creates a BUY transaction', async () => {
    const walletId = await createWalletForTest();
    await withTransaction((client) => recordDeposit(client, walletId, 'USD', '100.00'));

    const { transaction, balance } = await withTransaction((client) =>
      recordBuy(client, walletId, 'USD', '30.00'),
    );

    expect(transaction.transaction_type).toBe('BUY');
    expect(balance.amount).toBe('70.00');
  });

  it('recordCashback credits the balance and creates a REWARD_CASHBACK transaction', async () => {
    const walletId = await createWalletForTest();

    const { transaction, balance } = await withTransaction((client) =>
      recordCashback(client, walletId, 'USD', '5.00'),
    );

    expect(transaction.transaction_type).toBe('REWARD_CASHBACK');
    expect(balance.amount).toBe('5.00');
  });
});
