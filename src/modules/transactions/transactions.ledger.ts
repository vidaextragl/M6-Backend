import type { PoolClient } from 'pg';

import { depositBalance, withdrawBalance } from '../balances/balances.repository';
import type { BalanceRecord } from '../balances/balances.types';
import { InsufficientFundsError } from '../../shared/errors';
import { createTransaction } from './transactions.repository';
import type { TransactionRecord } from './transactions.types';

export interface LedgerResult {
  transaction: TransactionRecord;
  balance: BalanceRecord;
}

export async function recordDeposit(
  client: PoolClient,
  walletId: string,
  currency: string,
  amount: string,
): Promise<LedgerResult> {
  const balance = await depositBalance(client, walletId, currency, amount);

  const transaction = await createTransaction(client, {
    walletId,
    transactionType: 'DEPOSIT',
    toCurrency: currency,
    amountReceived: amount,
    status: 'COMPLETED',
  });

  return { transaction, balance };
}

export async function recordWithdrawal(
  client: PoolClient,
  walletId: string,
  currency: string,
  amount: string,
): Promise<LedgerResult> {
  const balance = await withdrawBalance(client, walletId, currency, amount);
  if (!balance) {
    throw new InsufficientFundsError(`Insufficient ${currency} balance`);
  }

  const transaction = await createTransaction(client, {
    walletId,
    transactionType: 'WITHDRAWAL',
    fromCurrency: currency,
    amountSent: amount,
    status: 'COMPLETED',
  });

  return { transaction, balance };
}
