import { NotFoundError } from '../../shared/errors';
// Import directo (no al barrel '../wallets'): wallets/index re-exporta wallets.routes,
// que importa authMiddleware de auth — no hay riesgo de ciclo hoy, pero se mantiene la
// misma convención que en auth.service.ts para no repetirlo si wallets crece.
import { findWalletByUserId } from '../wallets/wallets.repository';
import { findTransactionsByWallet } from './transactions.repository';
import type { ListTransactionsFilters, TransactionRecord } from './transactions.types';

export function toTransactionResponse(transaction: TransactionRecord) {
  return {
    id: transaction.id,
    walletId: transaction.wallet_id,
    type: transaction.transaction_type,
    fromCurrency: transaction.from_currency,
    toCurrency: transaction.to_currency,
    amountSent: transaction.amount_sent,
    amountReceived: transaction.amount_received,
    exchangeRate: transaction.exchange_rate,
    status: transaction.status,
    failedReason: transaction.failed_reason,
    createdAt: transaction.created_at.toISOString(),
  };
}

export async function listTransactions(userId: string, filters: ListTransactionsFilters) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }

  const { transactions, total } = await findTransactionsByWallet(wallet.id, filters);

  return {
    transactions: transactions.map(toTransactionResponse),
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}
