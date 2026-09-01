export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'SWAP'
  | 'BUY'
  | 'REWARD_CASHBACK'
  | 'TRANSFER';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface TransactionRecord {
  id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  from_currency: string | null;
  to_currency: string | null;
  amount_sent: string | null;
  amount_received: string | null;
  exchange_rate: string | null;
  status: TransactionStatus;
  failed_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionInput {
  walletId: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  fromCurrency?: string;
  toCurrency?: string;
  amountSent?: string;
  amountReceived?: string;
  exchangeRate?: number;
}

export interface ListTransactionsFilters {
  type?: TransactionType;
  currency?: string;
  status?: TransactionStatus;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}
