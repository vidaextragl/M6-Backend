import type { TransactionRecord, TransactionType } from '../../../transactions/transactions.types';
import { wrapEmailLayout } from './layout.template';

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Retiro',
  SWAP: 'Cambio de divisas',
  BUY: 'Compra',
  REWARD_CASHBACK: 'Cashback acreditado',
  TRANSFER: 'Transferencia',
};

function formatAmount(amount: string | null, currency: string | null): string | null {
  if (amount === null || currency === null) {
    return null;
  }
  return `${Number(amount).toFixed(2)} ${currency}`;
}

export function buildTransactionReceiptEmail(transaction: TransactionRecord): {
  subject: string;
  html: string;
} {
  const label = TRANSACTION_LABELS[transaction.transaction_type];
  const sent = formatAmount(transaction.amount_sent, transaction.from_currency);
  const received = formatAmount(transaction.amount_received, transaction.to_currency);

  const rows: Array<[string, string]> = [
    ['Fecha', transaction.created_at.toLocaleString('es-AR')],
  ];

  if (sent) {
    rows.push(['Monto enviado', sent]);
  }
  if (received) {
    rows.push(['Monto recibido', received]);
  }
  if (transaction.exchange_rate) {
    rows.push(['Tasa de cambio', Number(transaction.exchange_rate).toFixed(6)]);
  }
  rows.push(['Estado', transaction.status]);
  rows.push(['ID de transacción', transaction.id]);

  return {
    subject: `Comprobante de ${label.toLowerCase()} - Vida Extra`,
    html: wrapEmailLayout(`Comprobante de ${label.toLowerCase()}`, rows),
  };
}
