import { toBalanceResponse } from '../balances/balances.service';
import { findBalancesByWallet } from '../balances/balances.repository';
import { withTransaction } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { recordDeposit, recordWithdrawal } from '../transactions/transactions.ledger';
import { toTransactionResponse } from '../transactions/transactions.service';
import { findWalletByUserId } from './wallets.repository';
import { computeWalletSummary } from './wallets.summary';

async function getWalletOrThrow(userId: string) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }
  return wallet;
}

export async function getWallet(userId: string) {
  const wallet = await getWalletOrThrow(userId);
  const balances = await findBalancesByWallet(wallet.id);

  return {
    id: wallet.id,
    balances: balances.map(toBalanceResponse),
  };
}

export async function deposit(userId: string, currency: string, amount: string) {
  const wallet = await getWalletOrThrow(userId);

  const { transaction, balance } = await withTransaction((client) =>
    recordDeposit(client, wallet.id, currency, amount),
  );

  return { transaction: toTransactionResponse(transaction), balance: toBalanceResponse(balance) };
}

export async function withdraw(userId: string, currency: string, amount: string) {
  const wallet = await getWalletOrThrow(userId);

  const { transaction, balance } = await withTransaction((client) =>
    recordWithdrawal(client, wallet.id, currency, amount),
  );

  return { transaction: toTransactionResponse(transaction), balance: toBalanceResponse(balance) };
}

export async function getWalletSummary(userId: string) {
  const wallet = await getWalletOrThrow(userId);
  const balances = await findBalancesByWallet(wallet.id);

  return computeWalletSummary(wallet.id, balances);
}
