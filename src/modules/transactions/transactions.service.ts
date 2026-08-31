import type { TransactionRecord } from './transactions.types';

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
