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

export interface SwapLedgerResult {
  transaction: TransactionRecord;
  fromBalance: BalanceRecord;
  toBalance: BalanceRecord;
}

export interface TransferLedgerResult {
  senderTransaction: TransactionRecord;
  senderBalance: BalanceRecord;
  recipientTransaction: TransactionRecord;
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

export async function recordSwap(
  client: PoolClient,
  walletId: string,
  fromCurrency: string,
  toCurrency: string,
  amountSent: string,
  amountReceived: string,
  exchangeRate: number,
): Promise<SwapLedgerResult> {
  const fromBalance = await withdrawBalance(client, walletId, fromCurrency, amountSent);
  if (!fromBalance) {
    throw new InsufficientFundsError(`Insufficient ${fromCurrency} balance`);
  }

  const toBalance = await depositBalance(client, walletId, toCurrency, amountReceived);

  const transaction = await createTransaction(client, {
    walletId,
    transactionType: 'SWAP',
    fromCurrency,
    toCurrency,
    amountSent,
    amountReceived,
    exchangeRate,
    status: 'COMPLETED',
  });

  return { transaction, fromBalance, toBalance };
}

export async function recordBuy(
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
    transactionType: 'BUY',
    fromCurrency: currency,
    amountSent: amount,
    status: 'COMPLETED',
  });

  return { transaction, balance };
}

// Una transferencia toca dos wallets distintas (emisor y receptor) — a diferencia de deposit/
// withdrawal/swap/buy/cashback, que solo tocan una. Cada wallet tiene su propia fila en
// `transactions` (mismo criterio de partida doble que el resto del ledger: cada movimiento de
// balance es una fila), las dos con `transaction_type: 'TRANSFER'`, creadas en la misma
// transacción de Postgres para que sea atómico: o se debita al emisor y se acredita al receptor
// los dos, o no pasa ninguno de los dos.
export async function recordTransfer(
  client: PoolClient,
  senderWalletId: string,
  recipientWalletId: string,
  currency: string,
  amount: string,
): Promise<TransferLedgerResult> {
  const senderBalance = await withdrawBalance(client, senderWalletId, currency, amount);
  if (!senderBalance) {
    throw new InsufficientFundsError(`Insufficient ${currency} balance`);
  }

  await depositBalance(client, recipientWalletId, currency, amount);

  const senderTransaction = await createTransaction(client, {
    walletId: senderWalletId,
    transactionType: 'TRANSFER',
    fromCurrency: currency,
    amountSent: amount,
    status: 'COMPLETED',
  });

  const recipientTransaction = await createTransaction(client, {
    walletId: recipientWalletId,
    transactionType: 'TRANSFER',
    toCurrency: currency,
    amountReceived: amount,
    status: 'COMPLETED',
  });

  return { senderTransaction, senderBalance, recipientTransaction };
}

export async function recordCashback(
  client: PoolClient,
  walletId: string,
  currency: string,
  amount: string,
): Promise<LedgerResult> {
  const balance = await depositBalance(client, walletId, currency, amount);

  const transaction = await createTransaction(client, {
    walletId,
    transactionType: 'REWARD_CASHBACK',
    toCurrency: currency,
    amountReceived: amount,
    status: 'COMPLETED',
  });

  return { transaction, balance };
}
